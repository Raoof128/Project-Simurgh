// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC pure verifier. Owns the frozen first-failure order 316→330 + wrapper 331. PURE over
// (bundle, cfg, facts): the runtime adapter verifies Ed25519 / SPKI-DER / registries and hands in
// `facts` (B11). 316 and 317 run BEFORE makeCtx so a malformed bundle/cfg is 316/317, not a 331 throw.
import { R, OK } from "./result.mjs";
import { makeCtx } from "./context.mjs";
import { checkSchema } from "./schema.mjs";
import {
  checkExternalConfig,
  checkSignaturesAndRoles,
  checkPartition,
  checkCensus,
  checkGrantBounds,
  checkReceiptBounds,
  checkEvaluation,
} from "./checks317to324.mjs";
import {
  checkSeparation,
  checkAffiliation,
  checkCoverage,
  checkAdequacyGate,
} from "./checks325to328.mjs";
import { checkAttestationRecompute, checkPolicy } from "./checks329to330.mjs";

export function vpcVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  const s316 = checkSchema(bundle);
  if (s316) return s316; // 316
  if (cfg === undefined) return R(331, "external_config_unavailable");
  const s317 = checkExternalConfig(cfg, bundle);
  if (s317) return s317; // 317
  try {
    const ctx = makeCtx(bundle, cfg, facts);
    const steps = [
      () => (ctx.rawReceiptCount() >= 1 ? null : R(318, "empty_panel")), // 318
      () => checkSignaturesAndRoles(ctx), // 319
      () => checkPartition(ctx), // 320
      () => checkCensus(ctx), // 321
      () => checkGrantBounds(ctx), // 322
      () => checkReceiptBounds(ctx), // 323
      () => checkEvaluation(ctx), // 324
      () => checkSeparation(ctx, cfg.policy), // 325
      () => checkAffiliation(ctx), // 326
      () => checkCoverage(ctx), // 327
      () => checkAdequacyGate(bundle), // 328
    ];
    for (const s of steps) {
      const r = s();
      if (r) return r;
    }
    if (tier === "audit") {
      const a = checkAttestationRecompute(ctx); // 329 audit-only
      if (a) return a;
    }
    const p = checkPolicy(ctx, cfg.policy); // 330 BOTH tiers
    if (p) return p;
    return OK(ctx);
  } catch (e) {
    return R(331, "internal_or_env_unavailable", { error: String(e) }); // wrapper (B3: object)
  }
}
