import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { validBundle } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { fingerprint } from "../../../../tools/simurgh-attestation/stage5g/core/signatures.mjs";
import {
  runCeremony,
  verifyReceipt,
} from "../../../../tools/simurgh-attestation/stage5g/laneb/ceremony.mjs";

const KEYS = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../fixtures/llmShield/stage5g/test-keys"
);
const ceremonyPriv = readFileSync(
  join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vfc-ceremony.pem"),
  "utf8"
);
const ceremonyPubPem = createPublicKey(createPrivateKey(ceremonyPriv))
  .export({ type: "spki", format: "pem" })
  .toString();
const pinFingerprint = fingerprint(ceremonyPubPem);
const opts = { ceremonyPriv, ceremonyPubPem, pinFingerprint, ctx: ctxFor() };

test("ceremony corroborates a valid bundle and the receipt verifies under the external pin", () => {
  const r = runCeremony(validBundle({ rung: "challenge_bound" }), opts);
  assert.equal(r.corroborated, true);
  assert.equal(r.receiptValid, true);
});

test("a mutated capture breaks corroboration (sidecar detects tamper)", () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.capture.cells[0].label = "malicious";
  assert.equal(runCeremony(b, opts).corroborated, false);
});

test("receipt signed by a non-pinned ceremony key is rejected", () => {
  const r = runCeremony(validBundle({ rung: "challenge_bound" }), opts);
  assert.equal(verifyReceipt(r.receipt, "sha256:" + "9".repeat(64)), 1);
});
