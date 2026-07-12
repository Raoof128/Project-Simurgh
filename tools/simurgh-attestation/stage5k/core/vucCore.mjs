// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC pure verifier. Owns the frozen first-failure order 348→362 + wrapper 363. PURE over
// (bundle, cfg, facts): the node adapter verifies Ed25519 / SPKI-DER, re-verifies the embedded 5I + 5J
// bundles, and derives the two anchor states, handing in `facts` (the 5I B11 pattern). Schema runs BEFORE
// makeCtx so a malformed bundle/cfg is 348, never a 363 throw.
//
// makeCtx + the ordered checks are wired starting Task 1.3 (349), in strict frozen order through 1.11.
import { R, OK } from "./result.mjs";
import { checkBundleSchema, checkConfigSchema } from "./schema.mjs";

export function vucVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  const b348 = checkBundleSchema(bundle);
  if (b348) return b348;
  if (cfg === undefined) return R(363, "external_config_unavailable");
  const c348 = checkConfigSchema(cfg);
  if (c348) return c348;
  try {
    return OK(null); // makeCtx + ordered scan + audit/policy blocks land in 1.3–1.11
  } catch (e) {
    return R(363, "internal_or_env_unavailable", { error: String(e) });
  }
}
