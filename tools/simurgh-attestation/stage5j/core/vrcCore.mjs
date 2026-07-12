// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC pure verifier. Owns the frozen first-failure order 332→346 + wrapper 347. PURE over
// (bundle, cfg, facts): the node adapter verifies Ed25519 / SPKI-DER and re-verifies the embedded 5I
// bundle, handing in `facts` (the 5I B11 pattern). checkBundleSchema/checkConfigSchema run BEFORE
// makeCtx so a malformed bundle/cfg is 332, never a 347 throw.
//
// SKELETON (plan Task 1.2): returns raw 0. Checks + try/wrapper are appended by Tasks 1.3–1.13; the
// valid _validBundle() fixture must stay green as each real check lands.
export function vrcVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  return { raw: 0 };
}
