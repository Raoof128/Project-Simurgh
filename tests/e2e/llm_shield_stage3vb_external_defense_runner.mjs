// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3V-B runner. Offline + deterministic. Reads the committed frozen-capture replay artifact,
// normalises LG4 grammar, computes seven harness hashes, builds the external-defence containment
// bundle (stage 3V-B), writes metadata-only evidence, and re-verifies byte-stable. The model is
// NOT executed here; CI replays the frozen capture. build/verify compare via stable().
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../../tools/simurgh-attestation/canonicalise.mjs";
import {
  buildStage3lCorpus,
  buildStage3lManifest,
} from "./llm_shield_stage3l_fable5_reference_lib.mjs";
import {
  ADAPTER_CONFIG,
  frozenCaptureObservations,
  buildExternalDefenseManifest,
  renderLlamaGuard4PromptSpec,
  assertCaptureIntegrity,
} from "../../tools/external-defense-adapters/llamaGuard4Adapter.mjs";
import { harnessComputeStage3vbHashes } from "../../tools/external-defense-adapters/captureProvenanceHashes.mjs";
import {
  computeExternalMetrics,
  computeContainmentMetrics,
  computeComparativeMetrics,
} from "./llm_shield_stage3v_metrics_lib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3v-b";
const REPLAY = join(EV, "capture-replay", "lg4-frozen-capture.json");
const CAPTURE_SCRIPT = "tools/capture/stage3vb_llama_guard4_capture.py";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

const KNOWN_LIMITATIONS = [
  "live_capture_origin_self_reported",
  "input_only_surface_cannot_see_downstream_injection",
  "not_a_general_accuracy_benchmark",
  "advisory_signal_is_observational_only",
];
const NON_CLAIMS = [
  "external_defence_not_claimed_unsafe_or_inferior",
  "no_vendor_ranking",
  "not_jailbreak_proof",
  "signed_evidence_is_not_ground_truth",
  "model_not_reexecuted_in_ci",
];

export function loadCapture() {
  return JSON.parse(readFileSync(REPLAY, "utf8"));
}

export function deriveForVerify() {
  const corpus = buildStage3lCorpus();
  const capture = loadCapture();
  assertCaptureIntegrity(capture, corpus);
  const observations = frozenCaptureObservations(capture);
  const externalDefenseManifest = buildExternalDefenseManifest(observations);
  const rawConcat = capture.cases
    .slice()
    .sort((a, b) => a.case_id.localeCompare(b.case_id))
    .map((c) => c.raw_lg4_output)
    .join("\n");
  const promptRenderingSpec = renderLlamaGuard4PromptSpec();
  const inputManifest = {
    surface: "user_task",
    cases: corpus
      .map((fx) => ({ case_id: fx.case_id, user_task_sha256: sha256Hex(fx.user_task) }))
      .sort((a, b) => a.case_id.localeCompare(b.case_id)),
  };
  const inputManifestHash = sha256Hex(canonicalJson(inputManifest));
  const captureScriptText = readFileSync(CAPTURE_SCRIPT, "utf8");
  const gatewayHashes = harnessComputeStage3vbHashes({
    rawOutputsConcat: rawConcat,
    normalisedVerdict: observations.map((o) => ({
      case_id: o.case_id,
      verdict: o.normalised_verdict,
    })),
    adapterConfig: ADAPTER_CONFIG,
    captureProvenance: capture.capture_provenance,
    captureFileObject: capture,
    captureScriptText,
    promptRenderingSpec,
  });
  const stage3lCorpusManifestHash = sha256Hex(canonicalJson(buildStage3lManifest(corpus)));
  return {
    corpus,
    capture,
    observations,
    externalDefenseManifest,
    inputManifest,
    inputManifestHash,
    gatewayHashes,
    stage3lCorpusManifestHash,
    externalMetrics: computeExternalMetrics(observations),
    containmentMetrics: computeContainmentMetrics(corpus, observations),
    comparativeMetrics: computeComparativeMetrics(corpus, observations),
  };
}

export function buildCaptureSummary(d = deriveForVerify()) {
  const byMode = {};
  for (const fx of d.corpus) byMode[fx.case_mode] = (byMode[fx.case_mode] ?? 0) + 1;
  return {
    schema: "simurgh.stage3vb.capture_summary.v1",
    total_cases: d.corpus.length,
    input_miss_downstream: byMode.input_miss_downstream ?? 0,
    direct_input_attack: byMode.direct_input_attack ?? 0,
    benign: byMode.benign_hard_negative ?? 0,
    lg4_allow: d.externalMetrics.external_allow_rate,
    lg4_block: d.externalMetrics.external_block_rate,
    lg4_warn: d.externalMetrics.external_warn_rate,
    lg4_abstain: d.externalMetrics.external_abstain_rate,
    lg4_error: d.externalMetrics.external_error_rate,
    external_miss_but_contained: d.containmentMetrics.external_miss_but_contained_rate,
    external_plus_simurgh_targeted_asr: d.comparativeMetrics.external_plus_simurgh_targeted_asr,
    model_reexecuted_in_ci: false,
  };
}

export function buildExternalDefenseBundle() {
  const d = deriveForVerify();
  return {
    type: "simurgh.vca.external_defense_run.v1",
    stage: "3V-B",
    capture_mode: "live_capture_frozen_replay",
    model_reexecuted_in_ci: false,
    target_defense: {
      name: "llama_guard_4",
      model_id: ADAPTER_CONFIG.model_id,
      surface: ADAPTER_CONFIG.surface,
      adapter: "llamaGuard4Adapter",
      adapter_config_hash: d.gatewayHashes.adapter_config_hash,
      live: d.capture.live === true,
      decode: ADAPTER_CONFIG.decode,
    },
    run_set: {
      source: "stage-3l",
      stage3l_corpus_manifest_hash: d.stage3lCorpusManifestHash,
      input_surface: "user_task",
      input_cases: d.corpus.length,
      input_manifest_hash: d.inputManifestHash,
      counts: { total: d.corpus.length },
    },
    capture_provenance: d.capture.capture_provenance,
    adapter_contract: { schema: "simurgh.external_defense_adapter.v1" },
    gateway_computed_hashes: d.gatewayHashes,
    metrics: { external: d.externalMetrics, comparative: d.comparativeMetrics },
    containment_summary: d.containmentMetrics,
    privacy: { metadata_only: true },
    referenced_evidence: [
      {
        stage: "3L",
        external_defense_manifest_hash: sha256Hex(canonicalJson(d.externalDefenseManifest)),
      },
    ],
    non_claims: NON_CLAIMS,
    known_limitations: KNOWN_LIMITATIONS,
    modes: ["simurgh_reference", "external_observed", "external_plus_simurgh", "tamper_negative"],
  };
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile() && !p.endsWith("evidence-hashes.json")) out.push(p);
  }
  return out;
}
async function writeEvidenceHashes() {
  const files = (await walk(EV)).sort();
  const map = {};
  for (const f of files) map[f] = sha256Hex(await readFile(f, "utf8"));
  await writeFile(join(EV, "evidence-hashes.json"), stable(map));
}

async function main() {
  const cmd = process.argv[2];
  const update = process.argv.includes("--update");
  const d = deriveForVerify();
  const bundle = buildExternalDefenseBundle();
  if (cmd === "build") {
    if (update) {
      await writeFile(
        join(EV, "external-observations.json"),
        stable({ observations: d.observations })
      );
      await writeFile(
        join(EV, "metrics.json"),
        stable({ external: d.externalMetrics, comparative: d.comparativeMetrics })
      );
      await writeFile(join(EV, "containment-summary.json"), stable(d.containmentMetrics));
      await writeFile(join(EV, "corpus-manifest.json"), stable(d.externalDefenseManifest));
      await writeFile(join(EV, "input-manifest.json"), stable(d.inputManifest));
      await writeFile(
        join(EV, "adapter-digests.json"),
        stable({ ...d.gatewayHashes, stage3l_corpus_manifest_hash: d.stage3lCorpusManifestHash })
      );
      await writeFile(join(EV, "referenced-evidence.json"), stable(bundle.referenced_evidence));
      await writeFile(
        join(EV, "privacy-report.json"),
        stable({
          metadata_only: true,
          raw_output_in_evidence: false,
          raw_prompts_in_evidence: false,
        })
      );
      await writeFile(join(EV, "capture-summary.json"), stable(buildCaptureSummary(d)));
      await writeFile(join(EV, "attestation.bundle.json"), stable(bundle));
      console.log("stage3vb: evidence written (update; run prettier then write-hashes)");
      return;
    }
    if (stable(await rd("attestation.bundle.json")) !== stable(bundle))
      throw new Error("bundle drifted");
    console.log("stage3vb evidence: verified committed");
  } else if (cmd === "hash") {
    console.log(
      JSON.stringify(
        {
          ...d.gatewayHashes,
          stage3l_corpus_manifest_hash: d.stage3lCorpusManifestHash,
          input_manifest_hash: d.inputManifestHash,
        },
        null,
        2
      )
    );
  } else if (cmd === "verify") {
    if (stable(await rd("attestation.bundle.json")) !== stable(bundle))
      throw new Error("bundle reproduction mismatch");
    console.log("stage3vb: bundle reproduces");
  } else if (cmd === "write-hashes") {
    await writeEvidenceHashes();
    console.log("stage3vb: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map))
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    console.log("stage3vb: evidence hashes match");
  } else {
    console.error("usage: runner build [--update] | hash | verify | write-hashes | verify-hashes");
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3vb runner:", e.message);
    process.exit(1);
  });
