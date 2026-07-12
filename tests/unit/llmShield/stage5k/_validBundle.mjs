// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — the by-construction crux fixture (plan Task 1.2). buildSignedVucBundle mints the full
// signed VUC ceremony over ONE lanePanelSpec section source (synthetic 5I + 5J + VUC), so
// U_commit = U_vpc = U_vrc by construction. Every check task tampers a structuredClone of this.
// fixtureFacts delegates to the REAL adapter (makeAdapterFacts) so tests use authoritative resolved facts.
import { buildSignedVucBundle } from "../../../../tools/simurgh-attestation/stage5k/node/buildSignedBundle.mjs";
import { makeAdapterFacts } from "../../../../tools/simurgh-attestation/stage5k/node/adapter.mjs";

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

// Authoritative facts for the crux fixture (re-verified 5I+5J verdicts + resolved VUC signatures + anchor
// state). Pass a tampered (bundle, cfg) to re-resolve facts against the tamper.
export function fixtureFacts(bundle = base().bundle, cfg = base().cfg) {
  return makeAdapterFacts(bundle, cfg);
}
