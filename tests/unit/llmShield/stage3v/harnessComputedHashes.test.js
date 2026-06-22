// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  harnessComputeHashes,
  assertNoAdapterSuppliedHash,
} from "../../../../tools/external-defense-adapters/harnessHashExternalOutput.mjs";
import { sha256Hex, canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

const input = () => ({
  rawOutput: "[REDACTED-SYNTHETIC] recorded external classifier output",
  normalisedVerdict: "allow",
  adapterConfig: { target: "recorded_fixture", version: "fixture-1" },
  externalDefenseManifest: { source: "stage-3l", count: 180 },
});

test("computes all four hashes, sha256-prefixed, from harness side", () => {
  const h = harnessComputeHashes(input());
  for (const k of [
    "external_raw_output_hash",
    "external_normalised_verdict_hash",
    "adapter_config_hash",
    "external_defense_manifest_hash",
  ])
    assert.match(h[k], /^sha256:[0-9a-f]{64}$/);
});
test("hashes match canonical recomputation (no double prefix)", () => {
  const i = input();
  const h = harnessComputeHashes(i);
  assert.equal(h.external_raw_output_hash, sha256Hex(i.rawOutput));
  assert.equal(h.adapter_config_hash, sha256Hex(canonicalJson(i.adapterConfig)));
  assert.equal(
    h.external_defense_manifest_hash,
    sha256Hex(canonicalJson(i.externalDefenseManifest))
  );
});
test("deterministic", () => {
  assert.deepEqual(harnessComputeHashes(input()), harnessComputeHashes(input()));
});
test("assertNoAdapterSuppliedHash throws on any hash/digest key (branch)", () => {
  assert.throws(
    () => assertNoAdapterSuppliedHash({ external_raw_output_hash: "x" }),
    /adapter_supplied_hash_forbidden/
  );
  assert.throws(
    () => assertNoAdapterSuppliedHash({ Digest: "x" }),
    /adapter_supplied_hash_forbidden/
  );
  assert.doesNotThrow(() => assertNoAdapterSuppliedHash({ verdict: "allow" }));
  assert.doesNotThrow(() => assertNoAdapterSuppliedHash(null));
});
