// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PCCC_NON_CLAIMS,
  PCCC_KNOWN_LIMITATIONS,
  PCCC_RAILS,
} from "../../../../tools/simurgh-attestation/stage4r/constants.mjs";
import {
  validateInvitation,
  operatorMaskContribution,
} from "../../../../tools/simurgh-attestation/stage4r/byo/operator-kit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4r");
const VERIFIER = join(
  ROOT,
  "tools/simurgh-attestation/stage4r/node/verify-stage4r-attestation.mjs"
);

function runVerifier(dir, tier) {
  return spawnSync("node", [VERIFIER, "--offline", dir, "--tier", tier], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

test("committed attestation carries the frozen non-claims, limitations, rails, census", () => {
  const att = JSON.parse(readFileSync(join(EVID, "pccc-attestation.json"), "utf8"));
  assert.deepEqual(att.body.non_claims, [...PCCC_NON_CLAIMS]);
  assert.deepEqual(att.body.known_limitations, [...PCCC_KNOWN_LIMITATIONS]);
  assert.deepEqual(att.body.rails, [...PCCC_RAILS]);
  assert.equal(att.body.lane_a_verification_kind, "deterministic_replay_with_fixture_scalars");
  assert.equal(att.body.lane_b_verification_kind, "two_party_ceremony_dleq_audit_verified");
  assert.equal(att.body.verification_packet_kind, "sealed_transcript_packet_for_offline_verifier");
  assert.equal(typeof att.body.window_match_census.matches, "number");
});

test("verifier exits 0 on committed evidence at both tiers", () => {
  const rel = "docs/research/llm-shield/evidence/stage-4r";
  assert.equal(runVerifier(rel, "public").status, 0);
  assert.equal(runVerifier(rel, "both").status, 0);
});

test("audit tier rejects a z-tampered sealed packet", () => {
  const tmp = mkdtempSync(join(tmpdir(), "pccc-att-"));
  cpSync(EVID, join(tmp, "e"), { recursive: true });
  const corpusPath = join(tmp, "e/lane-a/corpus.json");
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
  const green = corpus.cases.find((c) => c.name === "green_match");
  green.transcript.z.a = "0".repeat(64); // corrupt sealed z
  writeFileSync(corpusPath, JSON.stringify(corpus));
  const res = runVerifier(join(tmp, "e"), "audit");
  assert.notEqual(res.status, 0);
});

test("public tier rejects a planted class digest in a public record", () => {
  const tmp = mkdtempSync(join(tmpdir(), "pccc-att-"));
  cpSync(EVID, join(tmp, "e"), { recursive: true });
  const corpusPath = join(tmp, "e/lane-a/corpus.json");
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
  const green = corpus.cases.find((c) => c.name === "green_match");
  green.publicRecord.respondent_notice_hash = green.sealedPacket.class_digests.a; // leak
  writeFileSync(corpusPath, JSON.stringify(corpus));
  const res = runVerifier(join(tmp, "e"), "public");
  assert.equal(res.status, 99);
});

test("BYO kit validates the committed invitation and refuses version skew", () => {
  const inv = JSON.parse(readFileSync(join(EVID, "byo/sample-invitation.json"), "utf8"));
  const expected = { verifierDigest: inv.verifier_digest, schemaVersions: inv.schema_versions };
  assert.ok(validateInvitation(inv, expected).ok);
  const skewed = { ...expected, schemaVersions: ["simurgh.pccc_match_record.v1"] };
  assert.equal(validateInvitation(inv, skewed).ok, false);
});

test("BYO kit produces a valid mask contribution without leaking the scalar", () => {
  const out = operatorMaskContribution({
    scalar: 12345678901234567890n,
    epoch: "sha256:" + "a".repeat(64),
    custodyClassDigest: "sha256:" + "b".repeat(64),
    runId: "byo-run",
    pairId: "sha256:" + "c".repeat(64),
    role: "b",
  });
  assert.match(out.mask_point, /^[0-9a-f]{64}$/);
  assert.match(out.epk, /^[0-9a-f]{64}$/);
  assert.equal(out.dleq_mask.relation_kind, "mask");
  assert.ok(!JSON.stringify(out).includes("12345678901234567890"));
});
