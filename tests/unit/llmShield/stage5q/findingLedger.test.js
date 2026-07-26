// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 10 — the append-only hash-chained finding ledger. L3 made mechanical.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyLedger,
  appendFinding,
  allocateFindingId,
  verifyChain,
  ledgerDigest,
  validateRecord,
  isDeeplyFrozen,
  Q0_FIELDS,
  Q1_FIELDS,
} from "../../../../tools/simurgh-attestation/stage5q/core/findingLedger.mjs";
import {
  SEVERITIES,
  DISCOVERED_BY,
} from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const D = (c) => c.repeat(64);

const q0 = (over = {}) => ({
  finding_id: "5Q-F001",
  affected_stage: "5i",
  affected_function_id: "5i:proofs/stage5i/PanelCoverage.lean:panel_covers",
  affected_tags: ["v2.44.0-stage-5i-vpc"],
  attack_class: "R10",
  premise_receipt: D("a"),
  expected_result: "ci_type_checks_every_proof",
  observed_result: "five_proofs_reached_by_no_ci_path",
  exploit_fixture_digest: D("b"),
  severity: "assurance_only",
  claim_impact: {
    file: ".github/workflows/stage-4-lean-proofs.yml",
    claim_digest: D("c"),
    quote: "Type-check the Stage 4 formal core",
  },
  scope: "both",
  discovered_at_commit: "d".repeat(40),
  discovered_by: "pre_stage_design_review",
  corroborated_by: [],
  ...over,
});

const q1 = (over = {}) => ({
  finding_id: "5Q-F001",
  fixed_at_commit: "e".repeat(40),
  regression_fixture: { fixture_digest: D("f"), fails_before: true, passes_after: true },
  post_fix_result: "ci_enumerates_the_proof_directory",
  remaining_scope: "historical tags still carry the name-listed workflow",
  historical_tags_still_affected: ["v2.44.0-stage-5i-vpc"],
  ...over,
});

const withOne = () => appendFinding(emptyLedger(), q0());

// ---------------------------------------------------------------------------------------------
// The full §5.1 field set
// ---------------------------------------------------------------------------------------------

test("every §5.1 field is REQUIRED, including discovered_by and corroborated_by", () => {
  for (const field of Q0_FIELDS) {
    const record = q0();
    delete record[field];
    assert.throws(
      () => appendFinding(emptyLedger(), record),
      new RegExp(field === "finding_id" ? "finding_id" : `missing required field: ${field}`),
      `${field} must be required`
    );
  }
});

test("discovered_by accepts only the three frozen values", () => {
  for (const value of DISCOVERED_BY) {
    assert.doesNotThrow(() => appendFinding(emptyLedger(), q0({ discovered_by: value })));
  }
  assert.throws(
    () => appendFinding(emptyLedger(), q0({ discovered_by: "the_harness" })),
    /discovered_by must be one of the frozen three/
  );
});

test("discovered_by and corroborated_by are DISTINCT — the harness cannot re-credit discovery", () => {
  // A finding surfaced by human design review and later reproduced by the harness is CORROBORATED,
  // not DISCOVERED. Collapsing the two would let 5Q claim its machinery found defects a person
  // found by reading — the reporting analogue of R15, committed against ourselves.
  const l = appendFinding(
    emptyLedger(),
    q0({ discovered_by: "pre_stage_design_review", corroborated_by: ["5q-5i-r10-01"] })
  );
  assert.equal(l.records[0].discovered_by, "pre_stage_design_review");
  assert.deepEqual(l.records[0].corroborated_by, ["5q-5i-r10-01"]);
});

test("an unfrozen severity or attack class or scope is rejected", () => {
  assert.throws(() => appendFinding(emptyLedger(), q0({ severity: "critical" })), /frozen four/);
  assert.throws(() => appendFinding(emptyLedger(), q0({ attack_class: "R99" })), /frozen class/);
  assert.throws(
    () => appendFinding(emptyLedger(), q0({ scope: "everywhere" })),
    /head \| tags \| both/
  );
  for (const s of SEVERITIES) {
    assert.doesNotThrow(() => appendFinding(emptyLedger(), q0({ severity: s })));
  }
});

test("a field not in the §5.1 record is rejected", () => {
  assert.throws(() => appendFinding(emptyLedger(), q0({ note: "trust me" })), /not permitted/);
});

// ---------------------------------------------------------------------------------------------
// claim_impact must POINT somewhere (spec §5.4)
// ---------------------------------------------------------------------------------------------

test("claim_impact requires file + claim digest + bounded quote; PROSE ALONE is rejected", () => {
  assert.throws(
    () => appendFinding(emptyLedger(), q0({ claim_impact: "weakens confidence in the proofs" })),
    /Prose alone is rejected|a claim pointed at vaguely/
  );
});

test("claim_impact is rejected piecewise — a missing file, digest or quote each fails", () => {
  const base = q0().claim_impact;
  assert.throws(
    () => appendFinding(emptyLedger(), q0({ claim_impact: { ...base, file: "" } })),
    /claim_impact.file/
  );
  assert.throws(
    () => appendFinding(emptyLedger(), q0({ claim_impact: { ...base, claim_digest: "short" } })),
    /64 hex/
  );
  assert.throws(
    () => appendFinding(emptyLedger(), q0({ claim_impact: { ...base, quote: "   " } })),
    /quote is required/
  );
});

test("the quote is BOUNDED — a citation, not a copy of the document", () => {
  assert.throws(
    () =>
      appendFinding(
        emptyLedger(),
        q0({ claim_impact: { ...q0().claim_impact, quote: "x".repeat(301) } })
      ),
    /a quote is a citation, not a copy/
  );
});

// ---------------------------------------------------------------------------------------------
// APPEND-ONLY — enforced, not documented
// ---------------------------------------------------------------------------------------------

test("an appended record cannot be edited — the ledger is deeply frozen", () => {
  const l = withOne();
  assert.throws(() => {
    l.records[0].observed_result = "actually_it_was_fine";
  }, TypeError);
  assert.throws(() => {
    l.records.push({});
  }, TypeError);
  assert.equal(l.records[0].observed_result, "five_proofs_reached_by_no_ci_path");
});

test("DEEP freeze is verified by walking every reachable object, not the top level", () => {
  // Gauntlet P2-13. A top-level Object.freeze leaves every nested object writable, and
  // `claim_impact.quote` is exactly the nested field somebody would want to soften later.
  const l = withOne();
  assert.equal(isDeeplyFrozen(l), true);
  assert.throws(() => {
    l.records[0].claim_impact.quote = "something milder";
  }, TypeError);
  assert.throws(() => {
    l.records[0].affected_tags.push("v2.51.0-stage-5p-vsi");
  }, TypeError);
});

test("CALLER MUTATION AFTER APPEND DOES NOTHING — the record was deep-CLONED on the way in", () => {
  // Gauntlet P1-21. Returning a new top-level object is not enough: a retained nested reference is
  // a live edit path into an already-appended record. 5P got this right by accident; here it is
  // designed, so this test is the design.
  const mine = q0();
  const l = appendFinding(emptyLedger(), mine);

  mine.observed_result = "no_problem_after_all";
  mine.claim_impact.quote = "a much weaker sentence";
  mine.affected_tags.push("v2.51.0-stage-5p-vsi");

  assert.equal(l.records[0].observed_result, "five_proofs_reached_by_no_ci_path");
  assert.equal(l.records[0].claim_impact.quote, "Type-check the Stage 4 formal core");
  assert.deepEqual(l.records[0].affected_tags, ["v2.44.0-stage-5i-vpc"]);
  assert.equal(verifyChain(l).ok, true, "and the chain still verifies");
});

test("appendFinding returns a NEW ledger; the input is unchanged", () => {
  const before = emptyLedger();
  const after = appendFinding(before, q0());
  assert.equal(before.records.length, 0);
  assert.equal(after.records.length, 1);
});

// ---------------------------------------------------------------------------------------------
// Severity is immutable (spec §5.3) — escalation mints a new finding
// ---------------------------------------------------------------------------------------------

test("SEVERITY CANNOT BE CHANGED after append, and the caller is told to mint a new finding", () => {
  const l = withOne();
  assert.throws(
    () => appendFinding(l, q0({ severity: "claim_falsifying" })),
    /escalation MINTS A NEW FINDING|camera was pointed away/
  );
});

test("the escalation path works: a second, distinct finding with its own id", () => {
  // The governing §14 example. F001 stays `assurance_only` — the proofs may be perfectly valid;
  // what was false was the belief that CI checked them. A real proof failure is a DIFFERENT defect.
  let l = withOne();
  const next = allocateFindingId(l);
  assert.equal(next, "5Q-F002");
  l = appendFinding(l, q0({ finding_id: next, severity: "claim_narrowing" }));
  assert.equal(l.records[0].severity, "assurance_only", "F001 keeps its severity forever");
  assert.equal(l.records[1].severity, "claim_narrowing");
  assert.equal(verifyChain(l).ok, true);
});

test("re-appending an existing id is refused even when NOTHING changed", () => {
  const l = withOne();
  assert.throws(() => appendFinding(l, q0()), /already in the ledger|never reused/);
});

// ---------------------------------------------------------------------------------------------
// Id allocation reads the CHAIN, never the array length
// ---------------------------------------------------------------------------------------------

test("allocateFindingId is monotonic and is NEVER inferred from array length", () => {
  // Length is a property of an array; identity is a property of a ledger. They diverge the moment
  // anything is filtered, superseded or projected — after which two findings get one id and the
  // older stops being citable.
  let l = emptyLedger();
  assert.equal(allocateFindingId(l), "5Q-F001");
  l = appendFinding(l, q0({ finding_id: "5Q-F007" }));
  assert.equal(
    allocateFindingId(l),
    "5Q-F008",
    "one record, but the next id is 008 — it read the chain, not the length"
  );
  l = appendFinding(l, q0({ finding_id: "5Q-F003" }));
  assert.equal(allocateFindingId(l), "5Q-F008", "and it takes the MAXIMUM, not the last appended");
});

test("an id reused after a record is superseded is rejected", () => {
  let l = withOne();
  l = appendFinding(l, q1(), { kind: "q1" });
  assert.throws(
    () => appendFinding(l, q0({ severity: "assurance_only" })),
    /already in the ledger/,
    "a repaired finding does not free its id"
  );
});

test("a malformed finding id is rejected", () => {
  for (const bad of ["F001", "5Q-1", "5q-f001", "5Q-F1"]) {
    assert.throws(() => appendFinding(emptyLedger(), q0({ finding_id: bad })), /5Q-F###/);
  }
});

// ---------------------------------------------------------------------------------------------
// The hash chain
// ---------------------------------------------------------------------------------------------

test("a clean chain verifies and the digest is stable", () => {
  let l = withOne();
  l = appendFinding(l, q0({ finding_id: "5Q-F002" }));
  l = appendFinding(l, q0({ finding_id: "5Q-F003" }));
  assert.deepEqual(verifyChain(l), { ok: true, brokenAt: null });
  assert.equal(ledgerDigest(l), ledgerDigest(l));
});

test("a TAMPERED MIDDLE record is detected and its INDEX is reported", () => {
  // "The chain is broken" is not actionable. "Record 1 is not what record 2 committed to" is.
  let l = withOne();
  l = appendFinding(l, q0({ finding_id: "5Q-F002" }));
  l = appendFinding(l, q0({ finding_id: "5Q-F003" }));

  const tampered = {
    ...l,
    records: l.records.map((r, i) =>
      i === 1 ? { ...r, severity: "hygiene", observed_result: "nothing_to_see" } : r
    ),
  };
  const v = verifyChain(tampered);
  assert.equal(v.ok, false);
  assert.equal(v.brokenAt, 1);
  assert.match(v.reason, /contents changed after it was appended/);
});

test("a REMOVED record breaks the chain — deletion is not a quiet operation", () => {
  let l = withOne();
  l = appendFinding(l, q0({ finding_id: "5Q-F002" }));
  const truncated = { ...l, records: [l.records[0]] };
  const v = verifyChain(truncated);
  assert.equal(v.ok, false, "L3: no erased finding");
  assert.match(v.reason, /head_digest does not match the tail/);
});

test("a REORDERED pair breaks the chain", () => {
  let l = withOne();
  l = appendFinding(l, q0({ finding_id: "5Q-F002" }));
  const swapped = { ...l, records: [l.records[1], l.records[0]] };
  assert.equal(verifyChain(swapped).ok, false);
  assert.equal(verifyChain(swapped).brokenAt, 0);
});

test("the ledger digest moves when a record is added", () => {
  const one = withOne();
  const two = appendFinding(one, q0({ finding_id: "5Q-F002" }));
  assert.notEqual(ledgerDigest(one), ledgerDigest(two));
});

// ---------------------------------------------------------------------------------------------
// Q1 records — appended, never merged into Q0 (spec §5.2)
// ---------------------------------------------------------------------------------------------

test("a Q1 record referencing a NONEXISTENT finding_id is rejected", () => {
  assert.throws(
    () => appendFinding(emptyLedger(), q1({ finding_id: "5Q-F404" }), { kind: "q1" }),
    /not a Q0 finding in this ledger/
  );
});

test("a Q1 record is APPENDED, never merged — the Q0 record is untouched", () => {
  let l = withOne();
  const q0DigestBefore = l.records[0].record_digest;
  l = appendFinding(l, q1(), { kind: "q1" });
  assert.equal(l.records.length, 2);
  assert.equal(l.records[0].record_digest, q0DigestBefore, "Q0 is not rewritten by its repair");
  assert.equal(l.records[0].record_kind, "q0");
  assert.equal(l.records[1].record_kind, "q1");
  assert.equal(verifyChain(l).ok, true);
});

test("a Q1 record with NO regression fixture is rejected", () => {
  // A fix with no failing-before witness is an assertion that a bug existed (spec §5.2).
  const l = withOne();
  assert.throws(
    () => appendFinding(l, { ...q1(), regression_fixture: undefined }, { kind: "q1" }),
    /missing required field: regression_fixture/
  );
});

test("a regression fixture that does not FAIL BEFORE is rejected", () => {
  const l = withOne();
  assert.throws(
    () =>
      appendFinding(
        l,
        q1({
          regression_fixture: { fixture_digest: D("f"), fails_before: false, passes_after: true },
        }),
        { kind: "q1" }
      ),
    /assertion that a bug existed/
  );
});

test("a Q1 record cannot carry Q0 fields — the two records stay separate", () => {
  const l = withOne();
  assert.throws(
    () => appendFinding(l, { ...q1(), severity: "hygiene" }, { kind: "q1" }),
    /not permitted in a q1 record/
  );
  assert.deepEqual(
    Q1_FIELDS.filter((f) => Q0_FIELDS.includes(f)),
    ["finding_id"],
    "finding_id is the only shared field — it is the foreign key, not a merge point"
  );
});

test("validateRecord is usable standalone and reports EVERY problem, not just the first", () => {
  const r = validateRecord(
    { finding_id: "5Q-F001", severity: "nope", scope: "nope" },
    "q0",
    emptyLedger()
  );
  assert.equal(r.ok, false);
  assert.ok(r.problems.length > 3, "a reviewer fixes a record once, not one field per run");
});
