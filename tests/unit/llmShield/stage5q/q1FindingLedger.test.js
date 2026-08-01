// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The Q1 finding ledger keeps its own claims honest.
//
// Q1-F004's lesson, applied to the file that records Q1-F004: assertions about a defect must be
// EXACT, never one-sided. Each reproduction below re-executes the recorded vector and demands the
// recorded output verbatim, so the test fails if 5R's stripper is repaired, if it degrades
// further, or if the ledger's prose drifts from what the code does. A finding nobody re-runs is a
// claim, and this repository's whole argument is that claims are not evidence.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { stripNonCode } from "../../../../tools/simurgh-attestation/stage5r/core/signals.mjs";
import { stripLeanComments } from "../../../../scripts/lib/leanProofGate.mjs";

const LEDGER = "docs/research/llm-shield/evidence/stage-5q-q1/q1-finding-ledger.json";
const ledger = () => JSON.parse(readFileSync(LEDGER, "utf8"));

const REQUIRED = [
  "id",
  "title",
  "measured_at_commit",
  "affected_artifact",
  "reproduction",
  "security_or_assurance_effect",
  "resolution_status",
  "disposition",
  "future_stage_reference",
];

test("[q1] every finding carries the full record shape, with nothing blank", () => {
  const j = ledger();
  assert.ok(j.findings.length >= 3, "the ledger holds fewer findings than were recorded");
  for (const f of j.findings) {
    for (const field of REQUIRED) {
      assert.ok(field in f, `${f.id ?? "<unnamed>"} is missing ${field}`);
      assert.notEqual(String(f[field]).trim(), "", `${f.id} has an empty ${field}`);
    }
    assert.match(f.id, /^Q1-F\d{3}$/);
    assert.ok(
      ["resolved", "superseded_not_patched", "open"].includes(f.resolution_status),
      `${f.id} carries an unrecognised resolution_status: ${f.resolution_status}`
    );
  }
});

test("[q1] finding ids are dense and ordered — a gap means one was allocated and dropped", () => {
  const ids = ledger().findings.map((f) => Number(f.id.slice(-3)));
  assert.deepEqual(
    ids,
    [...ids].sort((a, b) => a - b),
    "ids are out of order"
  );
  for (let i = 1; i < ids.length; i++) {
    assert.equal(ids[i], ids[i - 1] + 1, `a gap between Q1-F${ids[i - 1]} and Q1-F${ids[i]}`);
  }
  assert.equal(ids[0], 2, "Q1-F001 is the parent mandate, so the findings start at F002");
});

const F003_A = "theorem a : True := trivial\n/- open forever\nsorry\n";
const F003_B = "theorem t : True := by\n  have a' : Nat := 1\n  sorry\n  have b' : Nat := 2\n";

test("[q1-f003-a] the recorded vector still reproduces: unterminated /- conceals a sorry", () => {
  const code = stripNonCode(F003_A, "lean");
  assert.equal(code, "theorem a : True := trivial\n\n\n");
  assert.equal(/\bsorry\b/.test(code), false, "the scan can now see it — re-disposition Q1-F003-A");
  assert.notEqual(code.trim(), "", "and the file does not strip to nothing, so no guard fires");
});

test("[q1-f003-b] the recorded vector still reproduces: primed identifiers drop a sorry", () => {
  const code = stripNonCode(F003_B, "lean");
  assert.equal(code, "theorem t : True := by\n  have a'' : Nat := 2\n");
  assert.equal(/\bsorry\b/.test(code), false, "the scan can now see it — re-disposition Q1-F003-B");
  assert.notEqual(code.trim(), "", "and the survivor still looks like plausible code");
});

test("[q1-f003] the REPAIRED stripper catches both vectors that 5R's misses", () => {
  // `superseded_not_patched` is only an honest disposition if the successor actually differs.
  assert.equal(stripLeanComments(F003_A).error, "unterminated_comment");
  assert.equal(/\bsorry\b/.test(stripLeanComments(F003_B).code), true);
});

test("[q1-f002] the pin the ledger cites exists and matches the recorded delta", () => {
  const f = ledger().findings.find((x) => x.id === "Q1-F002");
  const pin = JSON.parse(
    readFileSync("docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json", "utf8")
  );
  // The BASELINE, not the live census. v1 read one shared field, so any later stage that added a
  // workflow step could only go green by editing the number this finding recorded (5S-F015).
  assert.equal(pin.baseline.entry_count, f.observed_result["v2.53.0-stage-5r-vpf"].problems);
  assert.equal(pin.baseline.immutable, true);
  for (const gateId of f.observed_result.delta) {
    assert.ok(
      pin.baseline.gate_problems.some((e) => e.gate_id === gateId),
      `${gateId} is recorded as a delta entry but is absent from the pin`
    );
  }
});

test("[q1-f001] the Q0 capture the mandate depends on is present and pinned", () => {
  const bytes = readFileSync(
    "docs/research/llm-shield/evidence/stage-5q-q1/f001-workflow-at-q0.yml"
  );
  assert.ok(bytes.length > 0);
  const frozen = JSON.parse(
    readFileSync(
      "docs/research/llm-shield/evidence/stage-5q/findings/q0-finding-ledger.json",
      "utf8"
    )
  );
  const f001 = frozen.records.find((r) => r.finding_id === "5Q-F001");
  assert.ok(f001.claim_impact.claim_digest, "the frozen record must still pin a claim digest");
});
