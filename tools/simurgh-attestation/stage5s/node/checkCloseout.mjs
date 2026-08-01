#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 37 — the closeout check.
//
// A CLOSEOUT IS A CLAIM SURFACE, so it goes through the claim gate like any other. It is also the
// document most likely to drift optimistic: it is written last, read by everyone, and nobody
// re-derives its numbers. So the things it must contain are checked rather than trusted.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { scanClaimSurfaces } from "../core/claimGate.mjs";

export const CLOSEOUT_PATH = "docs/research/llm-shield/STAGE_5S_CLOSEOUT.md";
export const CLOSEOUT_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

/** Every section the closeout must carry, with what makes it non-vacuous. */
export const REQUIRED_SECTIONS = Object.freeze([
  { id: "motto", pattern: /AnthropicSafe First, then ReviewerSafe/ },
  { id: "comparison_bounded", pattern: /comparison-bounded/i },
  { id: "independence_unproven", pattern: /unproven/ },
  { id: "anchor_zero_weight", pattern: /zero witness weight/i },
  { id: "scorecard", pattern: /\|\s*Novelty\s*\|/ },
  { id: "downgrade_recorded", pattern: /downgraded/i },
  { id: "debts", pattern: /Debts, priced/ },
  { id: "non_claims", pattern: /What 5S does not claim/ },
  { id: "findings", pattern: /5S-F014/ },
  { id: "skip_declared", pattern: /environment-dependent skip/ },
]);

export function checkCloseout(text) {
  const refusals = [];
  for (const section of REQUIRED_SECTIONS) {
    if (!section.pattern.test(text)) {
      refusals.push({ reason: "CLOSEOUT_SECTION_ABSENT", detail: section.id });
    }
  }
  // The closeout is a claim surface. It goes through the gate like everything else.
  const scan = scanClaimSurfaces([{ id: "closeout", text }]);
  if (!scan.ok) refusals.push(...scan.refusals);

  // The one number a closeout must never round: a suite reported as clean while findings stand.
  if (/all tests pass/i.test(text)) {
    refusals.push({
      reason: "CLOSEOUT_ROUNDED_SUITE",
      detail: "the closeout says 'all tests pass' while findings and a skip stand",
    });
  }
  return { ok: refusals.length === 0, refusals };
}

export function main(argv, deps = {}) {
  const log = deps.log ?? ((l) => console.log(l));
  const read = deps.readFile ?? ((p) => readFileSync(p, "utf8"));
  let text;
  try {
    text = read(CLOSEOUT_PATH);
  } catch (error) {
    log(`Stage 5S closeout — NOT RUN: ${error.message}`);
    return CLOSEOUT_EXIT.OPERATOR_ERROR;
  }
  const result = checkCloseout(text);
  log(`Stage 5S closeout — ${CLOSEOUT_PATH}`);
  if (!result.ok) {
    for (const r of result.refusals) log(`  ✗ ${r.reason} — ${r.detail}`);
    return CLOSEOUT_EXIT.REFUSED;
  }
  log("  OK — every required section present, and the claim gate passes over it");
  return CLOSEOUT_EXIT.OK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
