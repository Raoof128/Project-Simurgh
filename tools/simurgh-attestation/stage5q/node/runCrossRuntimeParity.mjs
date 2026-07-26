#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the cross-runtime parity driver (Task 19.5).
//
//   node .../runCrossRuntimeParity.mjs [--write]
//
// Runs the frozen vectors through FOUR evaluators and requires them all to agree:
//
//     Node core        the real core/*.mjs the committed digests are computed by
//     portable         browser/vsr-portable.mjs, the one implementation Node and a browser share
//     Python           python/vsr_parity.py, written from the spec rather than transliterated
//     browser          the same portable module, executed by a real headless browser
//
// THE FIRST EVALUATOR IS WHAT MAKES THE OTHERS MEAN ANYTHING. Three mirrors agreeing with each
// other proves they were written by the same person on the same afternoon; a mirror that agrees
// with two other mirrors while disagreeing with the shipped core is a parity claim over a surface
// nobody uses.
//
// A MISSING BROWSER IS NOT A PASS (gauntlet P1-32). When no browser is available the run emits
// `browser_unavailable`, marks browser parity UNPROVEN, and sets `three_runtime_parity: false`.
// Two-runtime parity is a true, smaller claim. "Parity verified" with one runtime unmeasured is a
// false one, and the receipt refuses to carry it.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { canonicalSourceBytes, sourceSpanDigest } from "../core/sourceDigest.mjs";
import { makeFunctionId, parseFunctionId } from "../core/functionId.mjs";
import { canonicalJson } from "../../canonicalise.mjs";
import { leafHash, merkleRoot } from "../../stage5k/core/merkle.mjs";
import { COMMITMENT_FIELDS, DOMAIN as CLOSURE_DOMAIN } from "../core/closureCommit.mjs";
import { deriveMemberStatus } from "../core/coverageLedger.mjs";
import { obligationId } from "../core/obligations.mjs";
import * as portable from "../browser/vsr-portable.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const OUT = `${E}/parity/cross-runtime-parity.json`;
const VECTORS = "tools/simurgh-attestation/stage5q/python/parity-vectors.json";
const PORTABLE = "tools/simurgh-attestation/stage5q/browser/vsr-portable.mjs";
const PAGE = "tools/simurgh-attestation/stage5q/browser/index.html";

/** Browsers to try, in order. The first one present is used and NAMED in the receipt. */
const BROWSERS = Object.freeze([
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
]);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * The Node CORE evaluator — the real shipped modules, not the portable mirror.
 *
 * Deliberately duplicates the leaf construction from `closureCommit.mjs` rather than calling
 * `commitClosure`, because that function needs a whole closure and this needs one row. The
 * duplication is the thing under test: if it drifts from the real commit path, `leaf-01` stops
 * matching the committed merkle root and the closure gate in the reproduce script fails first.
 */
function evaluateWithCore(vectors) {
  const out = {};
  for (const v of vectors) {
    switch (v.kind) {
      case "source_span_digest":
        out[v.id] = sourceSpanDigest(Buffer.from(v.bytes));
        break;
      case "canonical_source_bytes":
        out[v.id] = [...canonicalSourceBytes(Buffer.from(v.bytes))];
        break;
      case "function_id":
        out[v.id] = makeFunctionId({
          stageId: v.parts.stageId,
          modulePath: v.parts.modulePath,
          symbol: v.parts.symbol,
        });
        break;
      case "parse_function_id": {
        const p = parseFunctionId(v.id_text);
        out[v.id] = { stageId: p.stageId, modulePath: p.modulePath, symbol: p.symbol };
        break;
      }
      case "canonical_json":
        out[v.id] = canonicalJson(v.value);
        break;
      case "closure_leaf": {
        const projected = {};
        for (const field of COMMITMENT_FIELDS) projected[field] = v.row[field];
        const memberDigest = createHash("sha256")
          .update(Buffer.from(CLOSURE_DOMAIN.member, "utf8"))
          .update(Buffer.from([0x00]))
          .update(Buffer.from(JSON.stringify(projected), "utf8"))
          .digest("hex");
        out[v.id] = leafHash({
          leaf_id: v.row.function_id,
          leaf_type: "closure_member",
          subject_digest: `sha256:${memberDigest}`,
        }).toString("hex");
        break;
      }
      case "merkle_root":
        out[v.id] = merkleRoot(v.leaves.map((h) => Buffer.from(h, "hex"))).toString("hex");
        break;
      case "coverage_status": {
        // The core's derivation takes cells keyed by obligation id and a discharge Map. The vector
        // is a flat list, so it is lifted into the core's shape here — the ANSWER is what parity
        // is about, and a mirror that reproduced the core's parameter shape rather than its rule
        // would be testing a calling convention.
        const fn = "5q:parity.mjs:subject";
        const cells = v.cells.map((c) => ({
          obligation_id: obligationId({ functionId: fn, attackClass: c.attack_class }),
          function_id: fn,
          attack_class: c.attack_class,
          applicability: c.applicability,
          omission_reason: c.omission_reason ?? null,
        }));
        const discharges = new Map();
        v.cells.forEach((c, i) => {
          if (!c.discharged) return;
          discharges.set(cells[i].obligation_id, {
            discharge_status: c.discharge_status,
            finding_ids: Array.from({ length: c.finding_count ?? 0 }, (_, k) => `F${k}`),
          });
        });
        out[v.id] = deriveMemberStatus({
          cells,
          discharges,
          delegatesTo: v.delegates_to ?? null,
        }).status;
        break;
      }
      default:
        throw new Error(`unknown vector kind: ${v.kind}`);
    }
  }
  return out;
}

function findBrowser() {
  for (const path of BROWSERS) if (existsSync(path)) return path;
  const which = spawnSync("which", ["chromium", "google-chrome"], { encoding: "utf8" });
  const found = which.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return found || null;
}

/**
 * Run the page in a real headless browser and read the results back out of the dumped DOM.
 *
 * Returns `{ available: false, reason }` rather than throwing when there is no browser: the
 * absence is a RESULT that the receipt must carry, not an error that aborts the run and leaves the
 * other three comparisons unreported.
 */
function evaluateInBrowser(vectorsJson) {
  const binary = findBrowser();
  if (!binary) {
    return { available: false, reason: "browser_unavailable", detail: "no chromium-family binary" };
  }
  const dir = join(tmpdir(), `5q-parity-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "index.html");
  try {
    // The module source and the vectors are INLINED. The page's CSP has no connect-src, so it
    // cannot fetch either — which is the point: a page that could fetch its own vectors could be
    // handed different ones than the other runtimes ran, and the "agreement" would be about
    // different things.
    const html = readFileSync(PAGE, "utf8")
      .replace("`__VSR_PORTABLE__`", JSON.stringify(readFileSync(PORTABLE, "utf8")))
      .replace("`__VSR_VECTORS__`", JSON.stringify(vectorsJson));
    writeFileSync(page, html);

    const res = spawnSync(
      binary,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--allow-file-access-from-files",
        "--virtual-time-budget=15000",
        "--dump-dom",
        `--user-data-dir=${join(dir, "profile")}`,
        `file://${page}`,
      ],
      { encoding: "utf8", timeout: 120_000, maxBuffer: 32 * 1024 * 1024 }
    );

    if (res.status !== 0 || !res.stdout) {
      return {
        available: false,
        reason: "browser_run_failed",
        binary,
        detail: `exit ${res.status}: ${String(res.stderr ?? "").slice(0, 200)}`,
      };
    }
    const match = /<pre id="out">([\s\S]*?)<\/pre>/.exec(res.stdout);
    if (!match) {
      return {
        available: false,
        reason: "browser_run_failed",
        binary,
        detail: "no output element",
      };
    }
    const text = match[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, "&");
    // THE TITLE ELEMENT, not the whole document. The dumped DOM contains the page's own inline
    // script, and that script contains the literal string "VSR-PARITY-FAILED" in the branch that
    // sets it — so a whole-document scan matched on every run, including the successful ones, and
    // reported a browser failure while holding the browser's correct results in its hand. Same
    // mistake as a gate that greps a file for the word it is written to forbid.
    const title = /<title>([^<]*)<\/title>/.exec(res.stdout)?.[1] ?? "";
    if (title !== "VSR-PARITY-OK") {
      return {
        available: false,
        reason: "browser_run_failed",
        binary,
        detail: `title was ${JSON.stringify(title)}; page output: ${text.slice(0, 240)}`,
      };
    }
    try {
      return { available: true, binary, results: JSON.parse(text) };
    } catch (error) {
      return {
        available: false,
        reason: "browser_run_failed",
        binary,
        detail: `unparseable output: ${String(error.message).slice(0, 160)}`,
      };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Compare two result maps by CANONICAL JSON of each value.
 *
 * `JSON.stringify` was the first version and it reported a divergence on `fid-03`: Node emitted
 * `{stageId, modulePath, symbol}` and Python emitted the same three fields sorted. The VALUES were
 * identical. A comparison that is sensitive to key order measures the serialiser, not the result —
 * and reporting that as a cross-runtime divergence would have been a false finding in the artifact
 * whose entire job is to say whether two runtimes agree.
 */
export function disagreements(a, b) {
  const ids = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return ids.filter((id) => canonicalJson(a[id] ?? null) !== canonicalJson(b[id] ?? null));
}

async function main(argv) {
  const vectorsJson = readFileSync(VECTORS, "utf8");
  const doc = JSON.parse(vectorsJson);
  const vectors = doc.vectors;

  const core = evaluateWithCore(vectors);
  const port = await portable.evaluateVectors(vectors);

  const py = spawnSync("python3", [`tools/simurgh-attestation/stage5q/python/vsr_parity.py`], {
    encoding: "utf8",
    timeout: 120_000,
  });
  const pythonAvailable = py.status === 0 && py.stdout.trim().length > 0;
  const python = pythonAvailable ? JSON.parse(py.stdout) : {};

  const browser = evaluateInBrowser(vectorsJson);

  const comparisons = [
    { pair: "core_vs_portable", ran: true, differing: disagreements(core, port) },
    {
      pair: "portable_vs_python",
      ran: pythonAvailable,
      differing: pythonAvailable ? disagreements(port, python) : null,
    },
    {
      pair: "portable_vs_browser",
      ran: browser.available,
      differing: browser.available ? disagreements(port, browser.results) : null,
    },
  ];

  const allRan = comparisons.every((c) => c.ran);
  const allAgree = comparisons.every((c) => c.ran && c.differing.length === 0);

  console.log("Stage 5Q — cross-runtime parity (Task 19.5)");
  console.log(`  vectors                : ${vectors.length}`);
  console.log(`  vectors digest         : ${sha256(Buffer.from(vectorsJson, "utf8"))}`);
  for (const c of comparisons) {
    const verdict = !c.ran ? "NOT RUN" : c.differing.length === 0 ? "agree" : "DIVERGE";
    console.log(`  ${c.pair.padEnd(22)}: ${verdict}`);
    for (const id of c.differing ?? []) {
      console.log(`      ✗ ${id}`);
      console.log(`          a: ${JSON.stringify(port[id] ?? core[id]).slice(0, 110)}`);
      console.log(
        `          b: ${JSON.stringify((c.pair.endsWith("python") ? python : (browser.results ?? core))[id]).slice(0, 110)}`
      );
    }
  }
  console.log(`  python                 : ${pythonAvailable ? "ran" : "UNAVAILABLE"}`);
  console.log(
    `  browser                : ${browser.available ? browser.binary : `UNPROVEN (${browser.reason})`}`
  );
  if (!browser.available) console.log(`      ${browser.detail}`);
  console.log(`\n  THREE-RUNTIME PARITY   : ${allRan && allAgree ? "PROVEN" : "NOT PROVEN"}`);
  if (!allRan) {
    console.log(
      "      A runtime that did not run has not agreed. Two-runtime parity is a true, smaller\n" +
        "      claim; 'parity verified' with one runtime unmeasured is a false one."
    );
  }

  if (argv.includes("--write")) {
    const payload = {
      schema: "simurgh.vsr.cross-runtime-parity.v1",
      note:
        "FOUR evaluators, not three. The Node core is included because three mirrors agreeing " +
        "with each other says nothing about the code that computes the committed digests.",
      vectors_digest: sha256(Buffer.from(vectorsJson, "utf8")),
      vector_count: vectors.length,
      surface: [
        "canonicalSourceBytes / sourceSpanDigest (§2.5)",
        "makeFunctionId / parseFunctionId",
        "canonicalJson",
        "closure member leaf + merkle root (Task 8)",
        "coverage status derivation (Annex A4.3)",
      ],
      excluded_from_the_surface: doc.excluded_from_the_surface,
      runtimes: {
        node_core: { ran: true },
        portable: { ran: true },
        python: {
          ran: pythonAvailable,
          version: pythonAvailable
            ? spawnSync("python3", ["--version"], { encoding: "utf8" }).stdout.trim()
            : null,
        },
        browser: browser.available
          ? { ran: true, binary: browser.binary }
          : { ran: false, reason: browser.reason, detail: browser.detail ?? null },
      },
      comparisons,
      // The single field a reader should look at. It is false whenever a runtime did not run, even
      // if every runtime that DID run agreed perfectly.
      three_runtime_parity: allRan && allAgree,
      browser_parity_proven: browser.available && allAgree,
      results: { node_core: core, portable: port, python, browser: browser.results ?? null },
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`  written                : ${OUT}`);
  } else {
    console.log("\n  (dry run — pass --write to emit the parity receipt)");
  }

  // Non-zero ONLY on a real divergence. An absent runtime is reported, not failed: the receipt
  // carries `three_runtime_parity: false` and that is what a reviewer reads.
  return comparisons.some((c) => c.ran && c.differing.length > 0) ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main(process.argv.slice(2)));
}
