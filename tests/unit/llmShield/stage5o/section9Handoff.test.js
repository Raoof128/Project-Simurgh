// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.5/§9.7 — the probability policy, its precommitment binding, and the sealed
// §7 -> §9 authority handoff.
//
// The basis is a DISCRIMINATED exact-key shape: the inactive alternative must be absent, so no field
// changes JSON type according to another field. The adapter projects N and k from the frozen
// Section7AcceptedContext and never from producer-resupplied values, and the outer package ceilings
// are resolved from the precommitment-bound policy rather than from the package being judged.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROBABILITY_POLICY_DOMAIN,
  canonicalProbabilityPolicy,
  probabilityPolicyDigest,
} from "../../../../tools/simurgh-attestation/stage5o/core/probabilityPolicy.mjs";
import {
  mintCommittedProbabilityPolicyContext,
  isCommittedProbabilityPolicyContext,
} from "../../../../tools/simurgh-attestation/stage5o/core/committedProbabilityPolicyContext.mjs";
import {
  acceptSection7ForSection9,
  isSection9AuthorityContext,
} from "../../../../tools/simurgh-attestation/stage5o/core/acceptSection7ForSection9.mjs";
import { makeSection9Fixture, basePolicy } from "./section9Fixture.mjs";

test("§9.5 the policy domain is §9-owned and is NOT a §7 registry pair", () => {
  assert.equal(PROBABILITY_POLICY_DOMAIN, "simurgh.vsc.probability_policy.v1");
});

test("§9.5 the discriminated basis: the INACTIVE alternative must be absent", () => {
  const frac = basePolicy({
    target_defect_basis: "fraction",
    target_defect_fraction: { numerator: "1", denominator: "250" },
  });
  assert.ok(canonicalProbabilityPolicy(frac));

  // fraction basis carrying the absolute-count field
  assert.throws(
    () => canonicalProbabilityPolicy({ ...frac, target_defect_count: "5" }),
    /policy_exact_key_schema/
  );
  // absolute basis carrying the fraction field
  const abs = basePolicy({ target_defect_basis: "absolute_count", target_defect_count: "5" });
  assert.ok(canonicalProbabilityPolicy(abs));
  assert.throws(
    () =>
      canonicalProbabilityPolicy({
        ...abs,
        target_defect_fraction: { numerator: "1", denominator: "250" },
      }),
    /policy_exact_key_schema/
  );
  // an unknown basis
  assert.throws(
    () => canonicalProbabilityPolicy({ ...abs, target_defect_basis: "vibes" }),
    /policy_target_defect_basis/
  );
});

test("§9.5 f* = 0 and f* > 1 are rejected — a generic rational rule must not permit them", () => {
  const mk = (n, d) =>
    basePolicy({
      target_defect_basis: "fraction",
      target_defect_fraction: { numerator: n, denominator: d },
    });
  assert.throws(() => canonicalProbabilityPolicy(mk("0", "1")), /policy_target_defect_fraction/);
  assert.throws(() => canonicalProbabilityPolicy(mk("3", "2")), /policy_target_defect_fraction/);
  assert.ok(canonicalProbabilityPolicy(mk("1", "1")), "f* = 1 is permitted");
});

test("§9.5 p_min outside [0,1] rejects; claim_type is a closed enum", () => {
  const abs = basePolicy({ target_defect_basis: "absolute_count", target_defect_count: "5" });
  assert.throws(
    () =>
      canonicalProbabilityPolicy({
        ...abs,
        minimum_detection_bound: { numerator: "3", denominator: "2" },
      }),
    /policy_minimum_detection_bound/
  );
  assert.throws(
    () => canonicalProbabilityPolicy({ ...abs, claim_type: "probably" }),
    /policy_claim_type/
  );
});

test("§9.5 the digest is stable, domain-separated, and moves when any field moves", () => {
  const p = basePolicy({ target_defect_basis: "absolute_count", target_defect_count: "5" });
  const d1 = probabilityPolicyDigest(p);
  assert.match(d1, /^[0-9a-f]{64}$/);
  assert.equal(probabilityPolicyDigest({ ...p }), d1, "stable across equal policies");
  const d2 = probabilityPolicyDigest({ ...p, target_defect_count: "6" });
  assert.notEqual(d1, d2, "a changed threshold must change the digest");
});

test("§9.5 the context mints only when the recomputed digest equals the precommitted one", () => {
  const p = basePolicy({ target_defect_basis: "absolute_count", target_defect_count: "5" });
  const good = mintCommittedProbabilityPolicyContext({
    probability_policy: p,
    precommitted_probability_policy_digest: probabilityPolicyDigest(p),
  });
  assert.equal(isCommittedProbabilityPolicyContext(good), true);
  assert.throws(
    () =>
      mintCommittedProbabilityPolicyContext({
        probability_policy: p,
        precommitted_probability_policy_digest: "f".repeat(64),
      }),
    /precommitment_mismatch/
  );
});

test("§9.7 a structural LOOKALIKE is not a capability — opacity is a private brand", () => {
  const p = basePolicy({ target_defect_basis: "absolute_count", target_defect_count: "5" });
  const real = mintCommittedProbabilityPolicyContext({
    probability_policy: p,
    precommitted_probability_policy_digest: probabilityPolicyDigest(p),
  });
  const lookalike = JSON.parse(JSON.stringify(real));
  assert.equal(isCommittedProbabilityPolicyContext(lookalike), false);
  assert.equal(isSection9AuthorityContext({ N: 1247, k: 30, accepted: true }), false);
});

test("§9.7 the adapter projects N and k from the ACCEPTED §7 context, not from a producer", () => {
  const { section7AcceptedContext, policyContext, N, k } = makeSection9Fixture();
  const ctx = acceptSection7ForSection9(section7AcceptedContext, policyContext);
  assert.equal(isSection9AuthorityContext(ctx), true);
  assert.equal(ctx.N, N);
  assert.equal(ctx.k, k, "k is the accepted challenge's ordered-selected-index count");
  assert.equal(ctx.k, section7AcceptedContext.ordered_selected_indices.length);
  assert.equal(
    ctx.precommitted_probability_policy_digest,
    policyContext.precommitted_probability_policy_digest
  );
  // the trusted outer ceilings come from the precommitment-bound policy
  assert.equal(
    ctx.max_probability_package_transport_bytes,
    policyContext.probability_policy.max_probability_package_transport_bytes
  );
  assert.ok(Object.isFrozen(ctx));
});

test("§9.7 the adapter refuses a non-branded §7 context and a non-branded policy context", () => {
  const { section7AcceptedContext, policyContext } = makeSection9Fixture();
  const fake7 = { ...section7AcceptedContext };
  assert.throws(
    () => acceptSection7ForSection9(fake7, policyContext),
    /requires_section7_accepted/
  );
  assert.throws(
    () => acceptSection7ForSection9(section7AcceptedContext, { probability_policy: {} }),
    /requires_committed_probability_policy/
  );
});

test("§9.7 there is no exported mint for the §9 authority context", async () => {
  const mod =
    await import("../../../../tools/simurgh-attestation/stage5o/core/acceptSection7ForSection9.mjs");
  const exported = Object.keys(mod).sort();
  assert.deepEqual(exported, ["acceptSection7ForSection9", "isSection9AuthorityContext"]);
});
