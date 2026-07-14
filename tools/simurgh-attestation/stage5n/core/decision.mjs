// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 412 decision binding (verifier RECOMPUTES the digest), 413 output commitment (D_out formula).
import { R } from "./result.mjs";
import { decisionDigest, outputCommitment } from "./derive.mjs";
import { DECISION_VERDICTS } from "../constants.mjs";

export function checkDecisionBinding(env) {
  const body = env.decision_body;
  if (!body || !DECISION_VERDICTS.includes(body.verdict))
    return R(412, "decision_binding_mismatch", { detail: "verdict_enum" });
  if (decisionDigest(body) !== env.decision_digest)
    return R(412, "decision_binding_mismatch", { detail: "digest" });
  return null;
}

export function checkOutput(env) {
  const expected = outputCommitment({
    run_id: env.run_id,
    D_in: env.D_in,
    decision_digest: env.decision_digest,
    delay_policy_digest: env.delay_policy_digest,
    start_token_digest: env.start_token_digest,
    iteration_count: env.delay_policy.iteration_count_T,
    terminal_value: env.delay_proof.terminal_value,
  });
  if (env.D_out !== expected) return R(413, "output_commitment_mismatch");
  return null;
}
