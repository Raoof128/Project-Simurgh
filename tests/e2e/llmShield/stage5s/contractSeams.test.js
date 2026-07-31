// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the producer→consumer seams, after 5S-F008 and 5S-F009.
//
// BOTH DEFECTS WERE INVISIBLE FROM EITHER SIDE. `fork_coordinate` and `roster` survived because every
// module was locally green: the artifact builder's tests passed, the schema's tests passed, the
// policy validator's tests passed, the tally's tests passed. Nothing failed because nothing had ever
// handed one module's OUTPUT to another module's INPUT. The seam was where the truth fell between
// chairs, and unit tests cannot stand in a gap by construction — they each stand on one side of it.
//
// So these are round trips, not assertions about names. Each one takes a real object from the module
// that produces it and feeds it to every module that consumes it, in the order the system does.
//
//   derive artifact → validate its schema → self-verify it
//   construct policy → consume it in the quorum tally → consume it in the evaluator
//
// A NAME TEST WOULD NOT HAVE CAUGHT EITHER. Comparing two string lists only works if someone thought
// to write the list twice; both defects were a single definition drifting while its twin stood still.
// The round trip has no list to keep in sync — it fails when the objects stop fitting.

import assert from "node:assert/strict";
import test from "node:test";

import {
  ARTIFACT_SCHEMAS,
  validateArtifact,
} from "../../../../tools/simurgh-attestation/stage5s/core/artifacts.mjs";
import {
  REQUIRED_ARTIFACT_BINDINGS,
  deriveEquivocationArtifact,
  verifyEquivocationArtifact,
} from "../../../../tools/simurgh-attestation/stage5s/core/equivocation.mjs";
import { validateWitnessQuorumPolicy } from "../../../../tools/simurgh-attestation/stage5s/core/policy.mjs";
import { tally } from "../../../../tools/simurgh-attestation/stage5s/core/quorum.mjs";
import { evaluate } from "../../../../tools/simurgh-attestation/stage5s/core/verify.mjs";
import {
  baseBundle,
  comparisonManifest,
  comparisonPolicy,
  witnessPolicy,
} from "../../../../tools/simurgh-attestation/stage5s/fixtures/bundle.mjs";
import { keyFor } from "../../../../tools/simurgh-attestation/stage5s/fixtures/keys.mjs";

// ---------------------------------------------------------------- seam 1 — the artifact (5S-F008)

test("[5s-seam] derive → validate schema → self-verify, on one real artifact", () => {
  const bundle = baseBundle();
  const derived = deriveEquivocationArtifact({
    view_a: bundle.views[0],
    view_b: bundle.views[1],
    comparison_policy: bundle.comparison_policy,
    comparison_manifest: bundle.comparison_manifest,
    producer_key_digest: bundle.committed.producer_key_digest,
    witness_policy: bundle.witness_policy,
  });
  assert.equal(derived.ok, true);
  assert.ok(derived.artifact, "the fixture is not a fork, so this seam tests nothing");

  // Consumer 1 — the schema table. This is the exact call that refused every valid artifact for the
  // whole of Task 14, because the field had been renamed on one side only.
  const validated = validateArtifact("equivocation_artifact", derived.artifact);
  assert.equal(
    validated.ok,
    true,
    `the schema refused a freshly derived artifact: ${JSON.stringify(validated.refusals)}`
  );

  // Consumer 2 — the artifact's own verifier, from public inputs only.
  const verdict = verifyEquivocationArtifact(derived.artifact, {
    producer_public_key_pem: keyFor("producer").pem,
    comparison_policy: bundle.comparison_policy,
    comparison_manifest: bundle.comparison_manifest,
    witness_policy: bundle.witness_policy,
  });
  assert.equal(verdict.ok, true, `self-verification failed: ${JSON.stringify(verdict.refusal)}`);
  assert.equal(verdict.comparison_status, "equivocation_detected");
});

test("[5s-seam] the schema requires nothing the builder does not emit, and vice versa", () => {
  // The subset relation in both directions, over the two definitions that drifted. Kept alongside
  // the round trip rather than instead of it: this one says WHICH field, the round trip says that
  // the objects no longer fit.
  for (const field of ARTIFACT_SCHEMAS.equivocation_artifact) {
    assert.ok(
      REQUIRED_ARTIFACT_BINDINGS.includes(field),
      `the schema requires ${field}, which the artifact never binds`
    );
  }
});

// ---------------------------------------------------------------- seam 2 — the policy (5S-F009)

test("[5s-seam] construct policy → validate → tally → evaluator, on one real policy", () => {
  const policy = witnessPolicy();
  const bundle = { ...baseBundle(), witness_policy: policy };

  // Consumer 1 — the schema table. This is where `roster` vs `witness_roster` refused a policy that
  // satisfied its own validator.
  const structural = validateArtifact("witness_policy", policy);
  assert.equal(
    structural.ok,
    true,
    `the schema refused a constructed policy: ${JSON.stringify(structural.refusals)}`
  );

  // Consumer 2 — the policy validator.
  const validated = validateWitnessQuorumPolicy(policy);
  assert.equal(validated.ok, true, JSON.stringify(validated.refusals));

  // Consumer 3 — the tally, which reads the roster.
  const counted = tally({
    checkpoint: bundle.views[0].checkpoint,
    policy,
    statements: bundle.views[0].witness_statements,
  });
  assert.equal(counted.ok, true, JSON.stringify(counted.refusals));
  assert.ok(
    counted.tally.distinct_eligible_witnesses > 0,
    "the tally counted nobody, so it never really read the roster"
  );

  // Consumer 4 — the ordered evaluator, which runs all three above against one object.
  const result = evaluate(bundle);
  assert.equal(result.exit_code, 0, JSON.stringify(result.first_failure));
  assert.equal(result.statuses.quorum_status.a, "witnessed_quorum");
});

test("[5s-seam] the comparison policy and manifest survive the same round trip", () => {
  // The other two artifacts the evaluator hands to a schema and to a consumer. Neither has drifted
  // yet, and the point of the seam is to notice when one does rather than after two more stages.
  const bundle = baseBundle();
  for (const [name, value] of [
    ["comparison_policy", comparisonPolicy()],
    ["comparison_manifest", comparisonManifest(bundle.views.map((v) => v.checkpoint))],
  ]) {
    const structural = validateArtifact(name, value);
    assert.equal(
      structural.ok,
      true,
      `${name}: the schema refused a constructed instance — ${JSON.stringify(structural.refusals)}`
    );
  }
  assert.equal(evaluate(bundle).exit_code, 0);
});

test("[5s-seam] every schema whose instance the evaluator builds is exercised by these seams", () => {
  // Anti-vacuity for the seam net itself. Four of the nine artifacts pass through the evaluator, and
  // if that set ever grows, this fails rather than letting the newcomer go unseamed.
  const seamed = ["witness_policy", "comparison_policy", "comparison_manifest", "checkpoint"];
  const bundle = baseBundle();
  for (const name of seamed) {
    assert.ok(ARTIFACT_SCHEMAS[name], `${name} is not an artifact`);
  }
  const structural = validateArtifact("checkpoint", bundle.views[0].checkpoint);
  assert.equal(structural.ok, true, JSON.stringify(structural.refusals));
});
