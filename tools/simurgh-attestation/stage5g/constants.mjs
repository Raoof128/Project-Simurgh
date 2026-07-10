// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC: Verifiable Foreign Capture. Constants + the rung lattice.
// Motto: AnthropicSafe First, then ReviewerSafe.
//
// The verifier computes the strongest producer/verifier SEPARATION rung a foreign capture supports and
// rejects unsupported upgrades. Rungs are an ordered enum compared by exact small-integer ordinal — no
// binary floating-point or score arithmetic ever affects a verdict.
export {
  VFC_RAW_CODES as CODES,
  VFC_PUBLIC_CHECK_ORDER,
  VFC_AUDIT_CHECK_ORDER,
  VFC_AUDIT_ONLY_CODES,
  VFC_POLICY_CODES,
} from "../stage4h/exitCodes.mjs";

const ORDER = ["distinct_key_only", "challenge_bound", "externally_anchored"];
export const RUNG = Object.freeze({
  order: Object.freeze([...ORDER]),
  index: (r) => ORDER.indexOf(r), // ordinal only, never a measurement
});

export function rungGte(a, b) {
  const i = ORDER.indexOf(a);
  const j = ORDER.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`invalid rung ${JSON.stringify([a, b])}`);
  return i >= j;
}

export const ANCHOR_TYPES = Object.freeze(["none", "sigstore_oidc"]);

// Domain-separation prefixes (trailing newline is part of the bytes). digest = sha256(DOMAIN.x +
// canonicalJson(content)); signature = sign(key, DOMAIN.x + canonicalJson(content)). No object hashes
// or signs itself — the digest/signature fields live only in the wrapper.
export const DOMAIN = Object.freeze({
  challenge_receipt: "simurgh.vfc.challenge_receipt.v1\n",
  producer_transcript: "simurgh.vfc.producer_transcript.v1\n",
  foreign_capture: "simurgh.vfc.foreign_capture.v1\n",
  capture: "simurgh.vfc.capture.v1\n",
  anchor_evidence: "simurgh.vfc.anchor_evidence.v1\n",
  verifier_identity: "simurgh.vfc.verifier_identity.v1\n",
  producer_identity: "simurgh.vfc.producer_identity.v1\n",
  capture_census: "simurgh.vfc.capture_census.v1\n",
});

export const VFC_SCHEMAS = Object.freeze({
  challenge_receipt: "simurgh.vfc.challenge_receipt.v1",
  producer_transcript: "simurgh.vfc.producer_transcript.v1",
  foreign_capture: "simurgh.vfc.foreign_capture.v1",
  capture: "simurgh.vfc.capture.v1",
  verifier_identity: "simurgh.vfc.verifier_identity.v1",
  producer_identity: "simurgh.vfc.producer_identity.v1",
  anchor_evidence: "simurgh.vfc.anchor_evidence.v1",
  capture_census: "simurgh.vfc.capture_census.v1",
  campaign_outcome: "simurgh.vfc.campaign_outcome.v1",
  blind_recompute_receipt: "simurgh.vfc.blind_recompute_receipt.v1",
});

export const CAMPAIGN_STATUS = Object.freeze([
  "completed",
  "declined",
  "no_show",
  "environment_failed",
]);

export const DEFAULT_MIN_RUNG = "challenge_bound";

export const VFC_RESERVED_SLOTS = Object.freeze([
  "real_sigstore_anchor_execution_deferred",
  "foreign_panel_capture_deferred",
  "dns_anchor_backend_deferred",
  "undisclosed_rerun_detection_deferred",
  "reflexive_foreign_capture_execution_deferred",
  "producer_affiliation_deferred",
  "overt_vfc_crosswalk_deferred",
  "cap_srp_receipt_bridge_deferred",
]);
