// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
// Stage 4R K7 all-functions net (spec §15): frozen export inventory, composed
// replay with check-order masking, byte-idempotency, cross-stage invariants, and
// attestation verification at both tiers.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DIGEST_RE } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import * as constants from "../../../../tools/simurgh-attestation/stage4r/constants.mjs";
import * as edwards from "../../../../tools/simurgh-attestation/stage4r/core/edwards25519.mjs";
import * as maskCore from "../../../../tools/simurgh-attestation/stage4r/core/maskCore.mjs";
import * as dleq from "../../../../tools/simurgh-attestation/stage4r/core/dleq.mjs";
import * as schemaCore from "../../../../tools/simurgh-attestation/stage4r/core/schemaCore.mjs";
import * as pcccCore from "../../../../tools/simurgh-attestation/stage4r/core/pcccCore.mjs";
import * as censusCore from "../../../../tools/simurgh-attestation/stage4r/core/censusCore.mjs";
import * as ceremonyBuilder from "../../../../tools/simurgh-attestation/stage4r/core/ceremonyBuilder.mjs";
import { evaluateCeremony } from "../../../../tools/simurgh-attestation/stage4r/core/pcccCore.mjs";
import { reconstructInput } from "../../../../tools/simurgh-attestation/stage4r/core/ceremonyBuilder.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4r");
const S4R = join(ROOT, "tools/simurgh-attestation/stage4r");

const keys = (n) => n.map((x) => x).sort();

test("K7.1 frozen export inventory per module", () => {
  assert.deepEqual(
    Object.keys(constants).sort(),
    keys([
      "SCHEMAS",
      "CRYPTO_DOMAINS",
      "DOMAINS",
      "PCCC_NON_CLAIMS",
      "PCCC_KNOWN_LIMITATIONS",
      "PCCC_RAILS",
      "VERIFICATION_KINDS",
      "SLOT_TERMINAL_KINDS",
      "DLEQ_RELATION_KINDS",
      "DISCLOSURE_BUDGET_MAX_SIGNALS_PER_WINDOW",
      "ROLES",
      "POINT_HEX_RE",
      "SCALAR_HEX_RE",
    ])
  );
  assert.deepEqual(
    Object.keys(edwards).sort(),
    keys([
      "P",
      "L",
      "G",
      "ID",
      "add",
      "mul",
      "affine",
      "eq",
      "onCurve",
      "isSmallOrder",
      "encodePoint",
      "decodePoint",
      "randomScalar",
      "scalarToHex",
      "scalarFromHex",
      "hashToPoint",
    ])
  );
  assert.deepEqual(
    Object.keys(maskCore).sort(),
    keys([
      "SMALL_ORDER",
      "SmallOrderError",
      "classPoint",
      "maskPoint",
      "matchToken",
      "pairId",
      "pairIdHash",
      "pairMatchCommitment",
      "ephemeralPublicDigest",
    ])
  );
  assert.deepEqual(Object.keys(dleq).sort(), keys(["dleqProve", "dleqVerify"]));
  assert.deepEqual(
    Object.keys(schemaCore).sort(),
    keys([
      "validateMaskMessage",
      "DLEQ_PROOF_KEYS",
      "validateDleqProof",
      "validateTranscript",
      "MATCH_RECORD_KEYS",
      "validateMatchRecord",
      "validateCeremonyCapture",
      "validateInvitation",
      "validateAttestation",
      "assertNoSealedMaterial",
    ])
  );
  assert.deepEqual(
    Object.keys(pcccCore).sort(),
    keys(["GREEN", "tokenCommitment", "maskDigest", "evaluateCeremony"])
  );
  assert.deepEqual(
    Object.keys(censusCore).sort(),
    keys([
      "buildWindowMatchCensus",
      "checkCensus",
      "checkSlotTerminality",
      "checkCardinalityAndCensus",
      "budgetCheck",
      "herdTokenScan",
      "buildLedgers",
      "detectReplay",
      "detectReuse",
    ])
  );
  assert.deepEqual(
    Object.keys(ceremonyBuilder).sort(),
    keys(["buildCeremony", "reconstructInput", "signingDigest"])
  );
});

test("K7.2 composed replay: every Lane A case reproduces its verdict (check-order masking)", () => {
  const corpus = JSON.parse(readFileSync(join(EVID, "lane-a/corpus.json"), "utf8"));
  const pubKeys = {
    a: crypto.createPublicKey(
      crypto.createPrivateKey(
        readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-alpha.pem"))
      )
    ),
    b: crypto.createPublicKey(
      crypto.createPrivateKey(readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-beta.pem")))
    ),
  };
  for (const c of corpus.cases) {
    const got = evaluateCeremony(
      reconstructInput(
        { transcript: c.transcript, sealedPacket: c.sealedPacket, operatorPublicKeys: pubKeys },
        c.overrides
      )
    );
    const want = c.expect.green
      ? { raw: 0, green: true }
      : { raw: c.expect.raw, reason: c.expect.reason, green: false };
    assert.deepEqual(got, want, c.name);
  }
});

test("K7.3 byte-idempotency: rebuilding corpus + attestation is a no-op", () => {
  for (const script of ["node/build-stage4r-fixtures.mjs", "node/build-stage4r-attestation.mjs"]) {
    assert.equal(spawnSync("node", [join(S4R, script)], { cwd: ROOT }).status, 0);
  }
  const diff = spawnSync(
    "git",
    [
      "diff",
      "--exit-code",
      "--",
      "docs/research/llm-shield/evidence/stage-4r/lane-a/corpus.json",
      "docs/research/llm-shield/evidence/stage-4r/pccc-attestation.json",
    ],
    { cwd: ROOT }
  );
  assert.equal(diff.status, 0, "evidence drifted on rebuild");
});

test("K7.4 cross-stage invariants: epoch + classes are well-formed digests; probes pass", () => {
  const corpus = JSON.parse(readFileSync(join(EVID, "lane-a/corpus.json"), "utf8"));
  assert.match(corpus.epoch, DIGEST_RE); // epoch is a 4N-anchor-shaped digest (§14 delta noted)
  for (const c of corpus.cases) {
    assert.match(c.sealedPacket.class_digests.a, DIGEST_RE);
    assert.match(c.sealedPacket.class_digests.b, DIGEST_RE);
  }
  for (const probe of ["probes/ddh-probe.mjs", "probes/dleq-probe.mjs"]) {
    assert.equal(spawnSync("node", [join(S4R, probe)], { cwd: ROOT }).status, 0, probe);
  }
});

test("K7.5 attestation verifies at both tiers", () => {
  const v = spawnSync(
    "node",
    [
      join(S4R, "node/verify-stage4r-attestation.mjs"),
      "--offline",
      "docs/research/llm-shield/evidence/stage-4r",
      "--tier",
      "both",
    ],
    { cwd: ROOT }
  );
  assert.equal(v.status, 0);
});
