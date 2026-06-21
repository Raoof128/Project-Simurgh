// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { renderNarrative } from "../../../../tools/simurgh-narrative/renderer.mjs";

test("renderNarrative is deterministic + never an automatic finding + no forbidden words", () => {
  const slots = [
    { slot_id: "b", wording: "fallback_observed", severity: "manual_review_recommended" },
    { slot_id: "a", wording: "chain_valid", severity: "integrity_signal_present" },
  ];
  const r1 = renderNarrative(slots);
  const r2 = renderNarrative(JSON.parse(JSON.stringify(slots)));
  assert.equal(r1.rendered_summary, r2.rendered_summary);
  assert.equal(r1.automatic_finding_made, false);
  assert.match(r1.rendered_summary, /manual review/i);
  for (const f of ["cheated", "guilty", "malicious", "fraud"])
    assert.equal(r1.rendered_summary.toLowerCase().includes(f), false);
  // sorted by slot_id: "a" (chain_valid → "audit chain") before "b" (fallback)
  assert.ok(r1.rendered_summary.indexOf("audit chain") < r1.rendered_summary.indexOf("fallback"));
});

test("empty verified slots → clean no-issue narrative", () => {
  const r = renderNarrative([]);
  assert.match(r.rendered_summary, /no integrity signals/i);
  assert.equal(r.automatic_finding_made, false);
});
