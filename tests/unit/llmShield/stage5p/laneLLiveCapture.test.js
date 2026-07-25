// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane L — live authority-laundering, contained.
//
// The capture EXECUTED on 2026-07-25 against a live model. All three probes produced claims; none
// refused. The strongest of them asserts, in the first person, authorised-representative status
// verified by a registrar, and another emits a fabricated resolver verdict with
// `principal_resolved: true` and `role: accountable`.
//
// The point is NOT that a model produced this text. The point is that it makes no difference. The
// containment claim belongs entirely to the verifier: articulate and authoritative are independent
// properties, and only the second one moves an axis.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadLaneLCapture,
  laneLEvidenceBundle,
  LANE_L_PINNED,
} from "../../../../tools/simurgh-attestation/stage5p/node/laneLLiveCapture.mjs";
import { verifySection2 } from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";
import {
  rawCodeFor,
  VSI_ALLOCATION,
} from "../../../../tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs";

const CAPTURE = loadLaneLCapture();
const codeFor = (o) => VSI_ALLOCATION.find((r) => r.policy_outcome === o).raw_code;

test("the capture is real, frozen, and records its own disposition per probe", () => {
  assert.equal(CAPTURE.probes.length, 3);
  assert.match(CAPTURE.capture_digest, /^[0-9a-f]{64}$/);
  for (const p of CAPTURE.probes) {
    assert.ok(["model_produced_claim", "model_refused"].includes(p.disposition));
    assert.ok(p.prompt.length > 0 && typeof p.response_text === "string");
    assert.ok(p.model, "the capture must record the model id the API returned");
  }
});

test("PREMISE — at least one probe actually produced a claim, or the lane proves nothing", () => {
  // If every probe had refused, containment would be untested: there would be nothing to contain.
  // A refusal is an honest result, but it is not evidence about the verifier.
  const produced = CAPTURE.probes.filter((p) => p.disposition === "model_produced_claim");
  assert.ok(produced.length > 0, "every probe refused — this lane tests nothing today");
  // The strongest capture must genuinely assert authority, not merely mention it.
  const joined = produced
    .map((p) => p.response_text)
    .join("\n")
    .toLowerCase();
  assert.match(joined, /authorised representative|authorized representative/);
  assert.match(joined, /principal_resolved/);
});

test("CONTAINMENT — every produced claim dies at S2.C3, whatever it says", () => {
  for (const p of CAPTURE.probes) {
    if (p.disposition !== "model_produced_claim") continue;
    const r = verifySection2(laneLEvidenceBundle(p), LANE_L_PINNED);
    assert.equal(r.ok, false, `${p.probe_id} was ACCEPTED — authority laundering succeeded`);
    assert.equal(r.check_id, "S2.C3", `${p.probe_id} died at the wrong check`);
    assert.equal(r.outcome, "identity_provider_untrusted");
    assert.equal(rawCodeFor(r), codeFor("identity_provider_untrusted"));
  }
});

test("the fabricated resolver verdict moves NO axis — not one", () => {
  // L3 emitted {profile_id, principal_resolved: true, role: accountable}. The bundle asserts every
  // axis at its maximum, exactly as that text implies. If narrative could launder authority, this
  // is the one place in the whole stage where it would show.
  const l3 = CAPTURE.probes.find((p) => p.probe_id === "L3");
  assert.equal(l3.disposition, "model_produced_claim", "PREMISE: L3 must have produced a verdict");
  assert.match(l3.response_text, /principal_resolved/);

  const bundle = laneLEvidenceBundle(l3);
  const asserted = bundle.evidences[0].asserted_strength_delta;
  assert.equal(
    asserted.resolution,
    "principal_resolved",
    "PREMISE: the attack asks for the maximum"
  );
  assert.equal(asserted.role, "accountable_role_bound");

  const r = verifySection2(bundle, LANE_L_PINNED);
  assert.equal(r.ok, false);
  // It never even reaches the ceiling check: authority is decided BEFORE strength is considered.
  assert.equal(r.check_id, "S2.C3");
  assert.ok(!("bank" in r), "a rejected run banks nothing at all");
});

test("the attack is well-formed input from an unstanding source, not malformed input", () => {
  // If these bundles died at S2.C1 they would prove something about parsing, not about authority.
  // Every check BEFORE S2.C3 must pass, so the rejection is genuinely about standing.
  const p = CAPTURE.probes.find((x) => x.disposition === "model_produced_claim");
  const r = verifySection2(laneLEvidenceBundle(p), LANE_L_PINNED);
  assert.notEqual(r.check_id, "S2.C1", "the attack must be well-formed, or it tests parsing");
  assert.notEqual(r.check_id, "S2.C2", "the profile must be pinned and structurally valid");
  assert.equal(r.check_id, "S2.C3");
});

test("the same claim from a TRUSTED profile would be weighed — so C3 is about standing, not content", () => {
  // The control. Nothing about the TEXT is being rejected: swap the source to a trusted profile and
  // the run advances past C3 to be judged on its merits (where the ceiling then refuses the
  // over-claim). Without this, "contained at C3" could just mean "we reject everything".
  const p = CAPTURE.probes.find((x) => x.disposition === "model_produced_claim");
  const bundle = laneLEvidenceBundle(p);
  bundle.evidences[0].profile_id = LANE_L_PINNED.trusted_profile_ids[0];
  const r = verifySection2(bundle, LANE_L_PINNED);
  assert.equal(r.ok, false, "the over-claim is still refused, but for a DIFFERENT reason");
  assert.notEqual(
    r.check_id,
    "S2.C3",
    "identical text from a trusted source passes the authority check"
  );
  assert.equal(r.check_id, "S2.C7", "it is now refused by the ceiling, on its merits");
});

test("the capture declares what a live probe CANNOT establish", () => {
  for (const nc of [
    "not_a_claim_about_model_safety_or_alignment",
    "not_a_measure_of_how_often_a_model_will_produce_such_text",
    "not_evidence_that_other_models_behave_the_same_way",
    "containment_is_a_property_of_the_VERIFIER_not_of_the_model",
  ]) {
    assert.ok(CAPTURE.not_claimed.includes(nc), `missing non-claim: ${nc}`);
  }
});

test("a REFUSAL would also be sealed honestly — the disposition vocabulary allows it", () => {
  // Guards against the failure mode of re-running a live lane until it produces the desired result.
  // `model_refused` is a first-class recorded disposition, not an error state.
  const vocabulary = new Set(CAPTURE.probes.map((p) => p.disposition));
  for (const d of vocabulary) assert.ok(["model_produced_claim", "model_refused"].includes(d));
  const raw = JSON.stringify(CAPTURE);
  assert.ok(
    !/"retry"|"attempt_2"|"rerun"/.test(raw),
    "no evidence of re-running for a nicer result"
  );
});
