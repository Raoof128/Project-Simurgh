// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 13 — `quorum_status`, and only `quorum_status` (Ruling 3).
//
// ONE STATUS, ONE FUNCTION, ONE FILE. The four statuses of §3.2 are independent, and the fastest way
// to lose that independence is to compute them together: a shared branch, a shared early return, and
// suddenly a met quorum is quietly implying a clean comparison. Five files make the coupling visible
// as an import rather than invisible as a line.

import assert from "node:assert/strict";
import test from "node:test";

import {
  QUORUM_STATUS,
  quorumStatusOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/status.mjs";

const tallyResult = (over = {}) => ({
  ok: true,
  refusals: [],
  tally: { distinct_eligible_witnesses: 2, threshold_q: 2, met: true, by_class: {} },
  ...over,
});

test("[5s-t13] the status set is exactly the two §2.5 names", () => {
  assert.deepEqual([...QUORUM_STATUS].sort(), ["quorum_incomplete", "witnessed_quorum"]);
  assert.ok(Object.isFrozen(QUORUM_STATUS));
});

test("[5s-t13] a met threshold over a clean tally is witnessed_quorum", () => {
  assert.equal(quorumStatusOf(tallyResult()), "witnessed_quorum");
});

test("[5s-t13] an unmet threshold is quorum_incomplete", () => {
  const short = tallyResult({
    ok: false,
    refusals: [{ reason: "QUORUM_BELOW_POLICY" }],
    tally: { distinct_eligible_witnesses: 1, threshold_q: 2, met: false, by_class: {} },
  });
  assert.equal(quorumStatusOf(short), "quorum_incomplete");
});

test("[5s-t13] a REFUSED tally is never witnessed, whatever `met` says", () => {
  // A tally that stopped at a laundering refusal never reached the arithmetic. If a stale `met: true`
  // survived on the object, reading it alone would report a quorum the tally explicitly refused.
  const refused = tallyResult({
    ok: false,
    refusals: [{ reason: "PRODUCER_SELF_WITNESS" }],
    tally: { distinct_eligible_witnesses: 2, threshold_q: 2, met: true, by_class: {} },
  });
  assert.equal(quorumStatusOf(refused), "quorum_incomplete");
});

test("[5s-t13] absent, malformed and empty inputs fail CLOSED to quorum_incomplete", () => {
  for (const bad of [undefined, null, {}, { ok: true }, "witnessed_quorum", []]) {
    assert.equal(
      quorumStatusOf(bad),
      "quorum_incomplete",
      `${JSON.stringify(bad)} produced a quorum`
    );
  }
});

test("[5s-t13] the status never depends on the comparison lane — the lanes are `⟂`", () => {
  // §2.8 marks the split: comparison does not sit downstream of quorum, and quorum does not sit
  // downstream of comparison. Handing this function a detected fork changes nothing.
  const withFork = { ...tallyResult(), comparison_status: "equivocation_detected" };
  assert.equal(quorumStatusOf(withFork), "witnessed_quorum");
});
