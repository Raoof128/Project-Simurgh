// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — two-tier attestation over the whole stage's evidence.
//
// PUBLIC tier   binds what an outsider can recompute offline WITHOUT trusting the producer: the
//               frozen taxonomy, the raw-code allocation, both census identities, the lane digests,
//               and the non-claims. Anyone with the repo can rebuild every one of these numbers.
// AUDIT tier    adds the signed known_limitations. Signing the limitations is the part that matters
//               — a stage that signs only its successes has signed half a document.
//
// The signature is over `canonicalJson(payload)`, and the verifier re-canonicalises what it reads
// rather than trusting the bytes it was handed (3M's pattern: sign canonicalJson(parse(bundle))).
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { POLICY_OUTCOMES, SECTION2_CHECK_IDS } from "../core/section2Verifier.mjs";
import { VSI_ALLOCATION, VSI_PAIR_ALIASES } from "../core/rawCodeAllocator.mjs";
import { measureLaneACensus } from "./measureStage5pLaneACensus.mjs";
import { measureRawCodeCensus } from "./measureStage5pRawCodes.mjs";
import { loadGleifCapture } from "./laneC1Gleif.mjs";
import { verifyRekorCeremonyOffline } from "./laneBRekor.mjs";

export const SIG5P = Object.freeze({
  public: "simurgh.vsi.attestation.public.v1",
  audit: "simurgh.vsi.attestation.audit.v1",
});

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * SIGNED limitations. Every one of these is a real bound on what Stage 5P proves, and they are
 * inside the audit payload so that repudiating them means repudiating the signature.
 */
export const KNOWN_LIMITATIONS = Object.freeze([
  "lane_b_is_a_real_rekor_anchor_with_a_self_managed_key_NOT_a_fulcio_keyless_ceremony",
  "lane_b_proves_an_artifact_was_signed_by_something_at_a_time_never_by_whom",
  "lane_c1_authentication_is_tls_at_capture_then_digest_frozen_not_an_offline_gleif_signature",
  "lane_c1_maps_only_the_three_registry_pairs_the_capture_observed_others_fail_closed",
  "lane_c2_role_and_durable_principal_resolution_is_unreachable_no_qualifying_profile_exists",
  "lane_l_live_authority_laundering_capture_has_not_been_executed",
  "the_lean_core_bounds_the_ORDER_ALGEBRA_it_does_not_certify_the_pipeline_or_the_fact_manufacturing_seam",
  "identity_binding_does_not_imply_submission_completeness_law_6_scitt_rfc9943_concedes_the_same_seam",
  "a_compromised_but_trusted_resolver_profile_is_indistinguishable_from_an_honest_one_here_T7",
  "cross_namespace_collision_T10_has_a_mechanism_but_no_S2_fixture_witness",
  "a_lane_a_witness_discharges_REACHABILITY_of_an_outcome_never_its_external_validity",
]);

/**
 * NON-CLAIMS — §1's frozen five, plus the section- and lane-owned additions. Carried in the PUBLIC
 * payload so they travel with every consumer, not only with auditors.
 */
export const ATTESTED_NON_CLAIMS = Object.freeze([
  "not_proof_of_uncompromised_identity",
  "not_proof_of_exclusive_account_control",
  "not_proof_of_submitter_honesty",
  "not_proof_of_submission_completeness",
  "not_proof_of_legal_authority_outside_the_pinned_resolver_profile",
  "incomparability_density_is_not_a_security_score",
  "not_proof_of_present_accountability",
]);

const digestOf = (value) =>
  crypto
    .createHash("sha256")
    .update(Buffer.from(canonicalJson(value), "utf8"))
    .digest("hex");

const fileDigest = (path) => crypto.createHash("sha256").update(readFileSync(path)).digest("hex");

/**
 * The PUBLIC payload. Every field is recomputable offline from the repo by a stranger.
 *
 * Deliberately NOT included: any wall-clock time, any host detail, any path outside the repo. A
 * payload that carried them would not be reproducible, and an attestation nobody can reproduce is a
 * press release with a signature on it.
 */
export function buildPublicPayload() {
  const laneA = measureLaneACensus({ phase: "release" });
  const rawCodes = measureRawCodeCensus();
  const gleif = loadGleifCapture();
  const rekor = verifyRekorCeremonyOffline();

  return {
    attestation_schema: SIG5P.public,
    stage: "5P",
    blade: "componentwise_identity_resolution_lattice",

    // The frozen contract.
    check_order: [...SECTION2_CHECK_IDS],
    typed_outcomes: [...POLICY_OUTCOMES],
    raw_code_allocation_digest: digestOf([...VSI_ALLOCATION]),
    raw_code_alias_digest: digestOf([...VSI_PAIR_ALIASES]),

    // Both censuses, by identity rather than by transcription.
    lane_a_census_digest: digestOf(laneA),
    raw_code_census_digest: digestOf(rawCodes),
    lane_a_census_ok: laneA.ok,
    raw_code_census_ok: rawCodes.ok,
    discharge_counts: laneA.discharge.counts,

    // Lane C1 — captured-then-frozen, offline-verified.
    lane_c1_capture_digest: digestOf(gleif),
    lane_c1_authentication: gleif.authentication,
    lane_c1_records: gleif.records.length,

    // Lane B — a real public transparency-log entry, offline-verified.
    lane_b_log: rekor.log,
    lane_b_uuid: rekor.uuid,
    lane_b_log_index: rekor.log_index,
    lane_b_artifact_digest: rekor.artifact_digest,
    lane_b_is_keyless: rekor.is_keyless,
    lane_b_offline_checks_ok: rekor.ok,

    // The Lean core, by file digest: a reader can check the proof they have is the proof we signed.
    lean_core_digest: fileDigest(resolve(HERE, "../../../../proofs/stage5p/Vsi.lean")),

    // Lanes that did NOT run. Stated positively so their absence is a signed fact, not an omission.
    lanes_not_executed: ["C2", "L"],

    non_claims: ATTESTED_NON_CLAIMS,
  };
}

/** The AUDIT payload binds the public one by digest and adds the SIGNED limitations. */
export function buildAuditPayload() {
  const pub = buildPublicPayload();
  return {
    attestation_schema: SIG5P.audit,
    public_attestation_digest: digestOf(pub),
    known_limitations: KNOWN_LIMITATIONS,
    // A stage that signed only its successes would have signed half a document.
    limitations_count: KNOWN_LIMITATIONS.length,
  };
}

export function signPayload(payload, privateKeyPem) {
  return crypto
    .sign(null, Buffer.from(canonicalJson(payload), "utf8"), privateKeyPem)
    .toString("hex");
}

/**
 * Verify a bundle OFFLINE.
 *
 * Re-canonicalises the payload it was handed rather than verifying the bytes as received — 3M's
 * pattern. Verifying received bytes would let a producer smuggle meaning through whitespace or key
 * order that the consumer's parse silently discards.
 */
export function verifyAttestation(bundle, publicKeyPem) {
  const checks = {};
  for (const tier of ["public", "audit"]) {
    const entry = bundle?.[tier];
    checks[`${tier}_present`] = Boolean(entry?.payload && entry?.signature);
    if (!checks[`${tier}_present`]) continue;
    checks[`${tier}_schema`] = entry.payload.attestation_schema === SIG5P[tier];
    checks[`${tier}_signature_valid`] = crypto.verify(
      null,
      Buffer.from(canonicalJson(entry.payload), "utf8"),
      publicKeyPem,
      Buffer.from(entry.signature, "hex")
    );
  }
  // The audit tier must actually bind the public tier it claims to describe.
  checks.audit_binds_public =
    bundle?.audit?.payload?.public_attestation_digest === digestOf(bundle?.public?.payload);
  // The limitations must be present and non-empty — an empty list would be an unsigned claim of
  // perfection wearing the shape of a signed disclosure.
  checks.limitations_signed = (bundle?.audit?.payload?.known_limitations ?? []).length > 0;

  return Object.freeze({
    checks: Object.freeze(checks),
    ok: Object.values(checks).every((v) => v === true),
  });
}

/** Build both tiers and sign them. Byte-stable: no clock, no randomness, no host state. */
export function buildAttestationBundle(privateKeyPem) {
  const pub = buildPublicPayload();
  const audit = buildAuditPayload();
  return {
    bundle_schema: "simurgh.vsi.attestation_bundle.v1",
    public: { payload: pub, signature: signPayload(pub, privateKeyPem) },
    audit: { payload: audit, signature: signPayload(audit, privateKeyPem) },
  };
}
