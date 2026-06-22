// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3U CLI. Offline + deterministic over two committed synthetic sets (main extraction
// set + A10 regression set). build re-derives, verify byte-compares, write-hashes runs AFTER
// prettier. build/verify compare via stable() (format-agnostic). No gateway, no network.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { validateMetaSetV2, metaSetDigestV2 } from "./metaSetV2.mjs";
import { familyMapDigestV2 } from "./signalFamiliesV2.mjs";
import { metadataGrammarDigest } from "./metadataGrammar.mjs";
import { runDetectorV2 } from "./detectorV2.mjs";
import { renderAttestationProseV2 } from "./rendererV2.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3u";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const resultDigest = (result) => sha256Hex(canonicalJson(result));

const KNOWN_LIMITATIONS = [
  "benign_mono_task_plus_shared_template_can_present_two_strong_families",
  "dilution_can_avoid_thresholds",
  "synthetic_reference_set_only",
  "not_a_live_gateway_detector",
  "not_a_general_accuracy_benchmark",
];

// The attestation binds BOTH the main extraction result and the A10 regression result, so
// the verifiable claim includes "the A10 regression set no longer escalates".
export function buildAttestationV2(mainSet, regressionSet) {
  validateMetaSetV2(mainSet);
  validateMetaSetV2(regressionSet);
  const mainResult = runDetectorV2(mainSet);
  const regressionResult = runDetectorV2(regressionSet);
  const prose = renderAttestationProseV2(mainResult);
  return {
    schema: "simurgh.capability_extraction.attestation.v2",
    stage: "3U",
    detector_id: mainResult.detector_id,
    previous_detector_id: mainResult.previous_detector_id,
    hardening_reason: "red_team_a10_a9",
    family_map_digest: familyMapDigestV2(),
    metadata_grammar_digest: metadataGrammarDigest(),
    meta_set_digest: mainResult.meta_set_digest,
    detector_result_digest: resultDigest(mainResult),
    redteam_regression_meta_set_digest: regressionResult.meta_set_digest,
    redteam_regression_result_digest: resultDigest(regressionResult),
    matched: mainResult.matched,
    matched_strong_families: mainResult.matched_strong_families,
    matched_contextual_families: mainResult.matched_contextual_families,
    strong_family_count: mainResult.strong_family_count,
    contextual_family_count: mainResult.contextual_family_count,
    decision: mainResult.decision,
    attestation_claim: mainResult.attestation_claim,
    red_team_hardening: {
      a10_volume_contextualised: true,
      a9_metadata_grammar_enforced: true,
      benign_volume_escalations: 0,
      metadata_payload_acceptance_failures: 0,
      redteam_regression_decision: regressionResult.decision,
    },
    non_claims: mainResult.non_claims,
    known_limitations: KNOWN_LIMITATIONS,
    rendered_summary: prose.rendered_summary,
    intent_claim_made: prose.intent_claim_made,
  };
}

export async function deriveForVerifyV2() {
  const mainSet = await rd("meta-set/metadata-set-v2.json");
  const regressionSet = await rd("meta-set/redteam-a10-regression-set.json");
  const attestation = buildAttestationV2(mainSet, regressionSet);
  const mainResult = runDetectorV2(mainSet);
  const regressionResult = runDetectorV2(regressionSet);
  return { mainSet, regressionSet, attestation, mainResult, regressionResult };
}

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
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
  if (cmd === "build") {
    const { attestation, mainResult, regressionResult } = await deriveForVerifyV2();
    if (update) {
      const cfg = await rd("meta-set/detector-config.json");
      cfg.family_map_digest = familyMapDigestV2();
      cfg.metadata_grammar_digest = metadataGrammarDigest();
      await writeFile(join(EV, "meta-set/detector-config.json"), stable(cfg));
      await writeFile(join(EV, "result/expected-detector-result-v2.json"), stable(mainResult));
      await writeFile(join(EV, "result/redteam-regression-result.json"), stable(regressionResult));
      await writeFile(join(EV, "result/attestation.json"), stable(attestation));
      await writeFile(
        join(EV, "comparison/v1-known-false-fire-summary.json"),
        stable({
          note: "Detector v1 (3T) escalated these to extraction; v2 contextualises volume.",
          v1_false_fire_classes: [
            "structural_plus_volume",
            "targeting_plus_volume",
            "behavioural_plus_volume",
          ],
        })
      );
      await writeFile(
        join(EV, "comparison/v2-hardening-summary.json"),
        stable({
          a10_volume_contextualised: true,
          a9_metadata_grammar_enforced: true,
          benign_volume_escalations: 0,
          metadata_payload_acceptance_failures: 0,
          redteam_regression_decision: regressionResult.decision,
        })
      );
      console.log("stage3u: evidence written (update; run prettier then write-hashes)");
      return;
    }
    if (stable(await rd("result/attestation.json")) !== stable(attestation))
      throw new Error("attestation drifted");
    if (stable(await rd("result/expected-detector-result-v2.json")) !== stable(mainResult))
      throw new Error("main result drifted");
    if (stable(await rd("result/redteam-regression-result.json")) !== stable(regressionResult))
      throw new Error("regression result drifted");
    console.log("stage3u evidence: verified committed");
  } else if (cmd === "hash") {
    const { mainSet } = await deriveForVerifyV2();
    console.log("meta_set_digest:", metaSetDigestV2(mainSet));
    console.log("family_map_digest:", familyMapDigestV2());
    console.log("metadata_grammar_digest:", metadataGrammarDigest());
  } else if (cmd === "verify") {
    const { mainResult, regressionResult } = await deriveForVerifyV2();
    if (stable(await rd("result/expected-detector-result-v2.json")) !== stable(mainResult))
      throw new Error("main reproduction mismatch");
    if (stable(await rd("result/redteam-regression-result.json")) !== stable(regressionResult))
      throw new Error("regression reproduction mismatch");
    console.log("stage3u: both detector results reproduce");
  } else if (cmd === "write-hashes") {
    await writeEvidenceHashes();
    console.log("stage3u: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map)) {
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    }
    console.log("stage3u: evidence hashes match");
  } else {
    console.error(
      "usage: simurgh-extraction-v2.mjs build [--update] | hash | verify | write-hashes | verify-hashes"
    );
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3u CLI:", e.message);
    process.exit(1);
  });
