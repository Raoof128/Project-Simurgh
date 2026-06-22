// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic recorded-fixture external-defence adapter. Emits one normalised observation
// per Stage 3L case. It is NOT a live defence: fixture_provenance is synthetic_deterministic.
// Raw outputs come from a committed fixture file and are used ONLY for harness hashing — they
// are never copied into generated evidence (Fix 2).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { buildStage3lCorpus } from "../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";
import { ADAPTER_SCHEMA, validateObservation } from "./externalDefenseAdapterContract.mjs";
import { normaliseExternalVerdict } from "./normaliseExternalVerdict.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(
  readFileSync(join(HERE, "../../tests/fixtures/stage-3v/recorded-external-outputs.json"), "utf8")
);

export const ADAPTER_CONFIG = Object.freeze({
  target: "recorded_fixture",
  fixture_schema: FIXTURE.schema,
  fixture_provenance: "synthetic_deterministic",
  version: "fixture-1",
});

// Deterministic synthetic policy: benign -> allow; direct attacks -> block; input-miss
// malicious -> a fixed allow/warn/block rotation so the external signal has a realistic mix
// (and so external_miss_but_contained is exercised). This is a fixture, not a real defence.
function fixtureLabel(caseId) {
  if (caseId.includes("benign")) return "safe";
  if (caseId.includes("direct_input_attack")) return "unsafe";
  const n = Number(caseId.slice(-3)) || 0;
  return ["safe", "warning", "unsafe"][n % 3]; // input_miss_downstream: mixed
}

function confidence(caseId) {
  return caseId.includes("benign") ? "high" : "low";
}

export function recordedRawOutputs() {
  const out = {};
  for (const fx of buildStage3lCorpus()) {
    const { verdict } = normaliseExternalVerdict(fixtureLabel(fx.case_id));
    out[fx.case_id] = FIXTURE.templates[verdict] ?? FIXTURE.templates.error;
  }
  return out;
}

export function recordedFixtureObservations() {
  return buildStage3lCorpus().map((fx) => {
    const { verdict, error_code } = normaliseExternalVerdict(fixtureLabel(fx.case_id));
    return validateObservation({
      adapter_schema: ADAPTER_SCHEMA,
      target: ADAPTER_CONFIG.target,
      case_id: fx.case_id,
      raw_output_ref: "local-only",
      normalised_verdict: verdict,
      confidence_bucket: confidence(fx.case_id),
      latency_bucket_ms: "0-100",
      error_code,
    });
  });
}

export function buildExternalDefenseManifest(observations) {
  const byVerdict = {};
  for (const o of observations)
    byVerdict[o.normalised_verdict] = (byVerdict[o.normalised_verdict] ?? 0) + 1;
  return {
    schema: "simurgh.stage3v.external_defense_manifest.v1",
    adapter_config: ADAPTER_CONFIG,
    observation_count: observations.length,
    verdict_histogram: byVerdict,
    case_ids: observations.map((o) => o.case_id).sort(),
  };
}

export function externalDefenseManifestDigest(manifest) {
  // sha256Hex already prefixes; canonicalise so key order is irrelevant.
  return sha256Hex(canonicalJson(manifest));
}
