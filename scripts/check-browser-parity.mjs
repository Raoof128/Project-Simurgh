// SPDX-License-Identifier: AGPL-3.0-or-later
// Maintained fresh-output parity runner. Never overwrites a prior receipt.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, dirname, resolve } from "node:path";
import { canonicalJson } from "../tools/simurgh-attestation/canonicalise.mjs";
import {
  buildManifest,
  checkRuntime,
} from "../tools/simurgh-attestation/stage5r/core/parityManifest.mjs";
import * as portable from "../tools/simurgh-attestation/stage5r/browser/vpf-portable.mjs";

import { discoverBrowser, managedBrowserBlockReason } from "./lib/runtimePrerequisites.mjs";
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2];
if (!OUT) throw new Error("Usage: node scripts/check-browser-parity.mjs <new-receipt.json>");
const PY = "tools/simurgh-attestation/stage5r/python/vpf_parity.py";
const MANIFEST = "docs/research/llm-shield/evidence/stage-5r/parity/parity-manifest.json";

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
  const browserPath = discoverBrowser();
  const blocked = managedBrowserBlockReason(browserPath);
  let browserAnswers = null;
  let browserName = null;
  if (browserPath && !blocked) {
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
    // The page and a copy of the module go to a SCRATCH DIRECTORY, not into the repository. An
    // earlier version wrote the page next to the module, where it churned against the formatter on
    // every run: a generated file living in the tree turns "the working tree is clean" into a
    // question about who ran what last, and that check is load-bearing everywhere else in this stage.
    const scratch = mkdtempSync(join(tmpdir(), "5r-parity-page."));
    copyFileSync(
      join(REPO, "tools/simurgh-attestation/stage5r/browser/vpf-portable.mjs"),
      join(scratch, "vpf-portable.mjs")
    );
    const html = join(scratch, "parity.html");
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
        `--user-data-dir=${join(scratch, "profile")}`,
        `file://${html}`,
      ],
      { encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024 }
    );
    rmSync(scratch, { recursive: true, force: true });
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
      reason: blocked || (browserPath ? "browser_execution_failed" : "browser_unavailable"),
    },
    browser_binary: browserName,
    two_runtime_parity: twoRuntime,
    three_runtime_parity: threeRuntime,
    a_missing_browser_is_not_a_pass:
      "Browser parity is UNPROVEN when no browser ran. Two-runtime parity is a true, smaller " +
      "claim; parity verified with one runtime unmeasured is a false one.",
  };

  const out = resolve(OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${canonicalJson(receipt)}\n`, { encoding: "utf8", flag: "wx" });

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
  return threeRuntime ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(await main());
}
