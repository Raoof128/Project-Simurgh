// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P invention D — THE ARCHAEOLOGY TEST.
//
// A named fixture family with ZERO new code paths. It asks one question the rest of the stage does
// not: when the subject is gone, what survives?
//
// The answer this stage is willing to sign: the EVIDENCE still verifies, and the ACCOUNTABILITY does
// not. Those are different claims and the whole family exists to keep them apart. A ceased entity's
// signature is not void — it is exactly as valid as it ever was, about a past that really happened.
// What died with the entity is the ability of anyone to answer for it now.
//
// The non-claim this family ships with, in the same breath as the mechanism:
//     not_proof_of_present_accountability
// Historical verifiability is not present accountability, and a verifier that returned "valid" for
// a retired entity without saying which of the two it meant would be the overclaim this stage
// exists to make impossible.
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifySection2 } from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";
import {
  rawCodeFor,
  VSI_ALLOCATION,
  VSI_OK_RAW,
} from "../../../../tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs";

// The code for an outcome comes from the allocator. Its binding to the frozen Annex R / A5 tables is
// asserted literally in rawCodeAllocator.test.js — re-transcribing the numbers here would duplicate
// that proof rather than add one, and would put the same literal in two places to drift apart.
const codeFor = (outcome) => VSI_ALLOCATION.find((r) => r.policy_outcome === outcome).raw_code;
import {
  loadGleifCapture,
  gleifEvidenceFor,
  GLEIF_PINNED,
} from "../../../../tools/simurgh-attestation/stage5p/node/laneC1Gleif.mjs";
import { GLEIF_CEILING } from "../../../../tools/simurgh-attestation/stage5p/core/gleifContinuityMap.mjs";
import { evidenceReplayIdentity } from "../../../../tools/simurgh-attestation/stage5p/core/resolverEvidence.mjs";

const RETIRED = "6488T70V0O9W2T3P0H24"; // NOVOPAN TRÆINDUSTRI A/S SOCIALE FOND — entity ceased
const LAPSED = "213800Q7NV3T5PZOU403"; // LEHMAN BROTHERS LIMITED — alive, registration decayed
const ISSUED = "213800ERUMY5KWCIHJ87"; // LEHMAN BROTHERS HOLDINGS PLC — alive, current

// A policy that asks only for what a registry can actually give, so the run turns on the entity's
// lifecycle rather than on an unrelated shortfall.
const HISTORICAL_POLICY = Object.freeze({
  binding: "unbound",
  resolution: "provider_asserted",
  continuity: "ephemeral",
  role: "unproven",
});

const PRESENT_ACCOUNTABILITY_POLICY = Object.freeze({
  binding: "unbound",
  resolution: "provider_asserted",
  continuity: "durable",
  role: "unproven",
});

test("A1 — the record of a CEASED entity is still published and still re-verifies by digest", () => {
  const rec = loadGleifCapture().records.find((r) => r.lei === RETIRED);
  assert.equal(rec.principal_lifecycle, "ceased");
  assert.equal(rec.digest_verified, true, "a retired entity's bytes must still verify");
  assert.equal(rec.record_still_resolvable, true, "Law 5: expiry is not erasure");
});

test("A2 — HISTORICAL verification SUCCEEDS for a ceased entity", () => {
  // The heart of the test. The entity no longer exists, and the evidence about it is still good.
  const r = verifySection2(gleifEvidenceFor(RETIRED, HISTORICAL_POLICY), GLEIF_PINNED);
  assert.equal(r.ok, true, `history must remain verifiable: ${JSON.stringify(r)}`);
  assert.equal(rawCodeFor(r), VSI_OK_RAW);
});

test("A3 — PRESENT accountability FAILS for the same entity, on the same evidence", () => {
  // Same record, same bytes, same profile. Only the question changed.
  const r = verifySection2(gleifEvidenceFor(RETIRED, PRESENT_ACCOUNTABILITY_POLICY), GLEIF_PINNED);
  assert.equal(r.ok, false);
  assert.equal(r.outcome, "identity_principal_ceased");
  assert.equal(rawCodeFor(r), codeFor("identity_principal_ceased"));
});

test("A4 — the two answers are produced by the SAME evidence, byte for byte", () => {
  // If the historical and present runs differed in their inputs, the family would prove nothing —
  // it would just be two unrelated fixtures. They must differ ONLY in the policy.
  const hist = gleifEvidenceFor(RETIRED, HISTORICAL_POLICY);
  const pres = gleifEvidenceFor(RETIRED, PRESENT_ACCOUNTABILITY_POLICY);
  assert.deepEqual(hist.evidences, pres.evidences, "the evidence must be identical");
  assert.deepEqual(hist.subject, pres.subject);
  assert.notDeepEqual(hist.required, pres.required, "PREMISE: only the policy may differ");
  assert.equal(
    evidenceReplayIdentity(hist.evidences[0]),
    evidenceReplayIdentity(pres.evidences[0]),
    "one piece of evidence, two questions"
  );
});

test("A5 — cessation and decay give DIFFERENT answers; the family refuses to conflate them", () => {
  const ceased = verifySection2(
    gleifEvidenceFor(RETIRED, PRESENT_ACCOUNTABILITY_POLICY),
    GLEIF_PINNED
  );
  const decayed = verifySection2(
    gleifEvidenceFor(LAPSED, PRESENT_ACCOUNTABILITY_POLICY),
    GLEIF_PINNED
  );
  assert.equal(ceased.outcome, "identity_principal_ceased");
  assert.equal(decayed.outcome, "identity_ephemeral_only");
  assert.notEqual(ceased.outcome, decayed.outcome);
  assert.notEqual(rawCodeFor(ceased), rawCodeFor(decayed));
  // The remediations differ, which is WHY the outcomes must: a lapsed registration can be renewed
  // by a living entity; a ceased one cannot be renewed by anybody.
});

test("A6 — a LIVING entity with a current registration still passes, so A3 is not a blanket failure", () => {
  // PREMISE for the whole family: if every record failed the present-accountability policy, A3
  // would be evidence of a broken profile rather than of cessation.
  const r = verifySection2(gleifEvidenceFor(ISSUED, PRESENT_ACCOUNTABILITY_POLICY), GLEIF_PINNED);
  assert.equal(r.ok, true, "PREMISE FAILED: the policy is unsatisfiable for every record");
});

test("A7 — the ceased entity's evidence is not FORGED, VOID or TAMPERED — it is simply past", () => {
  // Guards the specific misreading this family exists to prevent: "the check failed" being heard as
  // "the evidence was bad". Every earlier check passes; only the final policy test rejects.
  const r = verifySection2(gleifEvidenceFor(RETIRED, PRESENT_ACCOUNTABILITY_POLICY), GLEIF_PINNED);
  assert.equal(r.check_id, "S2.C9", "cessation must surface at the POLICY test, not at validation");
  for (const validationOutcome of [
    "resolver_binding_invalid",
    "identity_provider_untrusted",
    "identity_replay_upgrade_attempted",
    "identity_claim_mismatch",
  ]) {
    assert.notEqual(r.outcome, validationOutcome, "cessation must not read as an evidence defect");
  }
});

test("A8 — the archaeology claim is bounded: the capture itself declares what it does NOT prove", () => {
  const capture = loadGleifCapture();
  assert.ok(capture.not_claimed.includes("not_proof_of_present_accountability"));
  assert.ok(capture.not_claimed.includes("not_an_offline_gleif_signature"));
  assert.equal(capture.authentication, "tls_at_capture_then_digest_frozen");
  // A consumer cannot obtain the records without also obtaining the bound — they arrive together.
  assert.ok(Array.isArray(capture.records) && capture.records.length > 0);
});

test("A9 — a ceased entity cannot be laundered back into accountability by a bigger claim", () => {
  // The obvious attack on this family: if present accountability fails, assert harder.
  const bundle = gleifEvidenceFor(RETIRED, PRESENT_ACCOUNTABILITY_POLICY);
  bundle.evidences[0].asserted_strength_delta = {
    ...GLEIF_CEILING,
    continuity: "durable",
    role: "accountable_role_bound",
  };
  const r = verifySection2(bundle, GLEIF_PINNED);
  assert.equal(r.ok, false, "a ceased entity was talked back into accountability");
  // It dies at the ceiling before it ever reaches the policy test — the registry has no role
  // standing, so the over-claim is refused rather than weighed.
  assert.equal(r.check_id, "S2.C7");
  assert.equal(r.outcome, "accountable_role_unproven");
});

test("A10 — dropping the lifecycle signal changes the ANSWER, so the signal is load-bearing", () => {
  // Fault injection on the family itself: without `principal_lifecycle`, the same record reports
  // ordinary decay. If the two were identical, the cessation outcome would be decorative.
  const withSignal = gleifEvidenceFor(RETIRED, PRESENT_ACCOUNTABILITY_POLICY);
  assert.equal(
    withSignal.evidences[0].principal_lifecycle,
    "ceased",
    "PREMISE FAILED: the retired record carries no lifecycle signal"
  );

  const stripped = gleifEvidenceFor(RETIRED, PRESENT_ACCOUNTABILITY_POLICY);
  delete stripped.evidences[0].principal_lifecycle;
  const r = verifySection2(stripped, GLEIF_PINNED);
  assert.equal(r.outcome, "identity_ephemeral_only", "the signal did not change the outcome");
  assert.notEqual(
    r.outcome,
    verifySection2(withSignal, GLEIF_PINNED).outcome,
    "with and without the signal must differ, or the signal is doing nothing"
  );
});
