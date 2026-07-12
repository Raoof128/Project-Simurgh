// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — the by-construction crux fixture (plan Task 1.2). buildSignedVucBundle mints the full
// signed VUC ceremony over ONE lanePanelSpec section source (synthetic 5I + 5J + VUC), so
// U_commit = U_vpc = U_vrc by construction. Every check task tampers a structuredClone of this.
// fixtureFacts runs the REAL 5I + 5J verifiers to earn the upstream verdicts (honest, not asserted).
import { buildSignedVucBundle } from "../../../../tools/simurgh-attestation/stage5k/node/buildSignedBundle.mjs";
import { vpcVerify } from "../../../../tools/simurgh-attestation/stage5i/core/vpcCore.mjs";
import { makeAdapterFacts as vpcAdapterFacts } from "../../../../tools/simurgh-attestation/stage5i/node/adapter.mjs";
import { vrcVerify } from "../../../../tools/simurgh-attestation/stage5j/core/vrcCore.mjs";
import { makeAdapterFacts as vrcAdapterFacts } from "../../../../tools/simurgh-attestation/stage5j/node/adapter.mjs";

let cached;
function base() {
  cached ??= buildSignedVucBundle();
  return cached;
}

export function validBundle() {
  return structuredClone(base().bundle);
}
export function validCfg() {
  return structuredClone(base().cfg);
}

// Honest upstream verdicts + placeholder VUC signature booleans (the authoritative adapter is Task 2.1).
export function fixtureFacts(cfg = base().cfg) {
  let vpc_verdict = 331;
  let vrc_verdict = 347;
  try {
    vpc_verdict = vpcVerify(
      cfg.vpc_bundle,
      cfg.vpc_external_config,
      vpcAdapterFacts(cfg.vpc_bundle, cfg.vpc_external_config),
      { tier: "audit" }
    ).raw;
  } catch {
    vpc_verdict = 331;
  }
  try {
    vrc_verdict = vrcVerify(
      cfg.vrc_bundle,
      cfg.vrc_external_config,
      vrcAdapterFacts(cfg.vrc_bundle, cfg.vrc_external_config),
      { tier: "audit" }
    ).raw;
  } catch {
    vrc_verdict = 347;
  }
  return { vpc_verdict, vrc_verdict };
}
