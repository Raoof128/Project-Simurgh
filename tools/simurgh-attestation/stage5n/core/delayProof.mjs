// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 407/408 execution declaration, 409 seed, 410 checkpoint ladder, 411 terminal. The pure core
// COMPARES against injected recomputed facts (facts.recomputed); the node adapter runs the real 20M chain.
import { R } from "./result.mjs";
import { deriveSeed } from "./chain.mjs";

export function checkExecution(env) {
  const ed = env.execution_declaration ?? {};
  if (ed.iteration_count !== env.delay_policy.iteration_count_T)
    return R(407, "iteration_count_mismatch");
  if (ed.implementation_digest !== env.delay_policy.implementation_digest)
    return R(408, "implementation_commitment_mismatch");
  return null;
}

export function checkSeed(env) {
  const seed = deriveSeed({
    run_id: env.run_id,
    D_in: env.D_in,
    start_token_digest: env.start_token_digest,
    delay_policy_digest: env.delay_policy_digest,
  });
  if (env.delay_proof?.seed !== seed) return R(409, "seed_derivation_mismatch");
  return null;
}

export function checkCheckpoints(env, facts) {
  const declared = env.delay_proof?.checkpoint_ladder ?? [];
  const recomputed = facts?.recomputed?.checkpoints ?? [];
  if (declared.length !== recomputed.length)
    return R(410, "checkpoint_ladder_mismatch", { detail: "count" });
  for (let i = 0; i < declared.length; i++) {
    if (declared[i].i !== recomputed[i].i || declared[i].value !== recomputed[i].value)
      return R(410, "checkpoint_ladder_mismatch", { detail: `index:${i}` });
  }
  return null;
}

export function checkTerminal(env, facts) {
  if (env.delay_proof?.terminal_value !== facts?.recomputed?.terminal_value)
    return R(411, "delay_recomputation_failure");
  return null;
}
