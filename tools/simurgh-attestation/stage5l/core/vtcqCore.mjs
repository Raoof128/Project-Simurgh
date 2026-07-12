// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q pure verifier. Owns the frozen first-failure SPINE (spec §2): schema 364 → makeCtx →
// 365 → 366 → 367 → 368 → 369 → 370 → 380 → 371 → 372 → 374 → 375 → 373 → 376 → 377 → 378 → 379 →
// [audit] 381 → policy 382 → wrapper 383. PURE over (bundle, cfg, facts): the node adapter does Ed25519 /
// RFC-3161 CMS / anchor-state work and injects `facts` (the 5I/5K B11 pattern). Schema runs BEFORE makeCtx
// so a malformed bundle/cfg is 364, never a 383 throw.
import { R, OK } from "./result.mjs";
import { checkBundleSchema, checkConfigSchema } from "./schema.mjs";
import { makeCtx } from "./context.mjs";
import { checkCommitment } from "./commitment.mjs";
import { checkReservedSlots } from "./policy.mjs";

export function vtcqVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  const b364 = checkBundleSchema(bundle);
  if (b364) return b364;
  const c364 = checkConfigSchema(cfg); // undefined/malformed cfg → 364 (P0-7a), never 383
  if (c364) return c364;
  try {
    const ctx = makeCtx(bundle, cfg, facts);
    const steps = [
      () => checkCommitment(ctx), // 365
      // 366 → 380 → … populated check-by-check in Task group 1 (frozen spine order)
    ];
    for (const s of steps) {
      const r = s();
      if (r) return r;
    }
    if (tier === "audit") {
      // 381 projections wired in Task 1.10
    }
    const pol = checkReservedSlots(ctx); // 382
    if (pol) return pol;
    return OK(ctx);
  } catch (e) {
    return R(383, "internal_or_env_unavailable", { error: String(e) });
  }
}
