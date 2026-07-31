// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 18 — Lane A: the eight mandatory families, the two additive §7.3 cases, and the
// all-codes sweep. AnthropicSafe First, then ReviewerSafe.
//
// THE COLUMNS ARE AUTHORED AND THIS FILE GRADES AGAINST THEM. Nothing here computes an expectation.
// Every `expect` block lives in `fixtures/cases.mjs`, written by a person from §5.5 and §2.7, and
// Ruling 4's import-boundary test holds the fixture side away from the verifier so the two really are
// independent. When they disagree, one of them is wrong and a human has to say which — which is the
// entire point, and it has already earned its keep: the first run of this net found five real
// disagreements, three authoring errors and two defects in the evaluator.
//
// ELEVEN COLUMNS, PINNED INDEPENDENTLY. §5.4 forbids a single expected-result column, because a
// collapsed column lets a case pass for the wrong reason. The clearest example is right below: the
// four quorum cross-product cases share `comparison_status` and differ in everything else, and it is
// the differing part that carries the claim.
//
// THE SWEEP IS A WEAKER CLAIM THAN IT LOOKS. Reaching every code proves each code means something.
// It does not prove the ORDER — two untested checks could swap and every probe would still land.
// That is Task 19's adjacent-pair net, and this file does not pretend to cover it.
//
// TWO CODES HAVE NO PROBE AND SAY SO OUT LOUD. 492 is shadowed and currently unreachable (5S-F010);
// 510 is reached through the artifact verifier rather than the evaluator. Both are declared in
// `UNREACHABLE_FROM_EVALUATOR` with their reasons, and a test below asserts the declaration is
// exactly as large as the gap — a silently skipped code would read as a covered one.

import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCEPTANCE_COLUMNS,
  ADVERSARY_WINS,
  CASES,
  CODE_PROBES,
  UNREACHABLE_FROM_EVALUATOR,
} from "../../../../tools/simurgh-attestation/stage5s/fixtures/cases.mjs";
import { baseBundle } from "../../../../tools/simurgh-attestation/stage5s/fixtures/bundle.mjs";
import { VWQ_CLOSED_BAND } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";
import { evaluate } from "../../../../tools/simurgh-attestation/stage5s/core/verify.mjs";

/** The eleven columns, read off one evaluation. No expectation is computed here. */
function columnsOf(result) {
  return {
    verifier_exit: result.exit_code,
    quorum_status_a: result.statuses.quorum_status.a,
    quorum_status_b: result.statuses.quorum_status.b,
    comparison_status: result.statuses.comparison_status,
    equivocation_artifact_status: result.statuses.equivocation_artifact_status,
    finding_codes: result.equivocation_artifact ? ["VWQ_EQUIVOCATION_DETECTED"] : [],
    intake_complete: result.intake_complete,
    witness_independence_status: result.statuses.witness_independence_status,
    external_corroboration_status: result.statuses.external_corroboration_status,
    first_failure_code: result.first_failure ? result.first_failure.raw_code : null,
  };
}

// ------------------------------------------------------------------ the corpus, case by case

for (const c of CASES) {
  test(`[5s-t18] ${c.case_id} — family ${c.family}, denies ${c.denies}`, () => {
    const actual = columnsOf(evaluate(c.build()));
    for (const column of ACCEPTANCE_COLUMNS) {
      if (column === "case_id") continue;
      assert.deepEqual(
        actual[column],
        c.expect[column],
        `${c.case_id}: ${column} — the verifier says ${JSON.stringify(actual[column])}, ` +
          `the authored column says ${JSON.stringify(c.expect[column])}`
      );
    }
  });
}

// ------------------------------------------------------------------ the closeout law, conjunct by conjunct

test("[5s-t18] all four quorum combinations preserve a valid equivocation finding", () => {
  // §5.6's third conjunct, and the direct answer to the question the design most invites: can a
  // partially witnessed fork disappear? Four separate receipts rather than one argument.
  const crossProduct = CASES.filter((c) => c.case_id.startsWith("5S-XP-"));
  assert.equal(crossProduct.length, 4, "the cross-product is not four cases");
  const combinations = new Set();
  for (const c of crossProduct) {
    const actual = columnsOf(evaluate(c.build()));
    assert.equal(actual.comparison_status, "equivocation_detected", c.case_id);
    assert.deepEqual(actual.finding_codes, ["VWQ_EQUIVOCATION_DETECTED"], c.case_id);
    combinations.add(`${actual.quorum_status_a}/${actual.quorum_status_b}`);
  }
  // All four combinations must actually OCCUR, or four cases could quietly be the same one.
  assert.equal(combinations.size, 4, `only these combinations occurred: ${[...combinations]}`);
});

test("[5s-t18] compatible ancestry never yields an accusation", () => {
  // §5.6's fourth conjunct. A normal epoch advance over a committed chain is the case that makes
  // "two different signed checkpoints" mean nothing on its own.
  const c = CASES.find((x) => x.case_id === "5S-A-F1-CLEAN-COMPATIBLE-ANCESTRY");
  const actual = columnsOf(evaluate(c.build()));
  assert.equal(actual.comparison_status, "no_conflict_in_committed_comparison_set");
  assert.deepEqual(actual.finding_codes, []);
  assert.equal(actual.equivocation_artifact_status, "absent_compatible");
});

test("[5s-t18] no external anchor contributes witness weight", () => {
  // §5.6's fifth conjunct, and §3.1's whole ruling. An anchor observes a digest; it reads nothing.
  const c = CASES.find((x) => x.case_id === "5S-A-F5-ANCHOR-IN-WITNESS-ROSTER");
  const actual = columnsOf(evaluate(c.build()));
  assert.equal(actual.first_failure_code, 485);
  assert.equal(actual.quorum_status_a, "quorum_incomplete");
  assert.equal(actual.quorum_status_b, "quorum_incomplete");
});

test("[5s-t18] an insufficient comparison can never reach the strongest green", () => {
  // Sufficiency before cleanliness — the blade's own anti-vacuity condition.
  const c = CASES.find((x) => x.case_id === "5S-A-F8-EMPTY-COMPARISON-CANNOT-REACH-GREEN");
  const actual = columnsOf(evaluate(c.build()));
  assert.notEqual(actual.comparison_status, "no_conflict_in_committed_comparison_set");
  assert.equal(actual.comparison_status, "comparison_unavailable");
});

test("[5s-t18] every mandatory family and both additive cases are present", () => {
  for (const family of ["1 ", "2 ", "3 ", "4 ", "5 ", "6 ", "7 ", "8 "]) {
    assert.ok(
      CASES.some((c) => c.family.startsWith(family)),
      `§5.5 family ${family.trim()} has no case`
    );
  }
  assert.equal(CASES.filter((c) => c.family.startsWith("§7.3")).length, 2);
  // And every named adversary win is denied by something.
  for (const win of ADVERSARY_WINS) {
    assert.ok(
      CASES.some((c) => c.denies === win),
      `no case denies ${win}`
    );
  }
});

// ------------------------------------------------------------------ the all-codes sweep

for (const [code, why, damage] of CODE_PROBES) {
  test(`[5s-t18] raw ${code} is reached — ${why}`, () => {
    const result = evaluate(damage(baseBundle()));
    assert.ok(result.first_failure, `${code}: the bundle verified clean`);
    assert.equal(
      result.first_failure.raw_code,
      code,
      `${code}: reached ${result.first_failure.raw_code} ` +
        `(${result.first_failure.policy_outcome} — ${result.first_failure.detail})`
    );
  });
}

test("[5s-t18] 511 is reached, and only when a claim surface is declared", () => {
  const withGate = evaluate(
    { ...baseBundle(), claim_surfaces: ["the producer did not equivocate"] },
    {
      claimGate: (surfaces) =>
        surfaces
          .filter((s) => /did not equivocate|expensive/.test(s))
          .map((s) => ({ reason: "NONEQUIVOCATION_OVERCLAIM", detail: s })),
    }
  );
  assert.equal(withGate.first_failure.raw_code, 511);
  // The same bundle with no declared surface leaves the gate unevaluated rather than passing it.
  const withoutGate = evaluate(baseBundle());
  assert.equal(withoutGate.checks.find((c) => c.check_id === "claim gate").evaluated, false);
});

test("[5s-t18] 512 is reached — anything unmodelled fails closed, never open", () => {
  const b = baseBundle();
  Object.defineProperty(b, "views", {
    get() {
      throw new Error("unmodelled input");
    },
  });
  const r = evaluate(b);
  assert.equal(r.exit_code, 512);
  assert.equal(r.first_failure.policy_outcome, "VWQ_UNKNOWN");
});

test("[5s-t18] the sweep covers the WHOLE band, and every gap is declared with a reason", () => {
  const allocated = VWQ_CLOSED_BAND.map((r) => r.raw_code);
  const probed = new Set(CODE_PROBES.map(([code]) => code));
  probed.add(511);
  probed.add(512);
  const declared = new Set(Object.keys(UNREACHABLE_FROM_EVALUATOR).map(Number));

  const uncovered = allocated.filter((c) => !probed.has(c) && !declared.has(c));
  assert.deepEqual(uncovered, [], `codes with neither a probe nor a declared reason: ${uncovered}`);

  // The declaration may not be larger than the gap either. A stale entry would let a code that
  // became reachable go on being skipped — a silent exemption is the same failure as a silent skip.
  for (const code of declared) {
    assert.ok(!probed.has(code), `${code} is declared unreachable and also probed`);
    assert.ok(
      allocated.includes(code),
      `${code} is declared unreachable and is not in the band at all`
    );
    assert.ok(
      String(UNREACHABLE_FROM_EVALUATOR[code]).length > 20,
      `${code} is declared unreachable with no reason that names a mechanism`
    );
  }
  assert.equal(
    probed.size + declared.size,
    allocated.length,
    `band is ${allocated.length}, probed ${probed.size}, declared ${declared.size}`
  );
});
