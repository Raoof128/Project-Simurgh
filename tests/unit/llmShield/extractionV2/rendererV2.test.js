// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  SACRED_NON_CLAIM,
  FORBIDDEN_WORDING,
  renderAttestationProseV2,
} from "../../../../tools/simurgh-extraction/rendererV2.mjs";

const extraction = {
  decision: "extraction_pattern_observed",
  matched_strong_families: ["structural", "behavioural"],
  matched_contextual_families: ["volume"],
  strong_family_count: 2,
};
const a10 = {
  decision: "single_signal_observed",
  matched_strong_families: ["structural"],
  matched_contextual_families: ["volume"],
  strong_family_count: 1,
};
const ctxOnly = {
  decision: "single_signal_observed",
  matched_strong_families: [],
  matched_contextual_families: ["volume"],
  strong_family_count: 0,
};
const none = {
  decision: "no_pattern_observed",
  matched_strong_families: [],
  matched_contextual_families: [],
  strong_family_count: 0,
};

test("extraction prose names strong+contextual families and the reason", () => {
  const s = renderAttestationProseV2(extraction).rendered_summary;
  assert.match(s, /strong families: structural, behavioural/i);
  assert.match(s, /contextual families: volume/i);
  assert.match(s, /at least two strong families/i);
  assert.ok(s.includes(SACRED_NON_CLAIM));
});

test("A10 prose states volume cannot independently corroborate", () => {
  const s = renderAttestationProseV2(a10).rendered_summary;
  assert.match(s, /single_signal_observed/i);
  assert.match(s, /volume is contextual and cannot independently corroborate/i);
});

test("0-strong contextual-only also cites the contextual reason", () => {
  const s = renderAttestationProseV2(ctxOnly).rendered_summary;
  assert.match(s, /volume is contextual and cannot independently corroborate/i);
});

test("no-pattern branch renders + carries non-claim", () => {
  const s = renderAttestationProseV2(none).rendered_summary;
  assert.match(s, /no .*pattern/i);
  assert.ok(s.includes(SACRED_NON_CLAIM));
});

test("intent_claim_made false + deterministic", () => {
  assert.equal(renderAttestationProseV2(extraction).intent_claim_made, false);
  assert.equal(
    renderAttestationProseV2(extraction).rendered_summary,
    renderAttestationProseV2({ ...extraction }).rendered_summary
  );
});

test("throws on accusatory family name (defence in depth)", () => {
  assert.throws(
    () => renderAttestationProseV2({ ...extraction, matched_strong_families: ["attacker"] }),
    /intent_language_rejected/
  );
});

test("no forbidden wording leaks", () => {
  const s = renderAttestationProseV2(extraction).rendered_summary.toLowerCase();
  for (const w of FORBIDDEN_WORDING) assert.ok(!s.includes(w), `leaked ${w}`);
});
