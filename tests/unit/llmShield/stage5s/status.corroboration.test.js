// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 13 — `external_corroboration_status`, computed here and nowhere else (§13, E6).
//
// IT IS A STATUS, NOT A REFUSAL. §3.3: a malformed or unmet corroboration policy yields
// `not_satisfied` — "a status carried in the attestation, not a core-verifier refusal, so no raw code
// crosses the §2 freeze for a lane that is never CI-gated." Task 8's validator therefore returns
// validity only; the satisfaction question lives here.
//
// WHAT IT MAKES AVAILABLE, AND WHAT IT DOES NOT. Satisfied licenses exactly one sentence —
// "externally corroborated checkpoint digest" — and never "independently witnessed quorum". Anchors
// carry ZERO witness weight; an anchor observes a digest and reads nothing.

import assert from "node:assert/strict";
import test from "node:test";

import {
  CORROBORATION_STATUS,
  externalCorroborationStatusOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/status.mjs";
import { codeFor } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";

const ENV = "sha256:envelope-1";

const policy = (over = {}) => ({
  minimum_distinct_mechanisms: 2,
  permitted_ecology_classes: ["rfc3161", "rekor", "bitcoin_ots"],
  required_envelope_digest: ENV,
  freshness_and_inclusion_requirements: { inclusion_proof: "required" },
  ...over,
});

const anchor = (mechanism, over = {}) => ({
  external_anchor_class: mechanism,
  covered_envelope_digest: ENV,
  inclusion_verified: true,
  ...over,
});

test("[5s-t13] the status set is exactly the two §3.3 names", () => {
  assert.deepEqual([...CORROBORATION_STATUS].sort(), ["not_satisfied", "satisfied"]);
  assert.ok(Object.isFrozen(CORROBORATION_STATUS));
});

test("[5s-t13] two distinct verified mechanisms over the required digest is satisfied", () => {
  const r = externalCorroborationStatusOf({
    policy: policy(),
    anchors: [anchor("rfc3161"), anchor("rekor")],
  });
  assert.equal(r, "satisfied");
});

test("[5s-t13] DISTINCT mechanisms, not distinct submissions — two of one is one", () => {
  // Two RFC-3161 tokens from two vendors are still one mechanism, and the policy asks for two.
  const r = externalCorroborationStatusOf({
    policy: policy(),
    anchors: [anchor("rfc3161"), anchor("rfc3161")],
  });
  assert.equal(r, "not_satisfied");
});

test("[5s-t13] an anchor over a DIFFERENT digest corroborates nothing", () => {
  const r = externalCorroborationStatusOf({
    policy: policy(),
    anchors: [anchor("rfc3161"), anchor("rekor", { covered_envelope_digest: "sha256:other" })],
  });
  assert.equal(r, "not_satisfied");
});

test("[5s-t13] an unverified inclusion proof does not count — fail-closed on absence too", () => {
  for (const over of [{ inclusion_verified: false }, { inclusion_verified: undefined }]) {
    const r = externalCorroborationStatusOf({
      policy: policy(),
      anchors: [anchor("rfc3161"), anchor("rekor", over)],
    });
    assert.equal(r, "not_satisfied");
  }
});

test("[5s-t13] a mechanism outside the permitted ecology does not count", () => {
  const r = externalCorroborationStatusOf({
    policy: policy({ permitted_ecology_classes: ["rfc3161", "rekor"] }),
    anchors: [anchor("rfc3161"), anchor("bitcoin_ots")],
  });
  assert.equal(r, "not_satisfied");
});

test("[5s-t13] a WITNESS class submitted as an anchor is never counted", () => {
  // The taxonomies are disjoint by construction; this is the run-time half of that guarantee.
  const r = externalCorroborationStatusOf({
    policy: policy(),
    anchors: [anchor("rfc3161"), anchor("same_operator_distinct_key")],
  });
  assert.equal(r, "not_satisfied");
});

test("[5s-t13] a MALFORMED policy is not_satisfied, and allocates NO raw code", () => {
  // The ruling, machine-checked: Lane C never crosses the §2 freeze.
  for (const bad of [null, undefined, {}, policy({ minimum_distinct_mechanisms: 0 })]) {
    const r = externalCorroborationStatusOf({ policy: bad, anchors: [anchor("rfc3161")] });
    assert.equal(r, "not_satisfied", `${JSON.stringify(bad)} was satisfied`);
  }
  for (const status of CORROBORATION_STATUS) {
    assert.equal(codeFor(status), null, `${status} allocates a raw code`);
  }
});

test("[5s-t13] no anchors at all is not_satisfied, never vacuously satisfied", () => {
  assert.equal(externalCorroborationStatusOf({ policy: policy(), anchors: [] }), "not_satisfied");
  assert.equal(externalCorroborationStatusOf({ policy: policy() }), "not_satisfied");
  assert.equal(externalCorroborationStatusOf(undefined), "not_satisfied");
});

test("[5s-t13] satisfaction is independent of the quorum and of the comparison", () => {
  const base = { policy: policy(), anchors: [anchor("rfc3161"), anchor("rekor")] };
  assert.equal(
    externalCorroborationStatusOf({
      ...base,
      quorum_status: "quorum_incomplete",
      comparison_status: "equivocation_detected",
    }),
    "satisfied"
  );
});
