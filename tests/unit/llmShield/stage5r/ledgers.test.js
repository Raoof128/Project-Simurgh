// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 23: the two ledgers, and the disclosure that keeps their numbers honest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  fourTermDisclosure,
  familyResultCensus,
  cumulativeView,
  buildFindingLedger,
  UNDER_SUPPORTED_CELLS,
  UNIVERSE_PAIRS,
} from "../../../../tools/simurgh-attestation/stage5r/core/ledgers.mjs";
import {
  INHERITED_CELLS,
  Q0_DISCHARGED_CELLS,
  validateDeltaSet,
} from "../../../../tools/simurgh-attestation/stage5r/core/deltaLedger.mjs";
import {
  buildArtefact as buildDelta,
  DELTA_PATH,
  readCampaign,
} from "../../../../tools/simurgh-attestation/stage5r/node/buildDeltaLedger.mjs";
import {
  buildArtefact as buildFindings,
  LEDGER_PATH,
} from "../../../../tools/simurgh-attestation/stage5r/node/buildFindingLedger.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const delta = JSON.parse(buildDelta(ROOT));
const findings = JSON.parse(buildFindings(ROOT));

test("both ledgers are byte-stable, and match their committed copies", () => {
  assert.equal(buildDelta(ROOT), buildDelta(ROOT));
  assert.equal(buildFindings(ROOT), buildFindings(ROOT));
  for (const [path, build] of [
    [DELTA_PATH, buildDelta],
    [LEDGER_PATH, buildFindings],
  ]) {
    const committed = join(ROOT, path);
    if (existsSync(committed)) assert.equal(readFileSync(committed, "utf8"), build(ROOT));
  }
});

test("ALL 55 pairs carry exactly one terminal state (Ruling 3)", () => {
  const census = delta.family_result_census;
  assert.equal(census.row_count, UNIVERSE_PAIRS);
  assert.equal(census.rows.length, UNIVERSE_PAIRS);
  const keys = census.rows.map((r) => `${r.attack_class}|${r.target_security_role}`);
  assert.equal(new Set(keys).size, UNIVERSE_PAIRS, "a pair appears twice");
  const total = Object.values(census.by_terminal_state).reduce((a, b) => a + b, 0);
  assert.equal(total, UNIVERSE_PAIRS, "the states do not partition the universe");
  assert.equal(census.by_terminal_state.admissible, 8);
  assert.equal(census.by_terminal_state.not_attempted_in_this_tranche, 47);
});

test("a census that is not total is REFUSED", () => {
  const rows = delta.family_result_census.rows;
  assert.throws(() => familyResultCensus(rows.slice(1)), /54 rows/);
  const stateless = rows.map((r, i) => (i === 0 ? { ...r, terminal_state: undefined } : r));
  assert.throws(() => familyResultCensus(stateless), /no state/);
});

test("the delta never intersects 5Q's discharged set, and the check is live", () => {
  assert.deepEqual(delta.newly_discharged_cells, []);
  assert.equal(delta.newly_discharged_count, 0);
  const bounds = {
    universe: new Set(["a", "b"]),
    pairCells: new Set(["a", "b"]),
    q0Discharged: new Set(["b"]),
  };
  assert.equal(validateDeltaSet(["a"], bounds).ok, true);
  assert.match(validateDeltaSet(["b"], bounds).reason, /already discharged by 5Q/);
});

test("the denominator is the constant, and both figures stay in one relationship", () => {
  assert.equal(delta.inherited_cells, INHERITED_CELLS);
  assert.equal(delta.q0_original_discharged, Q0_DISCHARGED_CELLS);
  assert.equal(delta.q0_original_coverage_percent, "6.2");
  assert.equal(delta.cumulative_5r_coverage_percent, "6.2");
  assert.equal(delta.label, "5R cumulative");
  assert.match(delta.cumulative_view.the_two_sentences, /6\.2% stays 6\.2% forever/);
  assert.ok(!("coverage" in delta), "a bare coverage field is exactly what §6.2 forbids");
});

test("THE FOUR TERMS TRAVEL TOGETHER, and the arithmetic is the integer rule", () => {
  const d = fourTermDisclosure({ admissible: 8, attempted: 8, newlyDischarged: 0 });
  assert.equal(d.families.text, "8 admissible / 8 attempted / 55 in the universe");
  assert.equal(
    d.cells.text,
    `0 newly discharged / ${UNDER_SUPPORTED_CELLS} under-supported / ${INHERITED_CELLS} inherited`
  );
  assert.equal(d.percent_of_under_supported, "0.0");
  assert.equal(d.percent_of_inherited, "0.0");
  // Round-half-up, in tenths, checked against a value whose float form would tempt a rounding bug.
  const half = fourTermDisclosure({ admissible: 1, attempted: 1, newlyDischarged: 1438 });
  assert.equal(half.percent_of_inherited, "6.2");
});

test("a disclosure whose terms are impossible is REFUSED", () => {
  assert.throws(
    () => fourTermDisclosure({ admissible: 9, attempted: 8, newlyDischarged: 0 }),
    /more families admissible than attempted/
  );
  assert.throws(
    () => fourTermDisclosure({ admissible: 1, attempted: 56, newlyDischarged: 0 }),
    /than the universe holds/
  );
  assert.throws(
    () => fourTermDisclosure({ admissible: 1.5, attempted: 8, newlyDischarged: 0 }),
    /integer count/
  );
});

test("the opening record is INHERITED — 5Q's disposition is quoted, not replaced", () => {
  const o = findings.opening_finding;
  assert.equal(o.finding_id, "5Q-F013");
  assert.equal(o.about_stage, "5q");
  assert.match(o.inherited_digest, /^[0-9a-f]{64}$/);
  const addendum = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5q/attestation/closeout-addendum.json"),
      "utf8"
    )
  );
  assert.equal(o.q0_disposition_quoted, addendum.disposition, "5Q's own words, verbatim");
  assert.equal(o.observed_result, addendum.finding.observed_result, "content is not re-derived");
  assert.equal(o.severity, addendum.finding.severity, "not re-classified");
  assert.match(o.vpf_disposition, /5R IS the lawful outgoing transition/);
  assert.notEqual(o.vpf_disposition, o.q0_disposition_quoted);
});

test("THE LEDGER RECORDS FINDINGS AGAINST 5R ITSELF", () => {
  // §7.3's gap: 5Q's twelve findings all named another stage.
  assert.ok(findings.findings_against_self >= 2, "a stage that finds nothing wrong with itself");
  const self = findings.records.filter((r) => r.about_stage === "5r");
  const ids = self.map((r) => r.finding_id);
  assert.ok(ids.includes("5R-F008"), "the zero-delta bound must be recorded, not just explained");
  assert.ok(ids.includes("5R-F009"), "the label-reading detector must be recorded under signature");
  const f009 = self.find((r) => r.finding_id === "5R-F009");
  assert.match(f009.observed_result, /marker comment/);
  assert.match(f009.repaired_by, /N7/);
});

test("the six prior-family records carry their failing conditions and withdraw nothing", () => {
  const prior = findings.records.filter((r) => /5R-F00[2-7]/.test(r.finding_id));
  assert.equal(prior.length, 6);
  for (const r of prior) {
    assert.equal(r.about_stage, "5q");
    assert.equal(r.judges_a_historical_artefact_against_a_later_contract, true);
    assert.match(r.observed_result, /fails \d of seven/);
    assert.match(r.why_not_stronger, /1 438 cells stand/);
  }
});

test("EVERY candidate finding is adjudicated — none ships unrefuted", () => {
  assert.equal(findings.candidate_findings_raised, 18);
  assert.equal(findings.candidate_findings_unrefuted, 0);
  for (const c of findings.adjudicated_candidates) {
    assert.equal(c.verdict, "refuted");
    assert.ok(c.refutation.length > 40, `${c.function_id}: no real refutation`);
    assert.ok(!c.refutation.startsWith("no refutation"), c.function_id);
  }
});

test("a severity outside the closed vocabulary is REFUSED", () => {
  const args = { opening: { finding_id: "X" }, adjudicated: [], census: null, disclosure: null };
  assert.throws(
    () =>
      buildFindingLedger({
        ...args,
        records: [{ finding_id: "Y", about_stage: "5r", severity: "critical" }],
      }),
    /outside the closed vocabulary/
  );
  assert.throws(
    () =>
      buildFindingLedger({
        ...args,
        records: [{ finding_id: "X", about_stage: "5r", severity: "assurance_only" }],
      }),
    /duplicate finding_id/
  );
});

test("cumulativeView never lets the two figures drift apart", () => {
  const v = cumulativeView(0);
  assert.match(v.q0_original, /^6\.2% \(1438 of 23332\)$/);
  assert.match(v.cumulative_5r, /^6\.2% \(1438 of 23332\)$/);
  const moved = cumulativeView(1000);
  assert.match(moved.q0_original, /^6\.2% \(1438 of 23332\)$/, "5Q's figure must not move");
  // 2438/23332 is 10.4%, NOT the 10.5% that appears elsewhere in this stage — that one is the
  // mutation-tested fraction 2118/20213 and has nothing to do with coverage. Two unrelated figures
  // one tenth apart is exactly the confusion §6.2 exists to make impossible, and it caught me
  // writing this test before it caught anyone reading the ledger.
  assert.match(moved.cumulative_5r, /^10\.4% \(2438 of 23332\)$/);
});

test("the campaign the ledgers read is the campaign that ran", () => {
  const { cells, result } = readCampaign(ROOT);
  assert.equal(cells.length, result.cells.total);
  assert.equal(delta.cells_examined, 2406);
  assert.equal(delta.candidate_findings_raised, 18);
});
