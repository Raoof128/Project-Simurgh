// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — VTC-Delay frozen constants. Proves delayed FINALISATION + input-descendant commitment;
// never cognition, attention, physical elapsed time, or clock correctness. Public wording provider-agnostic.
import { ADEQUACY_FORBIDDEN_KEYS } from "../stage5l/constants.mjs";

export { ADEQUACY_FORBIDDEN_KEYS };

export const ENVELOPE_SCHEMA = "simurgh.vtc_delay.envelope.v1";
export const PROFILE_ID = "simurgh.vtc_delay.profile.5n.v1";
export const DELAY_ALGORITHM_ID = "simurgh.stage5n.dependent-sha256-chain.v1";
export const HASH_ALGORITHM = "sha256";
export const CANONICAL_ENCODING = "simurgh_canonical_json_v1";

export const T = 20_000_000;
export const CADENCE = 2_000_000;
export const STAGE_5N_FLOOR_MS = 60_000; // hard-frozen v1 (a later change needs a profile revision)
export const MIN_AUTHORITY_UNCERTAINTY_MS = 1000; // second-precision genTime with unspecified accuracy

export const ACCEPTED_FRESHNESS_MODES = Object.freeze(["issuer_signed"]); // beacon deferred to activation
export const ACCEPTED_INTERP_CHANNELS = Object.freeze(["optional", "not_in_scope"]); // "required" outside v1

// Scoped verdict enum — NOT "boundary_held" (reads as containment; this stage is temporal-policy only).
export const DECISION_VERDICTS = Object.freeze([
  "delay_policy_satisfied",
  "delay_policy_violated",
  "model_output_unusable",
]);

// I-C: the strongest false reading ("the human reviewed carefully") is structurally unassertable.
export const DELAY_OVERCLAIM_FORBIDDEN_KEYS = Object.freeze(
  new Set([
    "human_reviewed",
    "attention_verified",
    "review_duration_claimed",
    "careful_review",
    "cognition_time",
    "review_effort",
  ])
);

// Frozen domain-separation strings (shared by Node/Python/browser + the Lean theorem projection).
export const DS = Object.freeze({
  start_request: "simurgh.vtc_delay.start_request.v1",
  start_authorisation: "simurgh.vtc_delay.start_authorisation.v1",
  tsa_token: "simurgh.vtc_delay.tsa_token.v1",
  seed: "simurgh.vtc_delay.seed.v1",
  x0: "simurgh.vtc_delay.x0.v1",
  step: "simurgh.vtc_delay.step.v1",
  decision: "simurgh.vtc_delay.decision.v1",
  output: "simurgh.vtc_delay.output.v1",
  policy: "simurgh.vtc_delay.policy.v1",
  input: "simurgh.vtc_delay.input.v1",
  freshness_request: "simurgh.vtc_delay.freshness_request.v1",
  issuer_challenge: "simurgh.vtc_delay.issuer_challenge.v1",
  beacon_nonce: "simurgh.vtc_delay.beacon_nonce.v1",
  census: "simurgh.vtc_delay.census.v1",
  envelope: "simurgh.vtc_delay.envelope_signed.v1",
});

// Bounded detail enums (fail closed to "unknown" outside the set — never free text).
export const FRESHNESS_FAILURES = Object.freeze(
  new Set([
    "signature_invalid",
    "expired",
    "reused",
    "selection_rule_not_satisfied",
    "binding_mismatch",
  ])
);
export const SUBJECT_DETAILS = Object.freeze(
  new Set([
    "tsa_imprint_mismatch",
    "ots_leaf_mismatch",
    "rekor_artifact_mismatch",
    "subject_unextractable",
  ])
);
export const ANCHOR_DETAILS = Object.freeze(
  new Set(["ots_unconfirmed", "tsa_invalid", "child_extension_failed"])
);
export const UNCERTAINTY_DETAILS = Object.freeze(
  new Set(["accuracy_missing_no_policy", "authority_mismatch_no_sync_bound"])
);

export const VERIFIER_CONFIG_REQUIRED_KEYS = Object.freeze([
  "expected_final_signer_fpr",
  "expected_producer_fpr",
  "expected_issuer_fpr",
  "expected_tsa_verifier_fpr",
  "expected_rekor_submitter_fpr",
  "trusted_tsa_roots",
  "trusted_rekor_log_keys",
  "authority_registry",
  "hard_resource_limits",
]);

export const NON_CLAIMS = Object.freeze([
  "not_human_attention",
  "not_deliberation",
  "not_decision_formation_time",
  "not_review_quality",
  "not_work_exclusivity",
  "not_hardware_independent_delay",
  "not_universal_non_parallelisability",
  "not_decision_correctness",
  "not_regulatory_compliance",
  "not_runtime_binary_attestation",
  "not_jailbreak_detection_or_prevention",
  "not_proof_of_tsa_clock_correctness",
  "not_proof_of_beacon_unbiasability_or_finality",
  "not_proof_of_human_identity",
  "not_proof_of_continuous_human_presence",
  "not_process_totality_under_unmodelled_host_failure",
  "not_cryptographic_injectivity_proof",
]);
