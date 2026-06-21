// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  SACRED_NON_CLAIM,
  FORBIDDEN_WORDING,
  renderAttestationProse,
} from "../../../../tools/simurgh-extraction/renderer.mjs";

const base = {
  decision: "extraction_pattern_observed",
  attestation_claim: "manual_review_recommended",
  matched_families: ["structural", "behavioural"],
  distinct_family_count: 2,
};

test("render is deterministic, carries the sacred non-claim, makes no intent claim", () => {
  const r1 = renderAttestationProse(base);
  const r2 = renderAttestationProse({ ...base });
  assert.equal(r1.rendered_summary, r2.rendered_summary);
  assert.equal(r1.intent_claim_made, false);
  assert.ok(r1.rendered_summary.includes(SACRED_NON_CLAIM));
  assert.match(r1.rendered_summary, /manual review/i);
});

test("render contains no forbidden/accusatory wording", () => {
  const lower = renderAttestationProse(base).rendered_summary.toLowerCase();
  for (const w of FORBIDDEN_WORDING) assert.ok(!lower.includes(w), `leaked: ${w}`);
});

test("render handles each decision branch", () => {
  assert.match(
    renderAttestationProse({
      ...base,
      decision: "no_pattern_observed",
      matched_families: [],
      distinct_family_count: 0,
    }).rendered_summary,
    /no .*pattern/i
  );
  assert.match(
    renderAttestationProse({
      ...base,
      decision: "single_signal_observed",
      matched_families: ["volume"],
      distinct_family_count: 1,
    }).rendered_summary,
    /single/i
  );
});

test("render throws if a family name is itself accusatory (defence in depth)", () => {
  assert.throws(
    () => renderAttestationProse({ ...base, matched_families: ["malicious campaign"] }),
    /intent_language_rejected/
  );
});
