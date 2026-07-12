// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC pure verifier. Owns the frozen first-failure order 332→346 + wrapper 347. PURE over
// (bundle, cfg, facts): the node adapter verifies Ed25519 / SPKI-DER and re-verifies the embedded 5I
// bundle, handing in `facts` (the 5I B11 pattern). checkBundleSchema/checkConfigSchema run BEFORE
// makeCtx so a malformed bundle/cfg is 332, never a 347 throw.
//
// Checks + try/wrapper are appended by Tasks 1.4–1.13; the valid _validBundle() fixture stays green as
// each real check lands.
import { R, OK } from "./result.mjs";
import { checkBundleSchema, checkConfigSchema } from "./schema.mjs";
import { makeCtx } from "./context.mjs";

export function vrcVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  const b332 = checkBundleSchema(bundle);
  if (b332) return b332; // 332 (bundle form, pre-ctx)
  if (cfg === undefined) return R(347, "external_config_unavailable");
  const c332 = checkConfigSchema(cfg);
  if (c332) return c332; // 332 (cfg form, pre-ctx)
  try {
    const ctx = makeCtx(bundle, cfg, facts); // stores ctx.anchorMismatch; never throws on bad upstream
    const steps = [
      () => ctx.anchorMismatch, // 333
      // 334–344 appended by Tasks 1.5–1.10
    ];
    for (const s of steps) {
      const r = s();
      if (r) return r;
    }
    // audit-only 345 + policy 346 appended by Tasks 1.11–1.12
    return OK(ctx);
  } catch (e) {
    return R(347, "internal_or_env_unavailable", { error: String(e) });
  }
}
