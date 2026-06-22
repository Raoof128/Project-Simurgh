// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3V-A runner. Offline + deterministic. Builds the external-defence containment bundle,
// writes metadata-only evidence, and re-verifies byte-stable. build/verify compare via stable()
// (format-agnostic). write-hashes runs AFTER prettier. No network, no live inference.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../../tools/simurgh-attestation/canonicalise.mjs";
import {
  buildStage3lCorpus,
  buildStage3lManifest,
} from "./llm_shield_stage3l_fable5_reference_lib.mjs";
import {
  recordedFixtureObservations,
  recordedRawOutputs,
  ADAPTER_CONFIG,
  buildExternalDefenseManifest,
} from "../../tools/external-defense-adapters/recordedFixtureExternalDefenseAdapter.mjs";
import { harnessComputeHashes } from "../../tools/external-defense-adapters/harnessHashExternalOutput.mjs";
import {
  computeExternalMetrics,
  computeContainmentMetrics,
  computeComparativeMetrics,
} from "./llm_shield_stage3v_metrics_lib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3v";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

const LIMITATIONS = [
  "recorded_fixture_not_live_external_defence",
  "synthetic_reference_set_only",
  "not_a_general_accuracy_benchmark",
  "advisory_signal_is_observational_only",
];
const NON_CLAIMS = [
  "external_defence_not_claimed_unsafe_or_inferior",
  "no_vendor_ranking",
  "not_jailbreak_proof",
  "signed_evidence_is_not_ground_truth",
  "no_live_defence_was_exercised",
];

export function deriveForVerify() {
  const corpus = buildStage3lCorpus();
  const observations = recordedFixtureObservations();
  const raw = recordedRawOutputs();
  const externalDefenseManifest = buildExternalDefenseManifest(observations);
  // Concatenate raw outputs deterministically (sorted by case) for one harness hash over the
  // whole recorded set. Raw text is hashed here only; it is NEVER written to evidence.
  const rawConcat = Object.keys(raw)
    .sort()
    .map((k) => raw[k])
    .join("\n");
  const gatewayHashes = harnessComputeHashes({
    rawOutput: rawConcat,
    normalisedVerdict: observations.map((o) => ({
      case_id: o.case_id,
      verdict: o.normalised_verdict,
    })),
    adapterConfig: ADAPTER_CONFIG,
    externalDefenseManifest,
  });
  // Amendment 1: the Stage 3L corpus manifest hash is separate from the external-defence
  // manifest hash, so reviewers can see exactly what each hash binds.
  const stage3lCorpusManifest = buildStage3lManifest(corpus);
  const stage3lCorpusManifestHash = sha256Hex(canonicalJson(stage3lCorpusManifest));
  const externalMetrics = computeExternalMetrics(observations);
  const containmentMetrics = computeContainmentMetrics(corpus, observations);
  const comparativeMetrics = computeComparativeMetrics(corpus, observations);
  return {
    corpus,
    observations,
    externalDefenseManifest,
    gatewayHashes,
    stage3lCorpusManifestHash,
    externalMetrics,
    containmentMetrics,
    comparativeMetrics,
  };
}

export function buildExternalDefenseBundle() {
  const d = deriveForVerify();
  return {
    type: "simurgh.vca.external_defense_run.v1",
    stage: "3V-A",
    target_defense: {
      name: "recorded_fixture",
      mode: "recorded_fixture",
      fixture_provenance: "synthetic_deterministic",
      adapter: "recordedFixtureExternalDefenseAdapter",
      adapter_config_hash: d.gatewayHashes.adapter_config_hash,
      live: false,
    },
    run_set: {
      source: "stage-3l",
      stage3l_corpus_manifest_hash: d.stage3lCorpusManifestHash,
      counts: { total: d.corpus.length },
    },
    adapter_contract: { schema: "simurgh.external_defense_adapter.v1" },
    gateway_computed_hashes: d.gatewayHashes,
    metrics: { external: d.externalMetrics, comparative: d.comparativeMetrics },
    containment_summary: d.containmentMetrics,
    privacy: { metadata_only: true },
    referenced_evidence: [
      {
        stage: "3L",
        external_defense_manifest_hash: d.gatewayHashes.external_defense_manifest_hash,
      },
    ],
    non_claims: NON_CLAIMS,
    limitations: LIMITATIONS,
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
      await writeFile(join(EV, "adapter-digests.json"), stable(d.gatewayHashes));
      await writeFile(join(EV, "referenced-evidence.json"), stable(bundle.referenced_evidence));
      await writeFile(
        join(EV, "privacy-report.json"),
        stable({ metadata_only: true, raw_output_in_evidence: false })
      );
      await writeFile(join(EV, "attestation.bundle.json"), stable(bundle));
      console.log("stage3v: evidence written (update; run prettier then write-hashes)");
      return;
    }
    if (stable(await rd("attestation.bundle.json")) !== stable(bundle))
      throw new Error("bundle drifted");
    console.log("stage3v evidence: verified committed");
  } else if (cmd === "hash") {
    console.log(
      JSON.stringify(
        { ...d.gatewayHashes, stage3l_corpus_manifest_hash: d.stage3lCorpusManifestHash },
        null,
        2
      )
    );
  } else if (cmd === "verify") {
    if (stable(await rd("attestation.bundle.json")) !== stable(bundle))
      throw new Error("bundle reproduction mismatch");
    console.log("stage3v: bundle reproduces");
  } else if (cmd === "write-hashes") {
    await writeEvidenceHashes();
    console.log("stage3v: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map))
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    console.log("stage3v: evidence hashes match");
  } else {
    console.error("usage: runner build [--update] | hash | verify | write-hashes | verify-hashes");
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3v runner:", e.message);
    process.exit(1);
  });
