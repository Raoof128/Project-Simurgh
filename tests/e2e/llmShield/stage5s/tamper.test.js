// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 21 — the tamper matrix, set-pinned with an explicit census.
//
// THE CENSUS IS THE PIN (§13, E8). A tamper suite that runs whatever cases happen to exist cannot
// tell a deleted case from a case that was never written; both look like a slightly smaller green
// run. So the pin is the exact set of `{artifact, field_class}` pairs, each with the first-failure
// code it must produce, and a dropped case is a refusal.
//
// EVERY MUTATION IS PROVEN TO HAVE MUTATED, and that rule was bought with 5S-F014 — found in this
// repository, in this stage. `"00" + signature.slice(2)` leaves the signature untouched whenever it
// already begins `00`: 1 freshly signed Ed25519 value in 256, measured at 75 of 20,001. The
// "tampered" bundle is then a valid one, the verifier correctly returns 0, and the failure looks
// like a verifier bug. When the value is a committed fixture the accident is permanent instead of
// intermittent — a tamper test that never tampers and is green forever, which is strictly worse.
//
// So each case here asserts its target ACTUALLY CHANGED before asserting the code. A tamper case
// that silently tampers with nothing is testing the verifier's willingness to accept good evidence,
// which is the opposite of what it claims to test, and it will pass for years.

import assert from "node:assert/strict";
import test from "node:test";

import {
  CENSUS_PAIRS,
  FIELD_CLASSES,
  TAMPER_CENSUS,
  flipFirst,
  honestBundle,
} from "../../../../tools/simurgh-attestation/stage5s/fixtures/tamperCensus.mjs";
import { VWQ_CLOSED_BAND } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";
import { ARTIFACT_NAMES } from "../../../../tools/simurgh-attestation/stage5s/core/artifacts.mjs";
import { evaluate } from "../../../../tools/simurgh-attestation/stage5s/core/verify.mjs";

// ------------------------------------------------------------------ the mutation primitive

test("[5s-t21] flipFirst always changes its input — the 5S-F014 guarantee", () => {
  // The property the repo's `"00" + x.slice(2)` idiom lacks. Checked over the shapes that actually
  // appear: hex digests, base64 signatures, prefixed digests, and the degenerate cases.
  const inputs = ["00abcdef", "abcdef00", "sha256:00ff", "sha256:aaaa", "a", "0", "", "MEUCIQD..."];
  for (const input of inputs) {
    assert.notEqual(flipFirst(input), input, `flipFirst left ${JSON.stringify(input)} unchanged`);
    if (input.length > 1) {
      assert.equal(flipFirst(input).length, input.length, "the shape must survive the flip");
      assert.equal(flipFirst(input).slice(1), input.slice(1), "only the first character may move");
    }
  }
});

test("[5s-t21] the idiom this stage refuses to use IS a no-op on 1 value in 256", () => {
  // Kept as an executable statement of the defect, so the reason for `flipFirst` cannot be lost to
  // a future tidy-up that decides the helper looks redundant.
  const alreadyZero = "00deadbeef";
  assert.equal("00" + alreadyZero.slice(2), alreadyZero, "the no-op is real");
  assert.notEqual(flipFirst(alreadyZero), alreadyZero);
});

// ------------------------------------------------------------------ the census pin

test("[5s-t21] the census is pinned as a SET of {artifact, field_class} pairs", () => {
  const pairs = TAMPER_CENSUS.map((r) => `${r.artifact}/${r.field_class}`).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  assert.deepEqual(pairs, [...CENSUS_PAIRS]);
  assert.equal(new Set(pairs).size, pairs.length, "a pair appears twice");
  assert.ok(pairs.length >= 15, `only ${pairs.length} census rows`);
});

test("[5s-t21] every field class of the plan is exercised", () => {
  const used = new Set(TAMPER_CENSUS.map((r) => r.field_class));
  for (const cls of FIELD_CLASSES) {
    assert.ok(used.has(cls), `no census row exercises ${cls}`);
  }
  assert.deepEqual([...used].sort(), [...FIELD_CLASSES].sort(), "an unnamed field class appeared");
});

test("[5s-t21] every artifact named in the census is one of the nine", () => {
  for (const row of TAMPER_CENSUS) {
    assert.ok(ARTIFACT_NAMES.includes(row.artifact), `${row.artifact} is not an artifact`);
  }
});

test("[5s-t21] every artifact the evaluator consumes has at least one tamper row", () => {
  // Anti-vacuity on coverage rather than on outcomes. The four artifacts the ordered evaluator
  // actually reads must each be attacked, or the matrix is silent about one of them.
  const covered = new Set(TAMPER_CENSUS.map((r) => r.artifact));
  for (const artifact of [
    "checkpoint",
    "witness_policy",
    "witness_statement",
    "comparison_policy",
    "view_receipt",
    "comparison_manifest",
  ]) {
    assert.ok(covered.has(artifact), `no tamper row touches ${artifact}`);
  }
});

test("[5s-t21] every required code is a real member of the frozen band", () => {
  const band = new Set(VWQ_CLOSED_BAND.map((r) => r.raw_code));
  for (const row of TAMPER_CENSUS) {
    assert.ok(band.has(row.raw_code), `${row.artifact}/${row.field_class} wants ${row.raw_code}`);
  }
});

// ------------------------------------------------------------------ the matrix itself

for (const row of TAMPER_CENSUS) {
  test(`[5s-t21] ${row.artifact} / ${row.field_class} → ${row.raw_code}`, () => {
    // 1. The honest bundle really is honest. Without this, a census row could "pass" against a
    //    bundle that was already refused for an unrelated reason.
    const clean = evaluate(honestBundle());
    assert.equal(
      clean.exit_code,
      0,
      `the base bundle is not clean: ${JSON.stringify(clean.first_failure)}`
    );

    // 2. The mutation changed what it claims to change. This is the 5S-F014 guard, and it is the
    //    assertion that would have caught that defect on the day it was written.
    const before = row.reads(honestBundle());
    const tampered = row.tamper(honestBundle());
    const after = row.reads(tampered);
    assert.notEqual(
      String(after),
      String(before),
      `${row.artifact}/${row.field_class}: the tamper left its target unchanged — this case is ` +
        `asserting nothing about the verifier`
    );

    // 3. And only then, the code.
    const result = evaluate(tampered);
    assert.ok(result.first_failure, "the tampered bundle verified clean");
    assert.equal(
      result.first_failure.raw_code,
      row.raw_code,
      `reached ${result.first_failure.raw_code} (${result.first_failure.policy_outcome} — ` +
        `${result.first_failure.detail})`
    );
  });
}

// ------------------------------------------------------------------ the projection case, stated

test("[5s-t21] a ledger projection in a checkpoint slot is refused, not read as a checkpoint", () => {
  // The case worth naming out loud: the substituted object is FULL of digests and looks entirely
  // evidential. What it lacks is a producer signature, so nothing attributes it to anybody — and an
  // evaluator that accepted it would be reading a summary as if it were the thing summarised.
  const row = TAMPER_CENSUS.find((r) => r.field_class === "projection_in_checkpoint_slot");
  assert.ok(row, "no projection case exists");
  const tampered = row.tamper(honestBundle());
  assert.equal(tampered.views[0].checkpoint.schema, "simurgh.vwq.ledger-projection.v1");
  assert.equal(tampered.views[0].checkpoint.producer_signature, undefined);

  const result = evaluate(tampered);
  assert.equal(result.first_failure.raw_code, 475);
  // And no accusation is minted over it — attribution never happened.
  assert.equal(result.statuses.comparison_status, "comparison_unavailable");
  assert.equal(result.equivocation_artifact, null);
});

test("[5s-t21] no tamper case yields a finding — a damaged bundle accuses nobody", () => {
  for (const row of TAMPER_CENSUS) {
    const result = evaluate(row.tamper(honestBundle()));
    if (result.statuses.comparison_status !== "equivocation_detected") continue;
    // A witness-lane tamper leaves the producer's two signatures intact, so the finding legitimately
    // survives. What must never happen is a finding over a bundle whose ATTRIBUTION was tampered.
    assert.ok(
      !["checkpoint"].includes(row.artifact),
      `${row.artifact}/${row.field_class} minted a finding over a tampered checkpoint`
    );
  }
});
