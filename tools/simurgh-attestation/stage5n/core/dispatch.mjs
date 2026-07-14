// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — the frozen first-failure spine 396→418 over injected B11 facts. First failure wins; green
// returns raw 0 with the elapsed lower bound. 419 (outer boundary) is owned by node/verify.mjs, never here.
import { OK } from "./result.mjs";
import { checkEnvelope, checkFinalSignature, checkInput } from "./schema.mjs";
import { checkPolicyDigest, checkPolicyAccepted } from "./policy.mjs";
import { checkFreshness } from "./freshness.mjs";
import { checkStartBinding, checkStartSignature } from "./startAuth.mjs";
import {
  checkStartSubject,
  checkStartToken,
  checkStartAnchor,
  checkEndSubject,
  checkEndAnchor,
} from "./endpoints.mjs";
import { checkExecution, checkSeed, checkCheckpoints, checkTerminal } from "./delayProof.mjs";
import { checkDecisionBinding, checkOutput } from "./decision.mjs";
import { checkElapsed } from "./elapsed.mjs";
import { checkInterp } from "./interp.mjs";

// verifyCore(envelope, facts, opts) — opts: { verifier_config, census, expectedInputCommitment }
export function verifyCore(env, facts, opts = {}) {
  const vc = opts.verifier_config;
  const steps = [
    () => checkEnvelope(env, opts), // 396
    () => checkFinalSignature(env, vc), // 397
    () => checkInput(env, opts), // 398
    () => checkPolicyDigest(env), // 399
    () => checkPolicyAccepted(env, vc), // 400
    () => checkFreshness(env, vc, facts, opts.census), // 401
    () => checkStartBinding(env), // 402
    () => checkStartSignature(env, vc), // 403
    () => checkStartSubject(env, facts), // 404
    () => checkStartToken(facts), // 405
    () => checkStartAnchor(facts), // 406
    () => checkExecution(env), // 407/408
    () => checkSeed(env), // 409
    () => checkCheckpoints(env, facts), // 410
    () => checkTerminal(env, facts), // 411
    () => checkDecisionBinding(env), // 412
    () => checkOutput(env), // 413
    () => checkEndSubject(env, facts), // 414
    () => checkEndAnchor(facts), // 415
  ];
  for (const step of steps) {
    const r = step();
    if (r) return r;
  }
  const elapsed = checkElapsed(env, facts); // 416/417
  if (elapsed && elapsed.raw !== 0) return elapsed;
  const interp = checkInterp(env); // 418
  if (interp) return interp;
  return OK({ elapsed_lower_bound_ms: elapsed.elapsed_lower_bound_ms, D_out: env.D_out });
}
