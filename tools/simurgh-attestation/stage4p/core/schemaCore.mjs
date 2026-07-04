// SPDX-License-Identifier: AGPL-3.0-or-later
// Exact-key schema validation, fail closed (4P spec §6, §7.2). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS, ENUMS, GENESIS } from "../constants.mjs";

const fail67 = { ok: false, raw: 67, reason: "schema_invalid" };
const isEpoch = (v) => Number.isInteger(v) && v >= 0;
const isDigest = (v) => typeof v === "string" && DIGEST_RE.test(v);
const isDigestOrGenesis = (v) => v === GENESIS || isDigest(v);
const isB64 = (v) => typeof v === "string" && v.length > 0 && /^[A-Za-z0-9+/=]+$/.test(v);

function exactKeys(obj, keys) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const a = Object.keys(obj).sort();
  const b = [...keys].sort();
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

const ENVELOPE_KEYS = [
  "schema",
  "run_epoch",
  "declared_endpoint_digest",
  "provider_family",
  "provider_identity_digest",
  "model_identity_digest",
  "relay_policy",
  "declared_relay_digests",
  "declared_transform_digests",
  "account_boundary",
  "trace_custody",
  "tool_surface_digest",
  "valid_from_epoch",
  "valid_until_epoch",
  "signature",
];

export function validateEnvelope(env) {
  if (!exactKeys(env, ENVELOPE_KEYS)) return fail67;
  if (env.schema !== SCHEMAS.ENVELOPE) return fail67;
  if (![env.run_epoch, env.valid_from_epoch, env.valid_until_epoch].every(isEpoch)) return fail67;
  if (env.valid_from_epoch > env.valid_until_epoch) return fail67;
  if (!ENUMS.provider_family.includes(env.provider_family)) return fail67;
  if (!ENUMS.relay_policy.includes(env.relay_policy)) return fail67;
  if (!ENUMS.account_boundary.includes(env.account_boundary)) return fail67;
  if (!ENUMS.trace_custody.includes(env.trace_custody)) return fail67;
  const digests = [
    env.declared_endpoint_digest,
    env.provider_identity_digest,
    env.model_identity_digest,
    env.tool_surface_digest,
  ];
  if (!digests.every(isDigest)) return fail67;
  if (!Array.isArray(env.declared_relay_digests) || !env.declared_relay_digests.every(isDigest))
    return fail67;
  if (
    !Array.isArray(env.declared_transform_digests) ||
    !env.declared_transform_digests.every(isDigest)
  )
    return fail67;
  if (!isB64(env.signature)) return fail67;
  return { ok: true };
}

const HOP_KEYS = [
  "schema",
  "hop_index",
  "previous_receipt_digest",
  "relay_identity_digest",
  "transform_digest",
  "input_digest",
  "output_digest",
  "signature",
];

export function validateHopReceipt(hop) {
  if (!exactKeys(hop, HOP_KEYS)) return fail67;
  if (hop.schema !== SCHEMAS.HOP_RECEIPT) return fail67;
  if (!Number.isInteger(hop.hop_index) || hop.hop_index < 0) return fail67;
  if (!isDigest(hop.previous_receipt_digest)) return fail67;
  if (!isDigest(hop.relay_identity_digest)) return fail67;
  if (!isDigestOrGenesis(hop.transform_digest)) return fail67;
  if (![hop.input_digest, hop.output_digest].every(isDigest)) return fail67;
  if (!isB64(hop.signature)) return fail67;
  return { ok: true };
}

const RECEIPT_KEYS = [
  "schema",
  "request_digest",
  "response_digest",
  "custody_path_digest",
  "model_identity_digest",
  "relay_chain_digest",
  "trace_custody_observed",
  "tool_surface_digest",
  "receipt_epoch",
  "signature",
];

export function validateCustodyReceipt(rec) {
  const bad = { ok: false, raw: 77, reason: "receipt_schema_invalid" };
  if (!exactKeys(rec, RECEIPT_KEYS)) return bad;
  if (rec.schema !== SCHEMAS.CUSTODY_RECEIPT) return bad;
  const digests = [
    rec.request_digest,
    rec.response_digest,
    rec.custody_path_digest,
    rec.model_identity_digest,
    rec.relay_chain_digest,
    rec.tool_surface_digest,
  ];
  if (!digests.every(isDigest)) return bad;
  if (!ENUMS.trace_custody_observed.includes(rec.trace_custody_observed)) return bad;
  if (!isEpoch(rec.receipt_epoch)) return bad;
  if (!isB64(rec.signature)) return bad;
  return { ok: true };
}

const MATCHABLE_KEYS = [
  "schema",
  "signal_mode",
  "failure_class",
  "stage4n_window_anchor_digest",
  "evidence_kind",
  "windowed_evidence_commitment",
  "custody_class_digest",
  "entropy_floor_bits",
  "disclosure_budget_max_signals_per_window",
  "public_linkability",
];
const DEGRADED_KEYS = [
  "schema",
  "signal_mode",
  "coarse_failure_class",
  "stage4n_window_anchor_digest",
  "entropy_floor_bits",
  "observed_entropy_bits",
  "public_linkability",
];

export function validateCpcSignal(sig) {
  if (!sig || typeof sig !== "object" || Array.isArray(sig)) return fail67;
  if (sig.schema !== SCHEMAS.CPC_SIGNAL) return fail67;
  if (sig.signal_mode === "matchable") {
    // Variant contamination gets its OWN raw-79 reasons (spec §6.4) so the tamper
    // matrix can distinguish "wrong variant" from "generic malformation".
    if (!("custody_class_digest" in sig))
      return { ok: false, raw: 79, reason: "matchable_missing_digest" };
    if (!exactKeys(sig, MATCHABLE_KEYS)) return fail67;
    if (!isDigest(sig.custody_class_digest)) return fail67;
    if (!isDigest(sig.windowed_evidence_commitment)) return fail67;
    if (!isDigest(sig.stage4n_window_anchor_digest)) return fail67;
    if (!ENUMS.evidence_kind.includes(sig.evidence_kind)) return fail67;
    if (sig.public_linkability !== "bounded") return fail67;
    if (!Number.isInteger(sig.entropy_floor_bits) || sig.entropy_floor_bits <= 0) return fail67;
    if (
      !Number.isInteger(sig.disclosure_budget_max_signals_per_window) ||
      sig.disclosure_budget_max_signals_per_window < 1
    )
      return fail67;
    return { ok: true };
  }
  if (sig.signal_mode === "degraded_non_matchable") {
    if ("custody_class_digest" in sig)
      return { ok: false, raw: 79, reason: "degraded_carries_digest" };
    if (!exactKeys(sig, DEGRADED_KEYS)) return fail67;
    if (!isDigest(sig.stage4n_window_anchor_digest)) return fail67;
    if (sig.public_linkability !== "none") return fail67;
    if (sig.observed_entropy_bits !== 0) return fail67;
    if (!Number.isInteger(sig.entropy_floor_bits) || sig.entropy_floor_bits <= 0) return fail67;
    return { ok: true };
  }
  return fail67;
}
