// SPDX-License-Identifier: AGPL-3.0-or-later
// Generic external-defence adapter contract. The adapter emits ONE normalised observation
// per case. It may NEVER supply a hash (the trusted harness computes all hashes) and may
// NEVER carry raw prompt/output inline (raw output lives only in fixtures, referenced as
// "local-only"). `target` is a free string: no code path hard-codes "recorded_fixture".
export const ADAPTER_SCHEMA = "simurgh.external_defense_adapter.v1";
export const VERDICT_ENUM = Object.freeze(["allow", "block", "warn", "abstain", "error"]);
export const CONFIDENCE_ENUM = Object.freeze(["none", "low", "medium", "high", "not_reported"]);
export const LATENCY_ENUM = Object.freeze(["0-100", "100-500", "500-2000", "2000+"]);
export const ERROR_ENUM = Object.freeze([
  "none",
  "adapter_error",
  "target_error",
  "timeout",
  "malformed_output",
]);

const REQUIRED = Object.freeze([
  "adapter_schema",
  "target",
  "case_id",
  "raw_output_ref",
  "normalised_verdict",
  "confidence_bucket",
  "latency_bucket_ms",
  "error_code",
]);
const HASH_KEY = /(hash|digest)/i;

export function validateObservation(obs) {
  if (!obs || typeof obs !== "object") throw new Error("invalid_observation");
  for (const k of Object.keys(obs)) {
    if (HASH_KEY.test(k)) throw new Error("adapter_supplied_hash_forbidden");
  }
  for (const f of REQUIRED) {
    if (!(f in obs)) throw new Error(`missing_field:${f}`);
  }
  if (obs.adapter_schema !== ADAPTER_SCHEMA) throw new Error("invalid_enum:adapter_schema");
  if (typeof obs.target !== "string" || obs.target.length === 0)
    throw new Error("invalid_enum:target");
  if (obs.raw_output_ref !== "local-only") throw new Error("invalid_raw_output_ref");
  if (!VERDICT_ENUM.includes(obs.normalised_verdict))
    throw new Error("invalid_enum:normalised_verdict");
  if (!CONFIDENCE_ENUM.includes(obs.confidence_bucket))
    throw new Error("invalid_enum:confidence_bucket");
  if (!LATENCY_ENUM.includes(obs.latency_bucket_ms))
    throw new Error("invalid_enum:latency_bucket_ms");
  if (!ERROR_ENUM.includes(obs.error_code)) throw new Error("invalid_enum:error_code");
  return obs;
}
