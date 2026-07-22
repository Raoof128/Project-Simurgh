// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §11 — the Lean proof is BOUND to the implementation it claims to model.
//
// A proof that drifts from the code proves something about a program nobody runs. Stage 5N learned
// the sharp version of this: a real ceremony found a defect that 61 tests and 13 Lean theorems all
// missed, because proofs cannot see the seam where facts are manufactured. This test does not
// re-prove the theorems — Lean does that in CI — it checks that the spine the theorems quantify over
// is the SAME spine the frozen verifiers emit, and that no proof hole was introduced.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SECTION7_FIRST_FAILURE_ORDER } from "../../../../tools/simurgh-attestation/stage5o/core/section7Verifier.mjs";
import { SECTION8_FIRST_FAILURE_ORDER } from "../../../../tools/simurgh-attestation/stage5o/core/section8Verifier.mjs";
import { SECTION9_FIRST_FAILURE_ORDER } from "../../../../tools/simurgh-attestation/stage5o/core/section9Verifier.mjs";
import { rawCodeForVscReason } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const LEAN = readFileSync(
  fileURLToPath(new URL("../../../../proofs/stage5o/Vsc.lean", import.meta.url)),
  "utf8"
);
const REASONS = [
  ...SECTION7_FIRST_FAILURE_ORDER,
  ...SECTION8_FIRST_FAILURE_ORDER,
  ...SECTION9_FIRST_FAILURE_ORDER,
];
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

test("§11 the proof carries no hole and no user axiom", () => {
  assert.ok(!/\bsorry\b/.test(LEAN), "a proof hole would make every theorem vacuous");
  assert.ok(!/\badmit\b/.test(LEAN));
  assert.ok(!/^axiom\s/m.test(LEAN), "a user axiom would let the model assume its conclusion");
});

test("§11 the modelled spine IS the frozen spine: every reason, in order, with its §10 code", () => {
  const body = LEAN.slice(LEAN.indexOf("def checks"), LEAN.indexOf("def firstFail"));
  const pairs = [...body.matchAll(/\(f\.([A-Za-z0-9]+),\s*(\d+)\)/g)].map((m) => [
    m[1],
    Number(m[2]),
  ]);
  assert.equal(
    pairs.length,
    REASONS.length,
    "the Lean spine and the frozen orders differ in length"
  );
  REASONS.forEach((reason, i) => {
    assert.equal(pairs[i][0], camel(reason), `position ${i}: Lean models a different check`);
    assert.equal(
      pairs[i][1],
      rawCodeForVscReason(reason),
      `${reason}: Lean carries the wrong code`
    );
    assert.equal(pairs[i][1], 420 + i, "numeric order must equal the frozen first-failure order");
  });
});

test("§11 the Facts structure declares exactly the frozen checks, no more and no fewer", () => {
  const struct = LEAN.slice(LEAN.indexOf("structure Facts where"), LEAN.indexOf("def checks"));
  const fields = [...struct.matchAll(/^\s{2}([A-Za-z0-9]+)\s*:\s*Bool/gm)].map((m) => m[1]);
  assert.deepEqual(
    fields,
    REASONS.map(camel),
    "a spare or missing field would model a different verifier"
  );
});

test("§11 the band the totality theorem claims is the band §10 actually allocated", () => {
  assert.match(LEAN, /420 ≤ verdict f ∧ verdict f ≤ 456/, "coreTotality must claim the real band");
  assert.equal(rawCodeForVscReason(REASONS[0]), 420);
  assert.equal(rawCodeForVscReason(REASONS[REASONS.length - 1]), 456);
});

test("§11 the load-bearing theorems are present by name", () => {
  for (const name of [
    "coreTotality",
    "prefixSatisfaction",
    "prefixSatisfaction_stage5o",
    "zero_not_code",
    "green_all_ok",
    "fallingProd_add",
    "dualFormIdentity",
    "floor_inclusive",
    "floor_monotone",
    "reopen_free",
    "union_length_ge",
    "no_unbudgeted_unzip",
    "accepted_prior_within_budget",
  ]) {
    assert.match(LEAN, new RegExp(`theorem\\s+${name}\\b`), `missing theorem ${name}`);
  }
});

test("§11 the scope disclaimer is present — the model is symbolic, not cryptographic", () => {
  // The proof must not be readable as more than it is.
  assert.match(LEAN, /SYMBOLIC model/);
  assert.match(LEAN, /never collision or preimage resistance/);
  assert.match(LEAN, /never that the probability model is\n-- calibrated/);
});
