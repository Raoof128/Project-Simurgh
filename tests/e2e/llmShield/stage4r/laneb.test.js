// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
// Lane B: two REAL OS processes per operator, distinct approver key, no scalar
// leak. Verifies the committed capture (verify-only, per §10.2).
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateCeremony } from "../../../../tools/simurgh-attestation/stage4r/core/pcccCore.mjs";
import { reconstructInput } from "../../../../tools/simurgh-attestation/stage4r/core/ceremonyBuilder.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");
const CAP = JSON.parse(
  readFileSync(
    join(ROOT, "docs/research/llm-shield/evidence/stage-4r/lane-b/ceremony-capture.json"),
    "utf8"
  )
);
const pubKeys = {
  a: crypto.createPublicKey(
    crypto.createPrivateKey(readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-alpha.pem")))
  ),
  b: crypto.createPublicKey(
    crypto.createPrivateKey(readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-beta.pem")))
  ),
};

function armVerdict(arm) {
  return evaluateCeremony(
    reconstructInput({
      transcript: arm.transcript,
      sealedPacket: arm.sealedPacket,
      operatorPublicKeys: pubKeys,
    })
  );
}

test("honest match and non-match arms evaluate GREEN under the real two-process capture", () => {
  const m = CAP.arms.find((a) => a.name === "honest_match");
  const n = CAP.arms.find((a) => a.name === "honest_non_match");
  assert.deepEqual(armVerdict(m), { raw: 0, green: true });
  assert.equal(m.transcript.match, true);
  assert.deepEqual(armVerdict(n), { raw: 0, green: true });
  assert.equal(n.transcript.match, false);
});

test("mandatory raw-98 arm: export refused, nothing published", () => {
  const r = CAP.arms.find((a) => a.name === "refused_export");
  assert.equal(r.exported, false);
  assert.equal(r.vfr, null);
  assert.equal(r.terminal, "ledgered_export_refusal");
  assert.ok(!("publicRecord" in r), "refused arm must not carry a public record");
});

test("four-key separation: approver ≠ operator-a ≠ operator-b ≠ attestation (§4.2)", () => {
  const s = CAP.vfr_crossing.key_separation;
  const digs = [s.approver, s.operator_a, s.operator_b, s.attestation];
  assert.equal(new Set(digs).size, 4, "all four key digests must be distinct");
});

test("no fixture scalar appears anywhere in the committed capture", () => {
  const json = JSON.stringify(CAP);
  for (const name of ["operator-alpha", "operator-beta"]) {
    const scalar = readFileSync(
      join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}-scalar.hex`),
      "utf8"
    ).trim();
    assert.ok(!json.includes(scalar), `scalar for ${name} leaked into the capture`);
  }
});

test("process metadata is privacy-clean (digests/roles only)", () => {
  const json = JSON.stringify(CAP.process_metadata);
  for (const forbidden of ["pid", "argv", "hostname", "/Users/", "env"]) {
    assert.ok(!json.includes(forbidden), `metadata leaks ${forbidden}`);
  }
  for (const role of ["a", "b"]) {
    assert.match(CAP.process_metadata[role].process_instance_digest, /^sha256:/);
  }
});

test("cardinality: slot ledger length equals the committed cardinality", () => {
  assert.equal(CAP.slot_ledger.length, CAP.slot_cardinality_commitment);
  assert.deepEqual(CAP.window_match_census, {
    epoch: CAP.epoch,
    matches: 1,
    non_matches: 1,
    refusals: 1,
  });
});
