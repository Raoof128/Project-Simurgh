// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 25: the cross-runtime parity driver.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/runCrossRuntimeParity.mjs
//
// FOUR evaluators, and the first is what makes the others mean anything:
//
//     Node core     the real core/*.mjs the committed digests are computed by
//     portable      browser/vpf-portable.mjs, the one implementation Node and a browser share
//     Python        python/vpf_parity.py, written from the rules rather than transliterated
//     browser       the same portable module, executed by a real headless browser
//
// A MISSING BROWSER IS NOT A PASS. When no browser is available the receipt records
// `browser_unavailable`, marks browser parity UNPROVEN and sets `three_runtime_parity: false`.
// Two-runtime parity is a true, smaller claim; "parity verified" with one runtime unmeasured is a
// false one, and this receipt refuses to carry it.

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { buildManifest, checkRuntime } from "../core/parityManifest.mjs";
import * as portable from "../browser/vpf-portable.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const OUT = "docs/research/llm-shield/evidence/stage-5r/parity/cross-runtime-parity.json";
const PY = "tools/simurgh-attestation/stage5r/python/vpf_parity.py";
const MANIFEST = "docs/research/llm-shield/evidence/stage-5r/parity/parity-manifest.json";

/** Browsers to try, in order. The first one present is used and NAMED in the receipt. */
const BROWSERS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "chromium",
  "google-chrome",
];

/** @returns {number} exit code */
export async function main() {
  const manifest = buildManifest();
  const committed = JSON.parse(readFileSync(join(REPO, MANIFEST), "utf8"));
  if (canonicalJson(manifest) !== canonicalJson(committed)) {
    process.stderr.write("parity: the manifest has drifted from its committed copy\n");
    return 1;
  }

  // 1. Node core — the implementation that produces the committed digests.
  const nodeAnswers = Object.fromEntries(
    manifest.entries.map((e) => [e.id, e.vectors.map((v) => v.expected)])
  );

  // 2. The portable module.
  const portableAnswers = await portable.answerManifest(manifest);

  // 3. Python.
  const py = spawnSync("python3", [join(REPO, PY), join(REPO, MANIFEST)], { encoding: "utf8" });
  const pythonAvailable = py.status === 0;
  const pythonAnswers = pythonAvailable ? JSON.parse(py.stdout) : {};

  // 4. A real browser, if one exists on this machine.
  const browserPath = BROWSERS.find((b) => existsSync(b) || spawnSync("which", [b]).status === 0);
  let browserAnswers = null;
  let browserName = null;
  if (browserPath) {
    browserName = browserPath;
    // The answers are written into a MARKED element, not logged. `--dump-dom` returns the DOM, and
    // the first version of this harness scraped the first `{...}` it found — which was the manifest
    // inlined into the page, not the browser's answers. It reported a browser mismatch that was
    // entirely the harness's own, which is a false red and no better than a false green.
    const script = `
      import * as m from "./vpf-portable.mjs";
      const manifest = ${JSON.stringify(manifest)};
      const out = () => document.getElementById("out");
      m.answerManifest(manifest)
        .then((a) => { out().textContent = "5R-PARITY-BEGIN" + JSON.stringify(a) + "5R-PARITY-END"; })
        .catch((e) => { out().textContent = "5R-PARITY-ERROR " + e.message; });
    `;
    const html = join(REPO, "tools/simurgh-attestation/stage5r/browser/parity.html");
    writeFileSync(
      html,
      `<!doctype html><meta charset="utf-8"><pre id="out"></pre><script type="module">${script}</script>\n`,
      "utf8"
    );
    const run = spawnSync(
      browserPath,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        // Module imports across file:// need this, and crypto.subtle needs a trustworthy origin,
        // which file:// is in Chrome. Both are the predecessor's flags, reused rather than rediscovered.
        "--allow-file-access-from-files",
        "--virtual-time-budget=15000",
        "--dump-dom",
        `--user-data-dir=${mkdtempSync(join(tmpdir(), "5r-parity."))}`,
        `file://${html}`,
      ],
      { encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024 }
    );
    if (run.status === 0) {
      const m = /5R-PARITY-BEGIN([\s\S]*?)5R-PARITY-END/.exec(run.stdout ?? "");
      if (m) {
        try {
          browserAnswers = JSON.parse(m[1].replace(/&quot;/g, '"'));
        } catch {
          browserAnswers = null;
        }
      }
    }
  }

  const results = {
    node_core: checkRuntime({ manifest, answers: nodeAnswers }),
    portable: checkRuntime({ manifest, answers: portableAnswers }),
    python: pythonAvailable ? checkRuntime({ manifest, answers: pythonAnswers }) : null,
    browser: browserAnswers ? checkRuntime({ manifest, answers: browserAnswers }) : null,
  };

  const twoRuntime = results.node_core.ok && results.portable.ok && results.python?.ok === true;
  const threeRuntime = twoRuntime && results.browser?.ok === true;

  const receipt = {
    schema: "simurgh.vpf.cross-runtime-parity.v1",
    note:
      "Node core ≡ portable ≡ Python ≡ browser, over every manifest entry. The first link is what " +
      "makes the rest mean anything: mirrors that agree only with each other were written by one " +
      "person on one afternoon.",
    receipt_kind: "runtime",
    entry_count: manifest.entry_count,
    vector_count: manifest.vector_count,
    node_core: results.node_core,
    portable: results.portable,
    python: results.python ?? { unavailable: true },
    browser: results.browser ?? {
      unavailable: true,
      reason: browserPath ? "browser_execution_failed" : "browser_unavailable",
      searched: BROWSERS,
    },
    browser_binary: browserName,
    two_runtime_parity: twoRuntime,
    three_runtime_parity: threeRuntime,
    a_missing_browser_is_not_a_pass:
      "Browser parity is UNPROVEN when no browser ran. Two-runtime parity is a true, smaller " +
      "claim; parity verified with one runtime unmeasured is a false one.",
  };

  const out = join(REPO, OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${canonicalJson(receipt)}\n`, "utf8");

  process.stdout.write(
    [
      `wrote ${OUT}`,
      `  node core  ${results.node_core.ok}`,
      `  portable   ${results.portable.ok}`,
      `  python     ${results.python ? results.python.ok : "UNAVAILABLE"}`,
      `  browser    ${results.browser ? results.browser.ok : receipt.browser.reason}`,
      `  two-runtime parity   ${twoRuntime}`,
      `  three-runtime parity ${threeRuntime}`,
      "",
    ].join("\n")
  );
  return twoRuntime ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(await main());
}
