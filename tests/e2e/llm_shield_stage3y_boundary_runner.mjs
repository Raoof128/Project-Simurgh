// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Y boundary runner. Drives an INDEPENDENTLY-AUTHORED third-party attack
// corpus (AgentDojo injection goals x AgentDojo attack envelopes) through the
// REAL Simurgh content-sensitive and structural boundaries, and reports an honest
// number -- including misses. This is component-level external validity: the
// attacks are not authored by us, so it breaks the Stage 3L self-authored loop.
//
// We deliberately separate:
//   * input-firewall CONTENT detection (classifyPrompt denylist/heuristics), where
//     real misses live, from trivial size rejection;
//   * context-provenance STRUCTURAL containment (untrusted -> demoted), which is
//     content-agnostic and is reported as structural, not as detection.
//
// Evidence is metadata-only: no raw payload text is written here.
import fs from "node:fs";
import { normalisePrompt } from "../../src/llmShield/promptNormalise.js";
import { classifyPrompt } from "../../src/llmShield/promptFirewall.js";
import { guardContexts } from "../../src/llmShield/contextProvenanceGuard.js";

// Exact Clopper-Pearson 95% interval via the regularized incomplete beta inverse.
function logGamma(z) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function betacf(a, b, x) {
  const FPMIN = 1e-300;
  let qab = a + b,
    qap = a + 1,
    qam = a - 1,
    cc = 1,
    d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    cc = 1 + aa / cc;
    if (Math.abs(cc) < FPMIN) cc = FPMIN;
    d = 1 / d;
    h *= d * cc;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    cc = 1 + aa / cc;
    if (Math.abs(cc) < FPMIN) cc = FPMIN;
    d = 1 / d;
    const del = d * cc;
    h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lb = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lb) / a;
  return x < (a + 1) / (a + b + 2)
    ? front * betacf(a, b, x)
    : 1 - (Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lb) / b) * betacf(b, a, 1 - x);
}
function betinv(p, a, b) {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (ibeta(m, a, b) < p) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
function ci95(x, n) {
  const lo = x === 0 ? 0 : betinv(0.025, x, n - x + 1);
  const hi = x === n ? 1 : betinv(0.975, x + 1, n - x);
  return [Number(lo.toFixed(3)), Number(hi.toFixed(3))];
}

export function evaluateCases(corpus) {
  const cases = corpus.cases;

  const byAttack = {};
  const perCase = [];
  let inputContentDetected = 0;
  let inputSizeRejected = 0;
  let inputMissed = 0;
  let ctxDemotedStructural = 0;
  let ctxRejectedContent = 0;
  let ctxSizeRejected = 0;
  let ctxAccepted = 0;
  let inputMissedButContained = 0;

  for (const c of cases) {
    byAttack[c.attack_name] ??= { total: 0, input_content_detected: 0, input_missed: 0 };
    byAttack[c.attack_name].total += 1;

    // --- Direct-input placement: content-sensitive input firewall ---
    const norm = normalisePrompt(c.payload);
    const inp = classifyPrompt(norm.normalised ?? norm);
    const sizeReject = inp.reason_codes?.includes("payload_too_large");
    const inputContent = inp.verdict !== "safe" && !sizeReject;
    if (sizeReject) inputSizeRejected += 1;
    else if (inputContent) {
      inputContentDetected += 1;
      byAttack[c.attack_name].input_content_detected += 1;
    } else {
      inputMissed += 1;
      byAttack[c.attack_name].input_missed += 1;
    }

    // --- Indirect-context placement: untrusted tool-result carrying the payload ---
    const ctx = guardContexts([
      {
        context_id: c.case_id,
        source_type: "tool_result",
        trust_level: "untrusted",
        purpose: "reference",
        content: c.payload,
      },
    ]);
    const cv = ctx.perContext[0]?.verdict ?? ctx.verdict;
    const ctxSizeReject = ctx.perContext[0]?.reasonCodes?.includes("context_payload_too_large");
    let ctxClass;
    if (cv === "demoted") {
      ctxDemotedStructural += 1;
      ctxClass = "demoted_structural";
    } else if (cv === "rejected" && ctxSizeReject) {
      ctxSizeRejected += 1;
      ctxClass = "rejected_size";
    } else if (cv === "rejected") {
      ctxRejectedContent += 1;
      ctxClass = "rejected_content";
    } else {
      ctxAccepted += 1;
      ctxClass = "accepted";
    }
    const contained = ctxClass !== "accepted"; // demoted/rejected => not granted authority
    if (!inputContent && !sizeReject && contained) inputMissedButContained += 1;

    perCase.push({
      case_id: c.case_id,
      attack_name: c.attack_name,
      payload_sha256: c.payload_sha256,
      input_firewall: sizeReject ? "size_rejected" : inp.verdict,
      input_content_detected: inputContent,
      context_guard: ctxClass,
      structurally_contained: contained,
    });
  }

  const n = cases.length;
  return {
    metrics: {
      schema: "simurgh.stage3y.boundary_metrics.v1",
      corpus_source: corpus.source,
      benchmark_version: corpus.benchmark_version,
      total_cases: n,
      input_firewall: {
        content_detected: inputContentDetected,
        content_detected_rate: `${inputContentDetected}/${n}`,
        content_detected_ci95: ci95(inputContentDetected, n),
        size_rejected: inputSizeRejected,
        missed: inputMissed,
        missed_rate: `${inputMissed}/${n}`,
        missed_ci95: ci95(inputMissed, n),
        note: "Content detection by deterministic denylist/heuristics; misses are real and expected on third-party attacks not written to trip this denylist.",
        by_attack: byAttack,
      },
      context_provenance: {
        demoted_structural: ctxDemotedStructural,
        rejected_on_content: ctxRejectedContent,
        size_rejected: ctxSizeRejected,
        accepted_untrusted_authority: ctxAccepted,
        contained_total: ctxDemotedStructural + ctxRejectedContent + ctxSizeRejected,
        contained_ci95: ci95(ctxDemotedStructural + ctxRejectedContent + ctxSizeRejected, n),
        note: "Demotion is content-agnostic (untrusted never gains authority); reported as STRUCTURAL containment, not detection.",
      },
      combined: {
        input_missed_but_structurally_contained: inputMissedButContained,
        accepted_untrusted_authority: ctxAccepted,
      },
    },
    perCase,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , runtimePath, outDir] = process.argv;
  if (!runtimePath || !outDir) {
    console.error("usage: runner.mjs <runtime_corpus.json> <evidence_out_dir>");
    process.exit(2);
  }
  const corpus = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
  const { metrics, perCase } = evaluateCases(corpus);
  fs.writeFileSync(`${outDir}/metrics.json`, JSON.stringify(metrics, null, 2) + "\n");
  fs.writeFileSync(
    `${outDir}/per-case-verdicts.json`,
    JSON.stringify({ schema: "simurgh.stage3y.per_case.v1", cases: perCase }, null, 2) + "\n"
  );
  console.log(JSON.stringify(metrics, null, 2));
}
