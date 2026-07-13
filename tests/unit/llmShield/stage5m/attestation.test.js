// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — two-tier Ed25519 attestation (distinct public/audit domains) + in-toto candidate predicate.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicAttestationPayload,
  buildAuditAttestationPayload,
  signAttestation,
  verifyAttestation,
} from "../../../../tools/simurgh-attestation/stage5m/node/attestation.mjs";
import { emitContainmentQuorumPredicate } from "../../../../tools/simurgh-attestation/stage5m/node/intoto.mjs";
import { vtcQuorumLaneKeys } from "../../../../tools/simurgh-attestation/stage5m/node/laneKeys.mjs";
import { artifactDigest } from "../../../../tools/simurgh-attestation/stage5l/core/digests.mjs";

const keys = vtcQuorumLaneKeys();
const bundle = {
  schema_version: "simurgh.vtcq.bundle.v1",
  envelope_schema: "vtc_quorum_confirmed.v2",
  quorum_profile: "third_trust_ecology",
  quorum_rule: "all_required",
  commitment_session_id: "sha256:0fdfc6cd",
  transparency_log_seat: { uuid: "u", logIndex: 7, inclusionProof: { logIndex: 3, treeSize: 9 } },
};
const verdict = {
  raw: 0,
  computed_ecology_state: "confirmed",
  outcome_class: "ecology_confirmed",
  ecology_independence_number: 3,
  externally_anchored: true,
};

test("public attestation: sign → verify; tamper a bound field → verify fails", () => {
  const att = signAttestation(keys.gate.privatePem, "public", bundle, verdict, {});
  assert.equal(verifyAttestation(keys.gate.id, att), true);
  att.payload.ecology_independence_number = 2;
  assert.equal(verifyAttestation(keys.gate.id, att), false);
});

test("audit attestation binds injected facts + public_attestation_digest", () => {
  const facts = { seat_present: true, inclusion_ok: true };
  const att = signAttestation(keys.gate.privatePem, "audit", bundle, verdict, facts);
  assert.equal(verifyAttestation(keys.gate.id, att), true);
  const pub = buildPublicAttestationPayload(bundle, verdict);
  assert.equal(att.payload.public_attestation_digest, artifactDigest(pub));
  assert.deepEqual(att.payload.injected_facts, facts);
});

test("domain separation: a public attestation does not verify as audit", () => {
  const att = signAttestation(keys.gate.privatePem, "public", bundle, verdict, {});
  const forged = { ...att, tier: "audit" };
  assert.equal(verifyAttestation(keys.gate.id, forged), false);
});

test("public payload binds the ecology fields + N (plain number)", () => {
  const p = buildPublicAttestationPayload(bundle, verdict);
  assert.equal(p.outcome_class, "ecology_confirmed");
  assert.equal(p.ecology_independence_number, 3);
  assert.equal(typeof p.ecology_independence_number, "number");
  assert.equal(p.externally_anchored, true);
});

test("in-toto candidate predicate: type/subject/predicateType + non-conformance non-claim", () => {
  const stmt = emitContainmentQuorumPredicate(bundle, verdict);
  assert.equal(stmt._type, "https://in-toto.io/Statement/v1");
  assert.equal(stmt.subject[0].digest.sha256, "0fdfc6cd");
  assert.equal(stmt.predicateType, "https://simurgh.dev/attestation/containment-quorum/v0");
  assert.match(stmt.predicate.non_conformance, /unregistered candidate/i);
});
