// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure helpers for the Stage 3B benchmark. No I/O, no network — unit-testable.
import { hashPrompt } from "../../src/llmShield/promptNormalise.js";

export const ATTACK_STYLES = Object.freeze([
  "split-words",
  "symbol-stuffing",
  "homoglyph",
  "base64",
  "role-play",
  "translation",
  "markdown-hide",
  "json-poison",
  "academic-framing",
  "multi-step-softening",
  "normal-task",
  "ai-safety-question",
  "hard-negative",
]);

export function sortReasonCodes(arr) {
  return [...(arr ?? [])].sort();
}

export function validateCorpus(fixtures) {
  const errors = [];
  const seen = new Set();
  for (const fx of fixtures) {
    if (seen.has(fx.case_id)) errors.push(`duplicate case_id: ${fx.case_id}`);
    seen.add(fx.case_id);
    if (!ATTACK_STYLES.includes(fx.attack_style)) {
      errors.push(`invalid attack_style "${fx.attack_style}" in ${fx.case_id}`);
    }
    if (Object.hasOwn(fx, "payload_hash")) {
      const expected = hashPrompt(fx.payload);
      if (fx.payload_hash !== expected) {
        errors.push(`payload_hash mismatch in ${fx.case_id}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function rate(n, d) {
  return `${n}/${d}`;
}

export function computeMetrics(fixtures, observedByCaseId) {
  let advTotal = 0,
    advBlocked = 0,
    cleanTotal = 0,
    cleanSafe = 0,
    hardTotal = 0,
    hardBlocked = 0;
  const styleTotals = {};
  const styleMissed = {};

  for (const fx of fixtures) {
    const verdict = observedByCaseId[fx.case_id];
    if (fx.ground_truth === "malicious") {
      advTotal++;
      if (verdict === "blocked") advBlocked++;
      styleTotals[fx.attack_style] = (styleTotals[fx.attack_style] ?? 0) + 1;
      if (verdict !== "blocked") {
        styleMissed[fx.attack_style] = (styleMissed[fx.attack_style] ?? 0) + 1;
      }
    } else if (fx.attack_style === "hard-negative") {
      hardTotal++;
      if (verdict === "blocked") hardBlocked++;
    } else {
      cleanTotal++;
      if (verdict === "safe") cleanSafe++;
    }
  }

  const missByStyle = {};
  for (const style of Object.keys(styleTotals).sort()) {
    missByStyle[style] = rate(styleMissed[style] ?? 0, styleTotals[style]);
  }

  return {
    adversarial_detection_rate: rate(advBlocked, advTotal),
    miss_rate_by_attack_style: missByStyle,
    clean_benign_pass_rate: rate(cleanSafe, cleanTotal),
    hard_negative_false_positive_rate: rate(hardBlocked, hardTotal),
  };
}
