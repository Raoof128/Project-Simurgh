// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — finding 5Q-F013: the Q0→Q1 lifecycle deadlock.
//
// A deadlock asserted in prose is an argument. These tests exist so it is a COMPUTATION over the
// declared phase table — and so the two things that would make the finding wrong are checked
// rather than assumed: that some phase can in fact produce the missing artifact, or that the
// condition needs no artifact at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createPublicKey, verify as verifyRaw } from "node:crypto";
import {
  PHASES,
  CONDITION_REQUIREMENTS,
  phaseDeadlock,
} from "../../../../tools/simurgh-attestation/stage5q/core/lifecycle.mjs";
import { buildFinding } from "../../../../tools/simurgh-attestation/stage5q/node/closeoutAddendum.mjs";
import {
  signingInput,
  sha256Hex,
} from "../../../../tools/simurgh-attestation/stage5q/core/attestation.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { TRANSITION_CONDITIONS } from "../../../../tools/simurgh-attestation/stage5q/core/transition.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const ADDENDUM = `${E}/attestation/closeout-addendum.json`;

test("the phase table is exhaustive and Q0_TRANSITION may produce NOTHING", () => {
  // The empty `may_produce` is the load-bearing fact. The plan says Task 21 is "validation only. No
  // new evidence is produced." A phase that may produce nothing cannot satisfy a condition that
  // needs something.
  assert.deepEqual(
    PHASES.map((p) => p.id),
    ["Q0_PREPARATION", "Q0_DISCOVERY", "Q0_TRANSITION", "Q1"]
  );
  assert.deepEqual(PHASES.find((p) => p.id === "Q0_TRANSITION").may_produce, []);
});

test("every transition condition has a declared requirement", () => {
  // A condition with no entry would be silently treated as satisfiable, which is how a deadlock
  // gets computed away instead of found.
  for (const id of TRANSITION_CONDITIONS) {
    assert.ok(CONDITION_REQUIREMENTS[id], `${id} has no declared requirement`);
  }
});

test("T3 and T7 are BLOCKED from Q0_TRANSITION — no reachable phase may produce what they need", () => {
  const r = phaseDeadlock({ unsatisfied: ["T3", "T7"], currentPhase: "Q0_TRANSITION" });
  assert.equal(r.deadlocked, true);
  assert.deepEqual(
    r.blocked.map((b) => b.condition),
    ["T3", "T7"]
  );
  assert.deepEqual(r.reachable_phases, ["Q0_TRANSITION"]);
});

test("the SAME conditions are NOT blocked earlier — the deadlock is created by the freeze", () => {
  // If they were blocked from Q0_DISCOVERY too, the finding would be about a permanently impossible
  // contract rather than about a state the stage walked into. They are not: discovery may produce
  // coverage evidence. What closed the door was signing the freeze.
  const during = phaseDeadlock({ unsatisfied: ["T3"], currentPhase: "Q0_DISCOVERY" });
  assert.equal(during.deadlocked, false);
  assert.match(during.escapes[0].resolution, /Q0_DISCOVERY may produce coverage_evidence/);
});

test("T2 is NOT part of the deadlock — the primitive does accommodate incompleteness", () => {
  // This is what makes the finding claim_NARROWING rather than claim_falsifying. A partly
  // inadmissible Q0 transitions fine, because recording inadmissibility needs no new artifact.
  assert.equal(CONDITION_REQUIREMENTS.T2.needs, null);
  const r = phaseDeadlock({ unsatisfied: ["T2"], currentPhase: "Q0_TRANSITION" });
  assert.equal(r.deadlocked, false);
});

test("a condition needing nothing is an escape, not a block", () => {
  for (const id of ["T2", "T4", "T5", "T6"]) {
    assert.equal(
      phaseDeadlock({ unsatisfied: [id], currentPhase: "Q0_TRANSITION" }).deadlocked,
      false,
      `${id} should not deadlock`
    );
  }
});

test("an unknown phase or condition THROWS rather than reporting 'no deadlock'", () => {
  // Failing open here would make the finding disappear the moment a name was misspelled.
  assert.throws(() => phaseDeadlock({ unsatisfied: ["T3"], currentPhase: "Q2" }), /unknown phase/);
  assert.throws(
    () => phaseDeadlock({ unsatisfied: ["T99"], currentPhase: "Q0_TRANSITION" }),
    /unknown condition/
  );
});

test("F013 is classified claim_narrowing, with the rationale computed from T2", () => {
  const finding = buildFinding({
    deadlock: phaseDeadlock({ unsatisfied: ["T3", "T7"], currentPhase: "Q0_TRANSITION" }),
    unsatisfied: ["T3", "T7"],
  });
  assert.equal(finding.finding_id, "5Q-F013");
  assert.equal(finding.severity, "claim_narrowing");
  assert.equal(finding.discovered_by, "external");
  assert.match(finding.narrowing_rationale, /T2 transitions on a partly-inadmissible Q0/);
});

// ------------------------------------------------------------------------------------------------
// The addendum must not have reopened anything.
// ------------------------------------------------------------------------------------------------

test("the Q0 ledger still holds TWELVE records — F013 was not inserted", () => {
  // Appending would move q0_finding_ledger_digest, one of the ten signed roots. L3 forbids an
  // erased finding; the same reasoning forbids an inserted one, or the ledger stops being a record
  // of what was known when it was signed.
  const ledger = JSON.parse(readFileSync(`${E}/findings/q0-finding-ledger.json`, "utf8"));
  assert.equal(ledger.record_count, 12);
  assert.equal(
    ledger.records.some((r) => r.finding_id === "5Q-F013"),
    false,
    "F013 must not be in the frozen ledger"
  );
});

test("the addendum binds the Q0 digests and states it is NOT covered by them", () => {
  if (!existsSync(ADDENDUM)) return;
  const a = JSON.parse(readFileSync(ADDENDUM, "utf8"));
  const bundle = JSON.parse(readFileSync(`${E}/attestation/public-structural-bundle.json`, "utf8"));
  const ledger = JSON.parse(readFileSync(`${E}/findings/q0-finding-ledger.json`, "utf8"));

  assert.equal(a.bound_to_q0_public_digest, sha256Hex(Buffer.from(canonicalJson(bundle), "utf8")));
  assert.equal(a.q0_finding_ledger_digest_unchanged, ledger.q0_finding_ledger_digest);
  assert.equal(a.q0_ledger_record_count, 12);
  // Reading it as part of the signed Q0 result would be backdating, so it says so in its own body.
  assert.match(a.not_covered_by, /NOT covered by its ten roots/);
});

test("the addendum is signed by the SAME key that signed Q0", () => {
  // An addendum signed by an unrelated key is indistinguishable from a third party's commentary.
  if (!existsSync(ADDENDUM)) return;
  const a = JSON.parse(readFileSync(ADDENDUM, "utf8"));
  const profile = JSON.parse(
    readFileSync("tools/simurgh-attestation/stage5q/signer/stage5q-signer-profile.json", "utf8")
  );
  assert.equal(a.signature.public_key_b64, profile.public_key_b64);

  const { signature, addendum_digest, ...body } = a;
  assert.equal(sha256Hex(Buffer.from(canonicalJson(body), "utf8")), addendum_digest);
  const ok = verifyRaw(
    null,
    signingInput(addendum_digest),
    createPublicKey({
      key: Buffer.from(a.signature.public_key_b64, "base64"),
      format: "der",
      type: "spki",
    }),
    Buffer.from(a.signature.signature_b64, "base64")
  );
  assert.equal(ok, true, "the addendum signature does not verify");
});

test("the addendum records the deadlock as COMPUTED, not asserted", () => {
  if (!existsSync(ADDENDUM)) return;
  const a = JSON.parse(readFileSync(ADDENDUM, "utf8"));
  assert.equal(a.lifecycle.deadlock.deadlocked, true);
  assert.deepEqual(a.lifecycle.deadlock.reachable_phases, ["Q0_TRANSITION"]);
  // The phase table travels WITH the finding, so a reader can recompute the conclusion rather than
  // take it on the producer's word.
  assert.ok(a.lifecycle.phases.length === 4);
  assert.ok(a.lifecycle.condition_requirements.T3.needs === "coverage_evidence");
});
