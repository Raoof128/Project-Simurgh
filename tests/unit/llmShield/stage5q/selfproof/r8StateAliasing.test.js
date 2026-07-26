// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — SELF-PROOF DETECTOR PACK for R8 (state aliasing, mutation-after-validation).
// Pack id: 5q-sp-r8-01. Dedicated to the mutation lane: this is not a test of 5P's behaviour for
// 5P's own sake, it is the red that makes M8's green mean something.
//
// WHY THIS FILE EXISTS.
//
// M8 seeds a real fault into 5P's `attachEvidence` — it deletes the guard binding a piece of
// resolver evidence to the profile it claims to have been gathered under:
//
//     if (e.profile_id !== p.profile_id)
//       return fail("evidence profile_id does not match the supplied profile");
//
// Run against 5P's OWN unit suite, that mutant went GREEN -> GREEN -> GREEN. 5P ships hundreds of
// unit tests and not one of them fails when that guard is deleted. The guard is real, it is
// load-bearing, and nothing was watching it.
//
// The plan is explicit about what happens next: STRENGTHEN THE PACK, never weaken the mutant. An
// undetected mutant is the most valuable single output of Wave II and must not be quietly tuned
// away. The mutant is untouched; this detector was written to see it.
//
// AND THE WIDER LESSON, which is why self-proof packs are 5Q-owned rather than borrowed: pointing a
// mutation lane at the target stage's own suite inherits that suite's coverage gaps. A mutant the
// borrowed suite cannot see reads as "no fault was seeded" when it means "no detector was present".
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyBank,
  attachEvidence,
} from "../../../../../tools/simurgh-attestation/stage5p/core/identityBank.mjs";
import {
  makeResolverProfile,
  RESOLVER_PROFILE_TYPE,
} from "../../../../../tools/simurgh-attestation/stage5p/core/resolverProfile.mjs";
import {
  makeResolverEvidence,
  RESOLVER_EVIDENCE_TYPE,
} from "../../../../../tools/simurgh-attestation/stage5p/core/resolverEvidence.mjs";
import { PRINCIPAL_TYPE } from "../../../../../tools/simurgh-attestation/stage5p/core/canonicalPrincipal.mjs";

const alice = {
  type: PRINCIPAL_TYPE,
  kind: "account",
  namespace_id: "simurgh.synthetic.oidc-subject.v1",
  subject_id: "a".repeat(64),
};

const oidcProfile = makeResolverProfile({
  type: RESOLVER_PROFILE_TYPE,
  profile_id: "simurgh.synthetic.oidc.v1",
  trust_root_fpr: "1".repeat(64),
  permitted_claim_types: ["principal"],
  ceiling: {
    binding: "cryptographically_bound",
    resolution: "provider_asserted",
    continuity: "ephemeral",
    role: "unproven",
  },
  namespace_map: { sub: "simurgh.synthetic.oidc-subject.v1" },
});

/** A SECOND profile, so evidence can be honestly bound to one and presented under the other. */
const otherProfile = makeResolverProfile({
  type: RESOLVER_PROFILE_TYPE,
  profile_id: "simurgh.synthetic.registry.v1",
  trust_root_fpr: "2".repeat(64),
  permitted_claim_types: ["principal"],
  ceiling: {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "durable",
    role: "unproven",
  },
  namespace_map: { sub: "simurgh.synthetic.oidc-subject.v1" },
});

const evidenceUnder = (profileId) =>
  makeResolverEvidence({
    type: RESOLVER_EVIDENCE_TYPE,
    profile_id: profileId,
    claim: { principal: alice },
    asserted_strength_delta: {
      binding: "cryptographically_bound",
      resolution: "provider_asserted",
      continuity: "ephemeral",
      role: "unproven",
    },
    evidence_digest: "c".repeat(64),
    submission_digest_binding: "d".repeat(64),
    signature: "ab12",
  });

test("evidence bound to a DIFFERENT profile_id is REFUSED — this is the guard M8 deletes", () => {
  // Without the guard, evidence gathered under one profile can be presented under another. Every
  // downstream signature over the resulting bank would then be authentic AND wrong, which is the
  // worst shape a signature can take.
  const result = attachEvidence(emptyBank(), evidenceUnder(otherProfile.profile_id), oidcProfile);

  assert.notEqual(
    result?.ok,
    true,
    "evidence whose profile_id does not match the supplied profile must not attach"
  );
  assert.match(
    JSON.stringify(result ?? {}),
    /profile_id/i,
    "and the refusal must NAME the mismatch, so a reviewer can see THIS guard fired rather than " +
      "some later check catching it by accident"
  );
});

test("a correctly bound pair still attaches — the detector is not a blanket refusal", () => {
  // Without this second assertion, deleting the guard AND breaking attachment entirely would both
  // read as a pass. A detector that only ever refuses cannot tell a working guard from a broken
  // function, and would discharge R8 while proving nothing.
  const result = attachEvidence(emptyBank(), evidenceUnder(oidcProfile.profile_id), oidcProfile);
  assert.notEqual(
    JSON.stringify(result ?? {}).includes("does not match the supplied profile"),
    true,
    "a correctly bound pair must not trip the profile_id guard"
  );
});
