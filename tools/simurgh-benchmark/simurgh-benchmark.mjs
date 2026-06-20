// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3O BYO-gateway benchmark CLI. Drives a target adapter over the frozen
// canary corpus and scores by dual signal. In-process module targets are
// deterministic (CI); --target <url> performs HTTP POST /run (opt-in, not CI).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { buildCorpus, buildCorpusManifest, enforceCorpusValidity } from "./corpus.mjs";
import {
  scoreCase,
  aggregateMetrics,
  runScoringMatrix,
  computeEvidenceLeakageFindings,
} from "./byoContractLib.mjs";
import clean from "./reference-targets/clean.mjs";
import liar from "./reference-targets/liar.mjs";
import leaker from "./reference-targets/leaker.mjs";
import overdefender from "./reference-targets/overdefender.mjs";
import invalid from "./reference-targets/invalid.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3o";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

export async function runBenchmark(target, corpus) {
  const scored = [];
  for (const kase of corpus) {
    let resp;
    try {
      resp = await target(kase);
    } catch {
      resp = { decision: "error" };
    }
    const s = scoreCase(resp, kase);
    scored.push({
      case_id: kase.case_id,
      class: kase.class,
      outcome: s.outcome,
      self_reported_contained: s.self_reported_contained,
      observed_goal_leaked: s.observed_goal_leaked,
    });
  }
  return { scored, metrics: aggregateMetrics(scored) };
}

async function loadTarget(spec) {
  if (spec.startsWith("http://") || spec.startsWith("https://")) {
    return async (kase) => {
      const res = await fetch(spec, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schema: "simurgh.byo.run_request.v1",
          case_id: kase.case_id,
          user_task: kase.user_task,
          contexts: kase.contexts,
          available_actions: kase.available_actions,
        }),
      });
      return res.json();
    };
  }
  const mod = await import(resolve(spec));
  return mod.default;
}

// Generation subset (review fix 4): NEVER asserts signature_valid — only the
// verifier may claim that. Throws on any generation-time failure.
export async function buildEvidence() {
  const corpus = buildCorpus();
  const cv = enforceCorpusValidity(corpus);
  if (!cv.ok) throw new Error("corpus invalid: " + cv.errors.join("; "));
  const manifest = buildCorpusManifest(corpus);

  const cleanRun = await runBenchmark(clean, corpus);
  const referenceResults = {
    schema: "simurgh.byo.reference_results.v1",
    metrics: cleanRun.metrics,
  };

  const selfProof = {
    schema: "simurgh.byo.self_proof.v1",
    liar: (await runBenchmark(liar, corpus)).metrics.claim_conflict,
    leaker: (await runBenchmark(leaker, corpus)).metrics.containment_failure,
    overdefender: (await runBenchmark(overdefender, corpus)).metrics.overdefence,
    invalid: (await runBenchmark(invalid, corpus)).metrics.invalid_or_error,
  };

  const matrix = runScoringMatrix();
  const scoringMatrix = {
    schema: "simurgh.byo.scoring_matrix.v1",
    cells_covered: matrix.cells_covered,
    fixtures: matrix.fixtures,
  };

  const artifacts = {
    "corpus-manifest.json": manifest,
    "reference-target-results.json": referenceResults,
    "self-proof-results.json": selfProof,
    "scoring-matrix-results.json": scoringMatrix,
  };

  // Generation-time assertions (no signature claim).
  const errors = [];
  const m = cleanRun.metrics;
  if (
    !(
      m.confirmed_contained === 120 &&
      m.overdefence === 0 &&
      m.claim_conflict === 0 &&
      m.invalid_or_error === 0
    )
  )
    errors.push("clean reference target did not sweep clean");
  if (selfProof.liar < 1) errors.push("liar did not fire claim_conflict");
  if (selfProof.leaker < 1) errors.push("leaker did not fire containment_failure");
  if (selfProof.overdefender < 1) errors.push("overdefender did not fire overdefence");
  if (selfProof.invalid < 1) errors.push("invalid did not fire invalid_or_error");
  if (matrix.cells_covered !== 11) errors.push(`scoring matrix ${matrix.cells_covered}/11`);
  const leak = computeEvidenceLeakageFindings(
    Object.entries(artifacts).map(([n, v]) => [n, stable(v)])
  );
  if (leak.length > 0) errors.push("generated evidence leakage: " + JSON.stringify(leak));
  if (errors.length > 0) throw new Error("stage3o generation gate FAIL:\n" + errors.join("\n"));

  return { artifacts, leak };
}

async function evidenceMain(update) {
  const { artifacts, leak } = await buildEvidence();
  const hashTargets = {
    ...Object.fromEntries(Object.entries(artifacts).map(([n, v]) => [n, stable(v)])),
  };
  const privacy = {
    schema: "simurgh.byo.privacy.v1",
    forbidden_token_findings: leak,
    generated_evidence_leakage: leak.length,
  };

  if (update) {
    for (const [name, value] of Object.entries(artifacts)) {
      await mkdir(dirname(join(EV, name)), { recursive: true });
      await writeFile(join(EV, name), stable(value));
    }
    await writeFile(join(EV, "generated-evidence-privacy-report.json"), stable(privacy));
    await writeFile(join(EV, "runner-output.txt"), "stage3o evidence: PASS (generation gates)\n");
    // Hashes are written by the explicit `hash` step AFTER signing (review fix 6),
    // so the full pack incl. attestation + signature is covered. Maintainer flow:
    //   evidence --update  ->  sign-byo-attestation  ->  hash
    console.log(
      "stage3o evidence: updated (run sign-byo-attestation then `hash` to refresh hashes)"
    );
    return;
  }
  for (const [name, value] of Object.entries(artifacts)) {
    const committed = JSON.parse(await readFile(join(EV, name), "utf8"));
    if (stable(committed) !== stable(value))
      throw new Error(`committed ${name} drifted; run evidence --update`);
  }
  const committedPrivacy = JSON.parse(
    await readFile(join(EV, "generated-evidence-privacy-report.json"), "utf8")
  );
  if (stable(committedPrivacy) !== stable(privacy))
    throw new Error(
      "committed generated-evidence-privacy-report.json drifted; run evidence --update"
    );
  console.log("stage3o evidence: verified committed");
  void hashTargets;
}

// Review fix 6: hash the full committed 3O pack.
const HASH_FILES = [
  "corpus-manifest.json",
  "reference-target-results.json",
  "self-proof-results.json",
  "scoring-matrix-results.json",
  "containment-attestation.json",
  "containment-attestation.signature.json",
  "generated-evidence-privacy-report.json",
  "runner-output.txt",
];

export async function rewriteHashes() {
  const hashes = {};
  for (const name of HASH_FILES) {
    try {
      hashes[name] = sha(await readFile(join(EV, name), "utf8"));
    } catch {
      hashes[name] = null; // attestation may not exist yet on first generation pass
    }
  }
  await writeFile(
    join(EV, "evidence-hashes.json"),
    stable({ schema: "simurgh.byo.hashes.v1", hashes })
  );
}

export async function verifyHashes() {
  const committed = JSON.parse(await readFile(join(EV, "evidence-hashes.json"), "utf8"));
  for (const name of HASH_FILES) {
    const actual = sha(await readFile(join(EV, name), "utf8"));
    if (committed.hashes[name] !== actual) throw new Error(`evidence hash mismatch: ${name}`);
  }
  return true;
}

async function mainCli() {
  const sub = process.argv[2];
  if (sub === "evidence") {
    await evidenceMain(process.argv.includes("--update"));
    return;
  }
  if (sub === "hash") {
    await rewriteHashes();
    console.log("stage3o: rewrote evidence-hashes.json");
    return;
  }
  if (sub === "verify-hashes") {
    await verifyHashes();
    console.log("stage3o: evidence hashes match");
    return;
  }
  // default: run
  const args = process.argv;
  const target = args[args.indexOf("--target") + 1];
  const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
  const isExternal = target.startsWith("http");
  const { scored, metrics } = await runBenchmark(await loadTarget(target), buildCorpus());
  const result = {
    schema: "simurgh.byo.run_result_set.v1",
    target_type: isExternal ? "external_byo_gateway" : "in_process_reference",
    metrics,
    result: isExternal ? "measured_not_certified" : "reference",
    scored,
  };
  if (out) await writeFile(out, stable(result));
  console.log(
    `stage3o benchmark: ${metrics.claim_conflict_rate} claim_conflict, ${metrics.observed_goal_leak_rate} leak`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mainCli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
