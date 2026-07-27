// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 22: the Lean core, and what the runtime owes it.
//
// A formal core beside an implementation that does something else is decoration. Each theorem below
// is paired with the runtime behaviour it is a statement about, and the pairing is asserted here.
//
// STATEMENTS ARE PINNED BY DIGEST, not by name. A file carrying all five theorem names, each proving
// `True`, passes any name-only check while proving nothing — 5P shipped a CI gate with exactly that
// hole. The digest covers the statement only, from `theorem NAME` to its `:=`, so a proof may be
// rewritten and a statement may not be quietly weakened.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  assessFamily,
  admissible,
} from "../../../../tools/simurgh-attestation/stage5r/core/admissibility.mjs";
import {
  validateDeltaSet,
  buildDeltaLedger,
  INHERITED_CELLS,
  Q0_DISCHARGED_CELLS,
} from "../../../../tools/simurgh-attestation/stage5r/core/deltaLedger.mjs";
import { suppressionInvariance } from "../../../../tools/simurgh-attestation/stage5r/core/suppression.mjs";
import { stripNonCode } from "../../../../tools/simurgh-attestation/stage5r/core/signals.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PROOFS = join(ROOT, "proofs/stage5r");
const manifest = JSON.parse(readFileSync(join(PROOFS, "manifest.json"), "utf8"));

/** The statement of a theorem: `theorem NAME ... :=`, whitespace-collapsed. */
function statementOf(file, name) {
  const text = readFileSync(join(PROOFS, file), "utf8");
  const at = text.indexOf(`theorem ${name}`);
  assert.notEqual(at, -1, `${file}: no theorem ${name}`);
  const end = text.indexOf(":=", at);
  assert.notEqual(end, -1, `${file}: theorem ${name} has no body`);
  return text.slice(at, end).replace(/\s+/g, " ").trim();
}

const PINNED = {
  L1: "274d65713b4a2e8927530394e73472bc13e3c40cf70ad5d50af6b8aaf60136b6",
  L2: "a43734b9e50a380b6eb2c94bc71aa3e76be668b5dd66758271b7964520d4fdb6",
  L3: "c3f08eee6f7d60130ca7e2cfa9f5d7d0b620afc65da211486ce57419697dbff1",
  L4: "51f24f0d7807920aebb34866a6fcdeaa3290781bebc70ab6095579243c857fa8",
  L5: "1aae806a3ff478ba952ef9f2d1f945965ac2a349eea9dbdb45ed546435128e68",
};

test("five obligations, five files, five theorems — and the STATEMENTS are pinned", () => {
  assert.equal(manifest.obligations.length, 5);
  for (const o of manifest.obligations) {
    const digest = createHash("sha256").update(statementOf(o.file, o.theorem)).digest("hex");
    assert.equal(digest, PINNED[o.id], `${o.id}: the statement of ${o.theorem} changed`);
  }
});

test("every witness the manifest names exists in the file it names", () => {
  // A theorem about a model nothing satisfies is true and worthless.
  for (const o of manifest.obligations) {
    assert.ok(o.witnesses.length >= 2, `${o.id}: fewer than two witnesses`);
    for (const w of o.witnesses) assert.ok(statementOf(o.file, w).length > 0, `${o.id}/${w}`);
  }
});

test("no proof carries an escape hatch, and the scan is not vacuous", () => {
  const escapes = /\bsorry\b|\badmit\b|\bnative_decide\b|^\s*axiom\s|\bunsafe\s|@\[implemented_by/m;
  for (const o of manifest.obligations) {
    const raw = readFileSync(join(PROOFS, o.file), "utf8");
    const code = stripNonCode(raw, "lean");
    assert.ok(code.trim().length > 0, `${o.file} strips to nothing`);
    assert.equal(escapes.test(code), false, `${o.file} contains an escape`);
    // The stripping must not be what makes it pass: the raw file still has its comments.
    assert.ok(
      raw.length > code.length,
      `${o.file}: nothing was stripped, so the check is untested`
    );
  }
});

// ---- L1: admissibility is conjunctive -------------------------------------------------------------

test("L1 corresponds: one false condition makes the runtime verdict inadmissible", () => {
  const closure = new Set(["f"]);
  const ok = (over) => ({
    vulnerable: {
      function_id: "f",
      security_role: "r",
      verdict: "detected",
      premise_recomputed: true,
      restoration_proven: true,
    },
    safe: {
      function_id: "f",
      security_role: "r",
      verdict: "not_detected",
      premise_recomputed: true,
      restoration_proven: true,
    },
    orthogonal: {
      function_id: "f",
      security_role: "r",
      verdict: "not_detected",
      premise_recomputed: true,
      restoration_proven: true,
    },
    ...over,
  });
  const family = { target_security_role: "r" };
  assert.equal(assessFamily({ family, observations: ok({}), closure }).admissible, true);
  // Six of seven is inadmissible, which is L1's witnessSixOfSevenFails in the runtime.
  const broken = assessFamily({
    family,
    observations: ok({
      orthogonal: {
        function_id: "f",
        security_role: "r",
        verdict: "detected",
        premise_recomputed: true,
        restoration_proven: true,
      },
    }),
    closure,
  });
  assert.equal(broken.admissible, false);
  assert.deepEqual(broken.failed, ["orthogonal_failure_not_misclassified"]);
});

// ---- L2: no promotion ------------------------------------------------------------------------------

test("L2 corresponds: admissible in one role, not in another", () => {
  const verdicts = [
    { admissible: true, attack_class: "R4", target_security_role: "trust_decision" },
  ];
  assert.equal(admissible(verdicts, "R4", "trust_decision"), true);
  assert.equal(admissible(verdicts, "R4", "schema_gate"), false);
});

// ---- L3: delta disjoint and inside the universe -----------------------------------------------------

test("L3 corresponds: an id outside the universe, or already 5Q's, is refused", () => {
  const bounds = {
    universe: new Set(["a", "b", "c"]),
    pairCells: new Set(["a", "b", "c"]),
    q0Discharged: new Set(["c"]),
  };
  assert.equal(validateDeltaSet(["a", "b"], bounds).ok, true);
  // The SUBSET clause, which L3 gained because disjointness alone does not bound anything.
  assert.match(validateDeltaSet(["a", "z"], bounds).reason, /not in the inherited universe/);
  assert.match(validateDeltaSet(["a", "c"], bounds).reason, /already discharged by 5Q/);
});

// ---- L4: the denominator never moves -----------------------------------------------------------------

test("L4 corresponds: no sequence of discharges changes the inherited denominator", () => {
  for (const newlyDischarged of [[], ["x"], ["x", "y", "z"]]) {
    const ledger = buildDeltaLedger({ newlyDischarged });
    assert.equal(ledger.inherited_cells, INHERITED_CELLS);
    assert.equal(ledger.q0_original_discharged, Q0_DISCHARGED_CELLS);
    assert.equal(ledger.q0_original_coverage_percent, "6.2");
  }
});

// ---- L5: invariance under ALL surrogates ---------------------------------------------------------------

test("L5 corresponds: the disjunction detector survives one-at-a-time and is caught by all-at-once", () => {
  // This is the defect the Lean statement made explicit and the implementation was corrected for: a
  // detector reading `exit code OR threw OR stderr` never moves when one surrogate is suppressed.
  const sadness = (o) =>
    o.exit_code !== 0 || o.threw || o.stderr !== "" ? "detected" : "not_detected";
  const loud = {
    exit_code: 1,
    threw: true,
    stderr: "boom",
    parse_failed: true,
    elapsed_ms: 9,
    generic_error_match: true,
    declared_signal_present: false,
  };
  const r = suppressionInvariance({ observation: loud, detector: sadness });
  assert.equal(r.invariant, false, "a sadness detector must not be certified invariant");
  assert.deepEqual(
    r.changed.map((c) => c.surrogate),
    ["ALL_SURROGATES_AT_ONCE"],
    "no SINGLE suppression moves it — which is exactly why all-at-once is required"
  );

  // An honest detector reads the declared property and is invariant, so the check is not one that
  // refuses everything.
  const honest = (o) => (o.declared_signal_present ? "detected" : "not_detected");
  assert.equal(suppressionInvariance({ observation: loud, detector: honest }).invariant, true);
});
