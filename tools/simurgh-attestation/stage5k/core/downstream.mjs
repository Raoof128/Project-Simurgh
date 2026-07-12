// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — 352 downstream binding. makeCtx does the work (verdicts + vpc_ref/vrc_ref recompute);
// this returns the stashed mismatch.
export function checkDownstream(ctx) {
  return ctx.downstreamMismatch;
}
