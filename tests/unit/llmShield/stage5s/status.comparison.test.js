// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 13 — `comparison_status`, and the quorum cross-product it OWNS.
//
// THE REVIEWER'S ATTACK, ANSWERED FOUR TIMES: *can a partially witnessed fork still disappear?*
//
// Two authenticated producer signatures over incompatible checkpoints prove the producer signed both.
// No witness is needed to establish that, so a quorum shortfall on either side — or on both — must
// never suppress the finding. The four combinations are asserted separately rather than as one
// parameterised loop, because a loop that breaks early still reports green, and each case carries an
// exported id so Task 18 reinforces these exact cases at the matrix layer instead of retyping them.
//
// Reaching `QUORUM_BELOW_POLICY` first would have violated No Two Compared Histories inside the stage
// that declares it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  COMPARISON_STATUS,
  comparisonStatusOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/status.mjs";

const SRC = "tools/simurgh-attestation/stage5s/core/status.mjs";

/** Pinned ids, imported by the Task 18 matrix rather than retyped there (§13, E3). */
export const QUORUM_CROSS_PRODUCT_CASE_IDS = Object.freeze([
  "5S-XP-MET-MET",
  "5S-XP-MET-INCOMPLETE",
  "5S-XP-INCOMPLETE-MET",
  "5S-XP-INCOMPLETE-INCOMPLETE",
]);

const forked = (a, b) => ({
  relations: ["incompatible"],
  intake: { sufficient_for_comparison: true, intake_complete: true },
  quorum_status_a: a,
  quorum_status_b: b,
});

test("[5s-t13] the status set is exactly the four §2.5/§2.6 names", () => {
  assert.deepEqual([...COMPARISON_STATUS].sort(), [
    "comparison_indeterminate",
    "comparison_unavailable",
    "equivocation_detected",
    "no_conflict_in_committed_comparison_set",
  ]);
  assert.ok(Object.isFrozen(COMPARISON_STATUS));
});

// ------------------------------------------------ the cross-product, four separate receipts

test("[5s-t13] 5S-XP-MET-MET — both quorums met, fork detected", () => {
  assert.equal(
    comparisonStatusOf(forked("witnessed_quorum", "witnessed_quorum")),
    "equivocation_detected"
  );
});

test("[5s-t13] 5S-XP-MET-INCOMPLETE — one quorum short, fork STILL detected", () => {
  assert.equal(
    comparisonStatusOf(forked("witnessed_quorum", "quorum_incomplete")),
    "equivocation_detected"
  );
});

test("[5s-t13] 5S-XP-INCOMPLETE-MET — the other quorum short, fork STILL detected", () => {
  assert.equal(
    comparisonStatusOf(forked("quorum_incomplete", "witnessed_quorum")),
    "equivocation_detected"
  );
});

test("[5s-t13] 5S-XP-INCOMPLETE-INCOMPLETE — NEITHER quorum met, fork STILL detected", () => {
  // The case a producer would engineer: withhold witnesses from both branches and hope the shortfall
  // swallows the evidence. It does not. The producer's own two signatures are the evidence.
  assert.equal(
    comparisonStatusOf(forked("quorum_incomplete", "quorum_incomplete")),
    "equivocation_detected"
  );
});

test("[5s-t13] the four case ids are pinned as a SET, and they are four", () => {
  assert.equal(new Set(QUORUM_CROSS_PRODUCT_CASE_IDS).size, 4);
  assert.ok(Object.isFrozen(QUORUM_CROSS_PRODUCT_CASE_IDS));
});

test("[5s-t13] the function never reads a quorum status — checked over source", () => {
  // The cross-product above is only meaningful if quorum is genuinely not an input to the decision.
  // A loop over four values proves nothing if the function reads them and happens to agree today.
  // Comments come out FIRST, and both kinds: the neighbouring JSDoc discusses the quorum lane at
  // length, and a scan that read prose would fail on documentation rather than on code.
  const code = readFileSync(SRC, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  const body = code.slice(code.indexOf("export function comparisonStatusOf"));
  const next = body.indexOf("\nexport ", 1);
  const fn = next === -1 ? body : body.slice(0, next);
  assert.ok(fn.includes("relations"), "the extracted body is not the function");
  assert.ok(!/quorum/i.test(fn), "comparisonStatusOf reads the quorum lane");
});

// ------------------------------------------------ the other three outcomes

test("[5s-t13] fewer than two committed views is comparison_unavailable, never clean", () => {
  // §2.8: sufficiency before cleanliness. A comparator that compared fewer than two committed views
  // can never emit this stage's strongest green — the blade's own anti-vacuity condition.
  const r = comparisonStatusOf({
    relations: [],
    intake: { sufficient_for_comparison: false, intake_complete: false },
  });
  assert.equal(r, "comparison_unavailable");
});

test("[5s-t13] an indeterminate relation is reported as such, never as a fork or as clean", () => {
  const r = comparisonStatusOf({
    relations: ["same_checkpoint", "indeterminate"],
    intake: { sufficient_for_comparison: true, intake_complete: true },
  });
  assert.equal(r, "comparison_indeterminate");
});

test("[5s-t13] a fork outranks an indeterminate — evidence is not diluted by an unknown", () => {
  const r = comparisonStatusOf({
    relations: ["indeterminate", "incompatible"],
    intake: { sufficient_for_comparison: true, intake_complete: true },
  });
  assert.equal(r, "equivocation_detected");
});

test("[5s-t13] all-clean relations over a sufficient set is the committed-set green", () => {
  for (const relations of [
    ["same_checkpoint"],
    ["compatible"],
    ["same_checkpoint", "compatible"],
  ]) {
    assert.equal(
      comparisonStatusOf({
        relations,
        intake: { sufficient_for_comparison: true, intake_complete: true },
      }),
      "no_conflict_in_committed_comparison_set"
    );
  }
});

test("[5s-t13] the green is scoped to the COMMITTED set, in the name itself", () => {
  // §1.4 and §2.6: the phrase "views that reached us" appears nowhere, because intake completeness is
  // machine-checked only in the strong tier. The status name carries its own scope.
  assert.ok(COMPARISON_STATUS.includes("no_conflict_in_committed_comparison_set"));
  assert.ok(!COMPARISON_STATUS.some((s) => /no_fork|clean$|no_equivocation/.test(s)));
});

test("[5s-t13] an incomplete intake does not by itself downgrade a clean committed comparison", () => {
  // Narrow tier is a real, honest tier: `intake_complete: false` is reported beside the status, not
  // folded into it. Folding would make the two tiers indistinguishable to a reader.
  const r = comparisonStatusOf({
    relations: ["same_checkpoint"],
    intake: { sufficient_for_comparison: true, intake_complete: false },
  });
  assert.equal(r, "no_conflict_in_committed_comparison_set");
});

test("[5s-t13] absent and malformed inputs fail CLOSED to comparison_unavailable", () => {
  for (const bad of [undefined, null, {}, { relations: "incompatible" }, []]) {
    assert.equal(
      comparisonStatusOf(bad),
      "comparison_unavailable",
      `${JSON.stringify(bad)} produced a verdict`
    );
  }
});

test("[5s-t13] an unrecognised relation is not clean — it is indeterminate", () => {
  const r = comparisonStatusOf({
    relations: ["same_checkpoint", "probably_fine"],
    intake: { sufficient_for_comparison: true, intake_complete: true },
  });
  assert.equal(r, "comparison_indeterminate");
});
