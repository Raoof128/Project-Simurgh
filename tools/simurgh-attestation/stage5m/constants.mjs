// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — VTC-Quorum frozen constants. The v2 envelope commits AS a native 5L bundle (schema_version
// simurgh.vtcq.bundle.v1, quorum_policy.profile "vtc_quorum"); the v2 dispatch marker + third ecology live
// in v2-only top-level fields. Member labels map to the FROZEN 5L anchor types (G-C).
import { ADEQUACY_FORBIDDEN_KEYS } from "../stage5l/constants.mjs";

export { ADEQUACY_FORBIDDEN_KEYS };

export const ENVELOPE_SCHEMA = "vtc_quorum_confirmed.v2"; // separate top-level marker, NOT schema_version
export const PROFILE = "third_trust_ecology";
export const QUORUM_RULE = "all_required"; // exact 3-of-3, no threshold fallback

export const REQUIRED_MEMBERS = Object.freeze([
  "rfc3161_tsa",
  "bitcoin_confirmed_publication",
  "transparency_log_inclusion",
]);

// v2 member LABELS → frozen 5L anchor types. TSA+OTS live in bundle.anchors; the log seat is a v2-only
// top-level field bundle.transparency_log_seat, never an anchor (G-A).
export const MEMBER_TO_ANCHOR_TYPE = Object.freeze({
  rfc3161_tsa: "rfc3161_tsa",
  bitcoin_confirmed_publication: "bitcoin_ots",
  transparency_log_inclusion: "transparency_log_seat",
});

// Verifier-pinned trust-ecology classes — derived in adapter code from seat identity, NEVER from the
// bundle (No Counterfeit Ecology; 392 distinctness is over these).
export const ECOLOGY_CLASSES = Object.freeze(["rfc3161", "bitcoin", "rekor"]);

// Adapter pinned inputs (independent of the entry; expected_submitter_key_fpr makes 390 non-vacuous, G6).
export const PINNED_INPUT_KEYS = Object.freeze([
  "tsa_root_fpr",
  "tsa_verifier_pubkey_fpr",
  "bitcoin_min_confirmations",
  "rekor_log_pubkey_fpr",
  "expected_submitter_key_fpr",
  "vtcq_policy_digest",
  "accuracy_policy_s",
]);

// I7 keyless-identity + I8 witness-cosigning: optional profile upgrades, NOT 5M completion debt.
export const MINTED_SOCKETS = Object.freeze([
  "keyless_submitter_identity_binding",
  "checkpoint_witness_cosigning",
]);

// Structural union slot 384 rejects when non-null (capstone + the two minted sockets).
export const RESERVED_ARTIFACT_SLOTS = Object.freeze([
  "campaign_composition_root",
  "keyless_submitter_identity_binding",
  "checkpoint_witness_cosigning",
]);
