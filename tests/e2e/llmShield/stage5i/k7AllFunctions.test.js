// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I VPC — K7 all-functions e2e net (MANDATORY before tag). Every export invoked at least once;
// the full 16-code matrix (316–331) reachable; projections/roots consistency; committed evidence lock.
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "../../../unit/llmShield/stage5i/_validBundle.mjs";
import { vpcVerify } from "../../../../tools/simurgh-attestation/stage5i/core/vpcCore.mjs";
import { makeCtx } from "../../../../tools/simurgh-attestation/stage5i/core/context.mjs";
import { checkSchema } from "../../../../tools/simurgh-attestation/stage5i/core/schema.mjs";
import { roleCollisionOk } from "../../../../tools/simurgh-attestation/stage5i/core/signatures.mjs";
import {
  domainDigest,
  identityDigest,
  artifactDigest,
} from "../../../../tools/simurgh-attestation/stage5i/core/digests.mjs";
import {
  panelSubjectRoot,
  panelEvidenceRoot,
  trustContextDigest,
} from "../../../../tools/simurgh-attestation/stage5i/core/roots.mjs";
import {
  coverageDepth,
  sectionStates,
} from "../../../../tools/simurgh-attestation/stage5i/core/projections.mjs";
import {
  recomputeAttestationContent,
  countedReviewers,
} from "../../../../tools/simurgh-attestation/stage5i/core/checks329to330.mjs";
import { vpcSeparation } from "../../../../tools/simurgh-attestation/stage5i/core/checks325to328.mjs";
import {
  DOMAINS,
  VPC_PUBLIC_CHECK_ORDER,
} from "../../../../tools/simurgh-attestation/stage5i/constants.mjs";
import { verifyPack } from "../../../../tools/simurgh-attestation/stage5i/node/verify-vpc-attestation.mjs";
import { byteStable } from "../../../../tools/simurgh-attestation/stage5i/node/verify-byte-stability.mjs";
import { EVIDENCE_DIR } from "../../../../tools/simurgh-attestation/stage5i/node/build-vpc-evidence.mjs";

const clone = (x) => structuredClone(x);
function validAudit() {
  const f = validBundle();
  const pub = vpcVerify(f.bundle, f.cfg, f.facts, { tier: "public" });
  assert.equal(pub.raw, 0);
  f.bundle.attestation.content = recomputeAttestationContent(pub.ctx);
  return f;
}
function raw(mutate, tier = "public") {
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
  mutate({ ...state, f, set: (k, v) => (state[k] = v) });
  return vpcVerify(state.b, state.cfg, state.facts, { tier }).raw;
}

test("K7: every raw code 316–331 is reachable", () => {
  assert.equal(
    raw(({ set }) => set("b", {})),
    316
  );
  assert.equal(
    raw(({ cfg }) => delete cfg.policy_pin),
    317
  );
  assert.equal(
    raw(({ b }) => (b.coverage_receipts.length = 0)),
    318
  );
  assert.equal(
    raw(({ facts }) => (facts.sigValid = false)),
    319
  );
  assert.equal(
    raw(({ b }) =>
      b.partition.content.sections.push({
        section_id: "9",
        canonical_path: "sec/9",
        redaction_types: [],
      })
    ),
    320
  );
  assert.equal(
    raw(({ b }) => b.access_grants.pop()),
    321
  );
  assert.equal(
    raw(({ b }) => {
      b.access_grants[0].content.granted_sections.push("99");
      b.coverage_receipts[0].content.grant_digest = domainDigest(
        DOMAINS.grant,
        b.access_grants[0].content
      );
    }),
    322
  );
  assert.equal(
    raw(({ b }) => b.coverage_receipts[0].content.evaluated_sections.push("6")),
    323
  );
  assert.equal(
    raw(({ b }) => (b.coverage_receipts[0].content.reviewer_attests_evaluated = false)),
    324
  );
  assert.equal(
    raw(({ facts, f }) =>
      facts.challengeBoundDigests.delete(
        f.bundle.coverage_receipts[0].content.independence_evidence.separation_evidence_digest
      )
    ),
    325
  );
  assert.equal(
    raw(({ b, cfg }) => {
      cfg.affiliation_assertions[0].content.relationship = "affiliated";
      b.coverage_receipts[0].content.independence_evidence.affiliation_assertion_digest =
        domainDigest(DOMAINS.affiliation, cfg.affiliation_assertions[0].content);
    }),
    326
  );
  assert.equal(
    raw(({ b }) => b.coverage_receipts[1].content.evaluated_sections.splice(2)),
    327
  );
  assert.equal(
    raw(({ b }) => (b.attestation.content.annotations = { certified_safe: true })),
    328
  );
  assert.equal(
    raw(({ b }) => (b.attestation.content.coverage_union = ["1"]), "audit"),
    329
  );
  assert.equal(
    raw(({ cfg }) => {
      cfg.policy.min_reviewers = 5;
      cfg.policy_pin.policy_digest = domainDigest(DOMAINS.policy, cfg.policy);
    }),
    330
  );
  assert.equal(
    raw(({ set }) => set("cfg", undefined)),
    331
  );
});

test("K7: public order is the frozen 316–328 predicate list", () => {
  assert.deepEqual(
    VPC_PUBLIC_CHECK_ORDER,
    [316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328]
  );
});

test("K7: pure helpers exercised (digests, roots, projections, separation, census)", () => {
  const f = validAudit();
  const ctx = vpcVerify(f.bundle, f.cfg, f.facts, { tier: "public" }).ctx;
  assert.ok(checkSchema(f.bundle) === null);
  assert.ok(makeCtx(f.bundle, f.cfg, f.facts));
  assert.ok(roleCollisionOk(f.facts.roleFingerprints).ok);
  assert.match(identityDigest({ identity_subject: "x", key_fingerprint: "y" }), /^sha256:/);
  assert.match(artifactDigest({ a: 1 }), /^sha256:/);
  assert.equal(panelSubjectRoot(ctx), recomputeAttestationContent(ctx).panel_subject_root);
  assert.notEqual(panelEvidenceRoot(ctx), panelSubjectRoot(ctx)); // evidence root ⊋ subject root
  assert.match(trustContextDigest(ctx), /^sha256:/);
  const depth = coverageDepth(ctx);
  assert.deepEqual(depth.single_reviewer_sections, ["1", "2", "3", "6", "7", "8"]); // 4,5 double-covered
  assert.equal(depth.min_depth, 1);
  const states = sectionStates(ctx);
  assert.equal(states.covered.length, 8);
  assert.equal(states.assigned_only.length, 0);
  assert.equal(countedReviewers(ctx).length, 2);
  assert.equal(vpcSeparation({ subject_key_fingerprint: "fp:verifier" }, ctx), "below_floor"); // verifier key ⇒ no separation
});

test("K7: committed Lane-A evidence is locked (verifies + byte-stable)", () => {
  assert.equal(verifyPack(EVIDENCE_DIR, "public").raw, 0);
  assert.equal(verifyPack(EVIDENCE_DIR, "audit").raw, 0);
  assert.equal(byteStable().ok, true);
});
