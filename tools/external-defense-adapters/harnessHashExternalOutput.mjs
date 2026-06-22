// SPDX-License-Identifier: AGPL-3.0-or-later
// Trusted-harness hash helper. In 3V-A "gateway-computed" means computed HERE — by the
// trusted Simurgh harness/verifier path — never supplied by the adapter. This closes the
// Stage 3U R2-B residual: a verifier no longer has to trust an opaque adapter-provided hash.
// NOT production gateway code (src/llmShield is untouched).
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

const HASH_KEY = /(hash|digest)/i;

export function assertNoAdapterSuppliedHash(obj) {
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (HASH_KEY.test(k)) throw new Error("adapter_supplied_hash_forbidden");
    }
  }
}

export function harnessComputeHashes({
  rawOutput,
  normalisedVerdict,
  adapterConfig,
  externalDefenseManifest,
}) {
  return {
    external_raw_output_hash: sha256Hex(String(rawOutput)),
    external_normalised_verdict_hash: sha256Hex(canonicalJson(normalisedVerdict)),
    adapter_config_hash: sha256Hex(canonicalJson(adapterConfig)),
    external_defense_manifest_hash: sha256Hex(canonicalJson(externalDefenseManifest)),
  };
}
