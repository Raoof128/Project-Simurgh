#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 28 — the CAPTURED browser lane.
//
//   node runHeadless.mjs --emit docs/research/llm-shield/evidence/stage-5s/browser/
//
// THE SPLIT THIS FILE EXISTS TO KEEP HONEST. Running `vwq-portable.mjs` under Node 26 exercises the
// identical WHATWG WebCrypto API a browser exposes, and that establishes **API equivalence** — it is
// not browser execution and the CI lane never says it is. Real browser execution is a CAPTURE: it is
// present, or it is typed absent. It is never implied.
//
// So when no headless driver is installed, this writes `not_captured_driver_absent` and says so out
// loud. What it must never do is fall back to the Node run and report a browser result, which is the
// one shortcut that would make the whole distinction cosmetic.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson } from "../core/canonical.mjs";
import { PARITY_VECTORS } from "./parityVectors.mjs";
import { runVectors } from "./vwq-portable.mjs";

export const HEADLESS_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

export const BROWSER_OUTCOMES = Object.freeze([
  "captured",
  "not_captured_driver_absent",
  "not_captured_launch_failed",
]);

/** Try to load a headless driver. Absence is an outcome, not an exception. */
export async function resolveDriver(deps = {}) {
  if (deps.driver) return { ok: true, name: deps.driver.name ?? "injected", driver: deps.driver };
  for (const name of ["playwright", "puppeteer"]) {
    try {
      const mod = await import(name);
      return { ok: true, name, driver: mod };
    } catch {
      // keep looking; a missing optional driver is not an error here
    }
  }
  return { ok: false, outcome: "not_captured_driver_absent", detail: "no playwright or puppeteer" };
}

export async function capture({ dir, deps = {} }) {
  const resolved = await resolveDriver(deps);
  if (!resolved.ok) {
    return {
      schema: "simurgh.vwq.browser-capture.v1",
      lane: "captured_browser",
      state: resolved.outcome,
      detail: resolved.detail,
      // The line that must not blur. The CI lane's result is NOT reused here.
      non_claim:
        "No browser executed. API equivalence under Node's WHATWG WebCrypto is reported by the CI " +
        "lane and is not browser execution; this capture is absent and nothing stands in for it.",
      results: null,
    };
  }
  // A driver exists: run the portable module inside a real page.
  const html = `<!doctype html><meta charset="utf-8"><script type="module">
    import { runVectors } from "./vwq-portable.mjs";
    window.__result = await runVectors(${JSON.stringify(PARITY_VECTORS)});
  </script>`;
  try {
    const results = await deps.runInPage(html);
    return {
      schema: "simurgh.vwq.browser-capture.v1",
      lane: "captured_browser",
      state: "captured",
      driver: resolved.name,
      results,
    };
  } catch (error) {
    return {
      schema: "simurgh.vwq.browser-capture.v1",
      lane: "captured_browser",
      state: "not_captured_launch_failed",
      detail: String(error?.message ?? error).slice(0, 200),
      results: null,
    };
  }
}

export async function main(argv, deps = {}) {
  const log = deps.log ?? ((l) => console.log(l));
  let dir = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--emit") dir = argv[i + 1];
    else if (argv[i].startsWith("--emit=")) dir = argv[i].slice("--emit=".length);
    else if (argv[i].startsWith("--")) {
      log(`Stage 5S browser — NOT RUN: unrecognised argument: ${argv[i]}`);
      return HEADLESS_EXIT.OPERATOR_ERROR;
    }
  }
  if (!dir) {
    log("Stage 5S browser — NOT RUN: --emit <dir> is required");
    return HEADLESS_EXIT.OPERATOR_ERROR;
  }
  mkdirSync(dir, { recursive: true });
  const record = await capture({ dir, deps });
  writeFileSync(join(dir, "browser-capture.json"), `${canonicalJson(record)}\n`);
  log(`Stage 5S browser — ${record.state}`);
  if (record.state !== "captured") {
    log("  no browser-execution claim is made anywhere; the CI lane proves API equivalence only");
  }
  return HEADLESS_EXIT.OK;
}

void runVectors;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
