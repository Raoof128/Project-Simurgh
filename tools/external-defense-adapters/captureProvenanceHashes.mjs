// SPDX-License-Identifier: AGPL-3.0-or-later
// The seven trusted-harness hashes for Stage 3V-B. "Harness-computed" = computed here, never
// supplied by the adapter (closes 3U R2-B). Reuses sha256Hex (already prefixes "sha256:") and
// canonicalJson (key-order independent). NOT production gateway code.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { assertNoAdapterSuppliedHash } from "./harnessHashExternalOutput.mjs";

export function harnessComputeStage3vbHashes({
  rawOutputsConcat,
  normalisedVerdict,
  adapterConfig,
  captureProvenance,
  captureFileObject,
  captureScriptText,
  promptRenderingSpec,
}) {
  assertNoAdapterSuppliedHash(adapterConfig);
  return Object.freeze({
    external_raw_output_hash: sha256Hex(String(rawOutputsConcat)),
    external_normalised_verdict_hash: sha256Hex(canonicalJson(normalisedVerdict)),
    adapter_config_hash: sha256Hex(canonicalJson(adapterConfig)),
    capture_provenance_hash: sha256Hex(canonicalJson(captureProvenance)),
    capture_file_hash: sha256Hex(canonicalJson(captureFileObject)),
    capture_script_hash: sha256Hex(String(captureScriptText)),
    prompt_rendering_hash: sha256Hex(canonicalJson(promptRenderingSpec)),
  });
}
