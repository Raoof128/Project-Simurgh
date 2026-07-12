// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC pure verifier. Owns the frozen first-failure order 332→346 + wrapper 347. PURE over
// (bundle, cfg, facts): the node adapter verifies Ed25519 / SPKI-DER and re-verifies the embedded 5I
// bundle, handing in `facts` (the 5I B11 pattern). checkBundleSchema/checkConfigSchema run BEFORE
// makeCtx so a malformed bundle/cfg is 332, never a 347 throw.
//
// Checks + try/wrapper are appended by Tasks 1.4–1.13; the valid _validBundle() fixture stays green as
// each real check lands.
import { R } from "./result.mjs";
import { checkBundleSchema, checkConfigSchema } from "./schema.mjs";

export function vrcVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  const b332 = checkBundleSchema(bundle);
  if (b332) return b332; // 332 (bundle form, pre-ctx)
  if (cfg === undefined) return R(347, "external_config_unavailable");
  const c332 = checkConfigSchema(cfg);
  if (c332) return c332; // 332 (cfg form, pre-ctx)
  return { raw: 0 }; // makeCtx + ordered steps appended by Tasks 1.4–1.13
}
