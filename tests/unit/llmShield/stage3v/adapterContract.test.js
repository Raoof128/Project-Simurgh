// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  ADAPTER_SCHEMA,
  VERDICT_ENUM,
  validateObservation,
} from "../../../../tools/external-defense-adapters/externalDefenseAdapterContract.mjs";

const base = () => ({
  adapter_schema: ADAPTER_SCHEMA,
  target: "recorded_fixture",
  case_id: "3l-f5_tool_self_authorisation-input_miss_downstream-000",
  raw_output_ref: "local-only",
  normalised_verdict: "allow",
  confidence_bucket: "low",
  latency_bucket_ms: "0-100",
  error_code: "none",
});

test("valid observation passes and is returned", () => {
  const obs = base();
  assert.deepEqual(validateObservation(obs), obs);
});
test("enum is frozen and closed", () => {
  assert.deepEqual([...VERDICT_ENUM], ["allow", "block", "warn", "abstain", "error"]);
  assert.throws(() => VERDICT_ENUM.push("x"));
});
test("rejects adapter-supplied hash (branch: forbidden key)", () => {
  assert.throws(
    () => validateObservation({ ...base(), external_raw_output_hash: "sha256:deadbeef" }),
    /adapter_supplied_hash_forbidden/
  );
  assert.throws(
    () => validateObservation({ ...base(), digest: "x" }),
    /adapter_supplied_hash_forbidden/
  );
});
test("rejects missing field (branch)", () => {
  const obs = base();
  delete obs.case_id;
  assert.throws(() => validateObservation(obs), /missing_field:case_id/);
});
test("rejects invalid verdict enum (branch)", () => {
  assert.throws(
    () => validateObservation({ ...base(), normalised_verdict: "maybe" }),
    /invalid_enum:normalised_verdict/
  );
});
test("rejects raw_output_ref other than local-only (branch)", () => {
  assert.throws(
    () => validateObservation({ ...base(), raw_output_ref: "/etc/passwd" }),
    /invalid_raw_output_ref/
  );
});
test("rejects non-object observation (branch)", () => {
  assert.throws(() => validateObservation(null), /invalid_observation/);
});
test("rejects empty target (branch)", () => {
  assert.throws(() => validateObservation({ ...base(), target: "" }), /invalid_enum:target/);
});
test("rejects wrong adapter_schema (branch)", () => {
  assert.throws(
    () => validateObservation({ ...base(), adapter_schema: "x" }),
    /invalid_enum:adapter_schema/
  );
});
test("rejects invalid confidence/latency/error enums (branches)", () => {
  assert.throws(
    () => validateObservation({ ...base(), confidence_bucket: "x" }),
    /invalid_enum:confidence_bucket/
  );
  assert.throws(
    () => validateObservation({ ...base(), latency_bucket_ms: "x" }),
    /invalid_enum:latency_bucket_ms/
  );
  assert.throws(
    () => validateObservation({ ...base(), error_code: "x" }),
    /invalid_enum:error_code/
  );
});
test("Fix 3: contract_accepts_arbitrary_target_name_without_target_specific_code", () => {
  const obs = { ...base(), target: "llama_guard" };
  assert.deepEqual(validateObservation(obs), obs); // no target-specific branching
});
