import { test } from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { vpcVerify } from "../../../../tools/simurgh-attestation/stage5i/core/vpcCore.mjs";
import { recomputeAttestationContent } from "../../../../tools/simurgh-attestation/stage5i/core/checks329to330.mjs";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage5i/core/digests.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage5i/constants.mjs";

const clone = (x) => structuredClone(x);

// A valid bundle whose attestation is filled from the verifier recompute (so audit tier passes).
function validAudit() {
  const f = validBundle();
  const pub = vpcVerify(f.bundle, f.cfg, f.facts, { tier: "public" });
  assert.equal(pub.raw, 0, "public must be 0 before filling attestation");
  f.bundle.attestation.content = recomputeAttestationContent(pub.ctx);
  return f;
}

test("valid bundle verifies raw 0 (public AND audit)", () => {
  const f = validAudit();
  assert.equal(vpcVerify(f.bundle, f.cfg, f.facts, { tier: "public" }).raw, 0);
  assert.equal(vpcVerify(f.bundle, f.cfg, f.facts, { tier: "audit" }).raw, 0);
});

function expect(mutate, raw, tier = "public") {
  const f = validAudit();
  const state = {
    b: clone(f.bundle),
    cfg: clone(f.cfg),
    facts: {
      ...f.facts,
      roleFingerprints: {
        ...f.facts.roleFingerprints,
        reviewers: [...f.facts.roleFingerprints.reviewers],
      },
      challengeBoundDigests: new Set(f.facts.challengeBoundDigests),
      anchoredDigests: new Set(f.facts.anchoredDigests),
    },
  };
  mutate({ b: state.b, cfg: state.cfg, facts: state.facts, f, set: (k, v) => (state[k] = v) });
  const res = vpcVerify(state.b, state.cfg, state.facts, { tier });
  assert.equal(res.raw, raw, `expected ${raw}, got ${res.raw} (${res.reason})`);
}

test("tamper matrix → intended first raw code", () => {
  expect(({ set }) => set("b", {}), 316); // malformed
  expect(({ set }) => set("cfg", undefined), 331); // undefined config → wrapper
  expect(({ cfg }) => delete cfg.policy_pin, 317); // missing external config
  expect(({ facts }) => (facts.sigValid = false), 319); // sig invalid
  expect(({ facts }) => facts.roleFingerprints.reviewers.push("fp:producer"), 319); // role collision
  expect(
    ({ b }) =>
      b.partition.content.sections.push({
        section_id: "9",
        canonical_path: "sec/9",
        redaction_types: [],
      }),
    320
  ); // partition digest drift
  expect(({ b }) => b.coverage_receipts.pop(), 321); // removing a receipt orphans its grant → 321
});

test("census / bounds / evaluation / coverage / adequacy", () => {
  expect(({ b }) => b.access_grants.pop(), 321); // orphan receipt (grant removed, receipt remains)
  expect(({ b }) => {
    b.access_grants[0].content.granted_sections.push("99"); // ∉ S
    b.coverage_receipts[0].content.grant_digest = domainDigest(
      DOMAINS.grant,
      b.access_grants[0].content
    ); // re-point census ref
  }, 322); // grant ⊄ S
  expect(({ b }) => b.coverage_receipts[0].content.evaluated_sections.push("6"), 323); // C ⊄ G (6∈S, granted to B not A)
  expect(({ b }) => (b.coverage_receipts[0].content.reviewer_attests_evaluated = false), 324);
  expect(({ facts, f }) => {
    // drop reviewerA's separation evidence from the challenge-bound set → rung falls below policy
    const sepDigest =
      f.bundle.coverage_receipts[0].content.independence_evidence.separation_evidence_digest;
    facts.challengeBoundDigests.delete(sepDigest);
  }, 325);
  expect(({ b }) => b.coverage_receipts[1].content.evaluated_sections.splice(2), 327); // B drops sections 6,7,8 → gap
  expect(({ b }) => (b.attestation.content.annotations = { review_quality: "excellent" }), 328); // BEAST A
});

test("adequacy gate fails even at full coverage; audit + policy", () => {
  // 328 fires though coverage is complete
  expect(({ b }) => (b.attestation.content.annotations = { certified_safe: true }), 328);
  // 329 audit: declared attestation diverges from recompute
  expect(({ b }) => (b.attestation.content.coverage_union = ["1"]), 329, "audit");
  // 330 policy: raise min_reviewers above the panel size (re-pin the policy digest)
  expect(({ cfg }) => {
    cfg.policy.min_reviewers = 5;
    cfg.policy_pin.policy_digest = domainDigest(DOMAINS.policy, cfg.policy);
  }, 330);
  // 330 policy: two reviewers sharing a subject affiliation lineage
  expect(({ b, cfg }) => {
    const affB = cfg.affiliation_assertions[1];
    affB.content.subject_affiliation_lineage_digest =
      cfg.affiliation_assertions[0].content.subject_affiliation_lineage_digest;
    b.coverage_receipts[1].content.independence_evidence.affiliation_assertion_digest =
      domainDigest(DOMAINS.affiliation, affB.content);
  }, 330);
});
