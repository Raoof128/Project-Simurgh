// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — frozen-constant guards + result shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage5n/constants.mjs";
import { R, OK } from "../../../../tools/simurgh-attestation/stage5n/core/result.mjs";

test("frozen profile values", () => {
  assert.equal(C.T, 20_000_000);
  assert.equal(C.CADENCE, 2_000_000);
  assert.equal(C.STAGE_5N_FLOOR_MS, 60_000);
  assert.equal(C.MIN_AUTHORITY_UNCERTAINTY_MS, 1000);
  assert.deepEqual([...C.ACCEPTED_FRESHNESS_MODES], ["issuer_signed"]);
  assert.deepEqual([...C.ACCEPTED_INTERP_CHANNELS], ["optional", "not_in_scope"]);
});

test("scoped verdict enum excludes containment wording", () => {
  assert.ok(C.DECISION_VERDICTS.includes("delay_policy_satisfied"));
  assert.ok(!C.DECISION_VERDICTS.includes("boundary_held_verifiable"), "no containment overload");
});

test("overclaim + adequacy forbidden keys are Sets; no collision with 5N field names", () => {
  assert.ok(C.DELAY_OVERCLAIM_FORBIDDEN_KEYS.has("human_reviewed"));
  assert.ok(C.ADEQUACY_FORBIDDEN_KEYS.has("complete"));
  const fields = [
    "delay_policy",
    "start_request",
    "decision_body",
    "run_id",
    "D_in",
    "D_out",
    "seed",
    "terminal_value",
    "checkpoint_ladder",
    "interpretability_policy",
  ];
  for (const f of fields) {
    assert.ok(!C.DELAY_OVERCLAIM_FORBIDDEN_KEYS.has(f), `overclaim collides ${f}`);
    assert.ok(!C.ADEQUACY_FORBIDDEN_KEYS.has(f), `adequacy collides ${f}`);
  }
});

test("domain map has every required tag, all distinct, all namespaced", () => {
  const vals = Object.values(C.DS);
  assert.equal(new Set(vals).size, vals.length, "distinct");
  for (const v of vals) assert.match(v, /^simurgh\.vtc_delay\./);
  for (const k of ["start_authorisation", "input", "issuer_challenge", "seed", "step", "output"]) {
    assert.ok(C.DS[k], `missing domain ${k}`);
  }
});

test("verifier_config required keys + non-claims present", () => {
  assert.ok(C.VERIFIER_CONFIG_REQUIRED_KEYS.includes("expected_final_signer_fpr"));
  assert.ok(C.VERIFIER_CONFIG_REQUIRED_KEYS.includes("authority_registry"));
  assert.ok(C.NON_CLAIMS.includes("not_runtime_binary_attestation"));
  assert.ok(C.NON_CLAIMS.includes("not_proof_of_tsa_clock_correctness"));
});

test("result shapes", () => {
  assert.deepEqual(R(400, "delay_policy_not_accepted", { detail: "x" }), {
    raw: 400,
    reason: "delay_policy_not_accepted",
    detail: "x",
  });
  assert.deepEqual(OK({ elapsed_lower_bound_ms: 90000 }), {
    raw: 0,
    reason: "ok",
    elapsed_lower_bound_ms: 90000,
  });
});
