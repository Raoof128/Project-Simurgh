// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC pure verifier. Owns the frozen first-failure order 348→362 + wrapper 363. PURE over
// (bundle, cfg, facts): the node adapter verifies Ed25519 / SPKI-DER, re-verifies the embedded 5I + 5J
// bundles, and derives the two anchor states, handing in `facts` (the 5I B11 pattern). Schema runs BEFORE
// makeCtx so a malformed bundle/cfg is 348, never a 363 throw.
import { R, OK } from "./result.mjs";
import { checkBundleSchema, checkConfigSchema } from "./schema.mjs";
import { makeCtx } from "./context.mjs";
import { checkCommitment } from "./commitment.mjs";
import { checkAnchorSubject, checkOrdering, checkFinalityOverclaim } from "./anchor.mjs";
import { checkDownstream } from "./downstream.mjs";
import { checkStartCensus, checkPrecedence } from "./starts.mjs";
import { checkExecutionBindings } from "./bindings.mjs";
import { checkInclusion } from "./inclusion.mjs";
import { checkShrinking, checkPhantom, checkAlias } from "./setlaws.mjs";
import { checkProjections } from "./projections.mjs";
import { checkReservedSlots } from "./policy.mjs";

export function vucVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  const b348 = checkBundleSchema(bundle);
  if (b348) return b348;
  if (cfg === undefined) return R(363, "external_config_unavailable");
  const c348 = checkConfigSchema(cfg);
  if (c348) return c348;
  try {
    const ctx = makeCtx(bundle, cfg, facts);
    const steps = [
      () => checkCommitment(ctx), // 349
      () => checkAnchorSubject(ctx), // 350
      () => checkOrdering(ctx), // 351
      () => checkDownstream(ctx), // 352
      () => checkStartCensus(ctx), // 353
      () => checkPrecedence(ctx), // 354
      () => checkExecutionBindings(ctx), // 355
      () => checkInclusion(ctx), // 356
      () => checkShrinking(ctx), // 357
      () => checkPhantom(ctx), // 358
      () => checkAlias(ctx), // 359
      () => checkFinalityOverclaim(ctx), // 360
    ];
    for (const s of steps) {
      const r = s();
      if (r) return r;
    }
    if (tier === "audit") {
      const p = checkProjections(ctx); // 361 audit-only
      if (p) return p;
    }
    const pol = checkReservedSlots(ctx); // 362 policy (both tiers)
    if (pol) return pol;
    return OK(ctx);
  } catch (e) {
    return R(363, "internal_or_env_unavailable", { error: String(e) });
  }
}
