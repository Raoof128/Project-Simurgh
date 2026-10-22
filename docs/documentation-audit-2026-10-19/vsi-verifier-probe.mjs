// Offline documentation probes; no external signing, capture changes, or model inference.
import assert from "node:assert/strict";
import { generateKeyPairSync, createHash } from "node:crypto";
import {
  cleanAncestor,
  PINNED,
  REGISTRY_PROFILE,
  ROLE_PROFILE,
} from "../../tools/simurgh-attestation/stage5p/node/laneAFixtures.mjs";
import { evaluateSection2Safe } from "../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";
import { evidenceReplayIdentity } from "../../tools/simurgh-attestation/stage5p/core/resolverEvidence.mjs";
import {
  verifyAttestation,
  signPayload,
  SIG5P,
} from "../../tools/simurgh-attestation/stage5p/node/attestation.mjs";
import { canonicalJson } from "../../tools/simurgh-attestation/canonicalise.mjs";
import { validateDischargeLedger } from "../../tools/simurgh-attestation/stage5p/core/dischargeGate.mjs";

const cases = [];
const run = (name, bundle, expected) => {
  const r = evaluateSection2Safe(bundle, PINNED);
  assert.equal(r.ok, expected, name);
  cases.push({ name, result: r.ok ? { ok: true } : r });
};
run("ancestor_control", cleanAncestor(), true);
let b = cleanAncestor();
b.evidences[0].signature = "00";
run("one_byte_unverified_signature", b, true);
b = cleanAncestor();
b.evidences[0].signature_verified = false;
run("adapter_failure_flag_rejected_as_unknown_schema_key", b, false);
assert.equal(cases.at(-1).result.check_id, "S2.C1");
b = cleanAncestor();
b.evidences[0].submission_digest_binding = "9".repeat(64);
b.evidences[0].evidence_digest = "8".repeat(64);
run("unrecomputed_evidence_and_submission_digests", b, true);
b = cleanAncestor();
b.seen_replay_identities = [evidenceReplayIdentity(b.evidences[0])];
run("unchanged_replay_control", b, false);
assert.equal(cases.at(-1).result.outcome, "identity_replay_upgrade_attempted");
b.evidences[0].submission_digest_binding = "7".repeat(64);
run("same_evidence_replay_renamed_by_submission_binding", b, true);
b = cleanAncestor();
b.evidences.push({
  ...structuredClone(b.evidences[0]),
  evidence_digest: "6".repeat(64),
  submission_digest_binding: "5".repeat(64),
});
run("two_evidences_for_unrelated_submissions", b, true);
b = cleanAncestor();
b.evidences[0].asserted_strength_delta = { ...REGISTRY_PROFILE.ceiling };
b.evidences.push({
  ...structuredClone(b.evidences[0]),
  profile_id: ROLE_PROFILE.profile_id,
  evidence_digest: "4".repeat(64),
  asserted_strength_delta: { ...ROLE_PROFILE.ceiling },
});
run("complementary_same_principal_claims_treated_as_contradictory", b, false);
assert.equal(cases.at(-1).result.check_id, "S2.C6");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const pub = { attestation_schema: SIG5P.public };
const audit = {
  attestation_schema: SIG5P.audit,
  public_attestation_digest: createHash("sha256").update(canonicalJson(pub)).digest("hex"),
  known_limitations: ["arbitrary"],
};
const att = {
  public: { payload: pub, signature: signPayload(pub, privateKey) },
  audit: { payload: audit, signature: signPayload(audit, privateKey) },
};
let result = verifyAttestation(att, publicKey);
assert.equal(result.ok, true);
cases.push({ name: "signed_minimal_attestation_without_census_or_nonclaims", result });
att.public.signature = "00";
result = verifyAttestation(att, publicKey);
assert.equal(result.ok, false);
cases.push({ name: "invalid_attestation_signature_control", result });
result = validateDischargeLedger(
  {
    outcomes: [
      {
        policy_outcome: "example",
        status: "reserved",
        signed_non_claim: "unsigned prose",
        amendment_trigger: "some text",
        unavailable_in_lanes: ["A"],
        reason: "some reason",
      },
    ],
  },
  { phase: "release", typedOutcomes: ["example"] }
);
assert.equal(result.ok, true);
cases.push({ name: "standalone_discharge_gate_does_not_authenticate_signed_nonclaim", result });
console.log(
  JSON.stringify(
    {
      scope:
        "Direct exported-module probes, synthetic fixtures and ephemeral local attestation key; no external ceremony.",
      cases,
    },
    null,
    2
  )
);
