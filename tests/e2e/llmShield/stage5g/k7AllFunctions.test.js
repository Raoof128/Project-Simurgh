// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G VFC — K7 all-functions E2E net. Exercises the whole verifier surface + all lanes, and asserts
// the tamper families are cleanly separated: integrity/overclaim (283–297), policy (298), env (299).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  validBundle,
  validCensus,
  honorSystemSelfGraded,
  notifiedBodyUnanchored,
} from "../../../unit/llmShield/stage5g/_validBundle.mjs";
import { ctxFor } from "../../../unit/llmShield/stage5g/_ctx.mjs";
import { VFC_RAW_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { evaluateForeignCapture } from "../../../../tools/simurgh-attestation/stage5g/core/vfcCore.mjs";
import { sigstoreKernelRunner } from "../../../../tools/simurgh-attestation/stage5g/node/sigstoreKernelRunner.mjs";
import { buildEvidence } from "../../../../tools/simurgh-attestation/stage5g/node/build-vfc-evidence.mjs";
import { verifyEvidence } from "../../../../tools/simurgh-attestation/stage5g/node/verify-vfc-attestation.mjs";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage5g/laneb/ceremony.mjs";
import { verifyPortable } from "../../../../tools/simurgh-attestation/stage5g/browser/vfc-portable.mjs";
import { fixtureArtifacts } from "../../../unit/llmShield/stage5g/_validBundle.mjs";
import { readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { fileURLToPath } from "node:url";
import { fingerprint } from "../../../../tools/simurgh-attestation/stage5g/core/signatures.mjs";

const KEYS = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../fixtures/llmShield/stage5g/test-keys"
);

test("raw-code ledger defines all 17 VFC codes 283–299", () => {
  assert.deepEqual(
    Object.values(VFC_RAW_CODES).filter((v) => v !== 0),
    Array.from({ length: 17 }, (_, i) => 283 + i)
  );
});

test("valid rung-1 (public) and rung-2 (audit) both verify raw 0", () => {
  assert.equal(evaluateForeignCapture(validBundle({ rung: "challenge_bound" }), ctxFor()).raw, 0);
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = ctxFor({ tier: "audit", auditCensus: validCensus({ rung: "externally_anchored" }) });
  ctx.kernelResult = sigstoreKernelRunner(b.anchor_evidence);
  assert.equal(evaluateForeignCapture(b, ctx).raw, 0);
});

test("tamper families are separated: integrity/overclaim (≤297) vs policy 298 vs env 299", () => {
  // integrity + overclaim
  const unknownKey = () => {
    const b = validBundle();
    b.surprise = 1;
    return evaluateForeignCapture(b, ctxFor()).raw;
  };
  assert.equal(unknownKey(), 283);
  assert.equal(evaluateForeignCapture(validBundle(), ctxFor({ verifierPin: null })).raw, 284);
  assert.equal(evaluateForeignCapture(honorSystemSelfGraded(), ctxFor()).raw, 289);
  assert.equal(evaluateForeignCapture(notifiedBodyUnanchored(), ctxFor()).raw, 296);
  // policy (a truthful lower rung, integrity intact)
  const pol = evaluateForeignCapture(
    validBundle({ rung: "challenge_bound" }),
    ctxFor({ minRung: "externally_anchored" })
  );
  assert.equal(pol.raw, 298);
  assert.equal(pol.attestation_valid, true); // NOT tampered
  // env (anchor present, kernel not run) — never misreported as tampering
  assert.equal(
    evaluateForeignCapture(validBundle({ rung: "externally_anchored" }), ctxFor()).raw,
    299
  );
});

test("all lanes green over a freshly built evidence pack", async () => {
  const d = mkdtempSync(join(tmpdir(), "vfc-k7-"));
  buildEvidence({ evidenceDir: d, stageDir: d });
  const pins = { dir: d, verifierPin: join(d, "pin.json"), trustRoot: join(d, "trust-root.json") };
  assert.equal(verifyEvidence({ ...pins, tier: "public" }).raw, 0);
  assert.equal(verifyEvidence({ ...pins, tier: "audit" }).raw, 0);

  const ceremonyPriv = readFileSync(
    join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vfc-ceremony.pem"),
    "utf8"
  );
  const ceremonyPubPem = createPublicKey(createPrivateKey(ceremonyPriv))
    .export({ type: "spki", format: "pem" })
    .toString();
  const laneb = runCeremony(validBundle({ rung: "challenge_bound" }), {
    ceremonyPriv,
    ceremonyPubPem,
    pinFingerprint: fingerprint(ceremonyPubPem),
    ctx: ctxFor(),
  });
  assert.equal(laneb.corroborated && laneb.receiptValid, true);

  const portable = await verifyPortable(
    validBundle({ rung: "challenge_bound" }),
    fixtureArtifacts()
  );
  assert.equal(portable.portable_valid, true);
  assert.equal(portable.raw, null);
});
