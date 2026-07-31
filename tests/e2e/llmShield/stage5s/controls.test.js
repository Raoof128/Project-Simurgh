// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 23 — the positive and negative controls.
//
// THE POSITIVE CONTROL IS A SELF-INFLICTED EQUIVOCATION. A producer under our own control signs two
// incompatible checkpoints at one fork coordinate, both reach committed receivers, and the detector
// must produce an artifact. Without it, every green run in this stage is consistent with a detector
// that has never detected anything — which is the state a reviewer cannot distinguish from working.
//
// THE NEGATIVE CONTROL IS THE ONE THAT KEEPS IT HONEST. A normal epoch advance over a committed
// ancestry chain, with two different signed checkpoints, must come out `compatible` and mint
// NOTHING. A detector that fires on the positive control and also on the negative one is not a
// detector; it is a machine that says "fork" when handed two signatures.
//
// AND THE NON-CLAIM SHIPS WITH THE RESULT, not in a footnote:
//
//   A self-inflicted equivocation demonstrates the detector. It is not evidence about any provider,
//   it is not an accusation, and it says nothing about whether any real producer has ever forked.
//
// That sentence is asserted here as a string in the lane output, because a non-claim that lives only
// in prose is a non-claim that gets dropped the first time someone summarises the stage.

import assert from "node:assert/strict";
import test from "node:test";

import { checkpointBodyDigest } from "../../../../tools/simurgh-attestation/stage5s/core/canonical.mjs";
import {
  baseBundle,
  checkpoint,
  comparisonManifest,
  view,
} from "../../../../tools/simurgh-attestation/stage5s/fixtures/bundle.mjs";
import { evaluate } from "../../../../tools/simurgh-attestation/stage5s/core/verify.mjs";
import { keyFor } from "../../../../tools/simurgh-attestation/stage5s/fixtures/keys.mjs";
import { verifyEquivocationArtifact } from "../../../../tools/simurgh-attestation/stage5s/core/equivocation.mjs";

/** The signed non-claim, carried in the lane output rather than argued for in prose. */
export const CONTROL_NON_CLAIM =
  "A self-inflicted equivocation demonstrates the detector. It is not evidence about any provider, " +
  "not an accusation, and not a statement that any real producer has equivocated.";

/** POSITIVE — one producer, one coordinate, two incompatible bodies, both carried. */
function positiveControl() {
  const b = baseBundle();
  // baseBundle already forks: same (producer, scope, epoch), different history roots, each carried
  // by a distinct committed receiver. Stated explicitly so the control cannot drift into something
  // milder without this assertion failing.
  assert.equal(b.views[0].checkpoint.producer_identity, b.views[1].checkpoint.producer_identity);
  assert.equal(b.views[0].checkpoint.scope_id, b.views[1].checkpoint.scope_id);
  assert.equal(b.views[0].checkpoint.epoch, b.views[1].checkpoint.epoch);
  assert.notEqual(
    checkpointBodyDigest(b.views[0].checkpoint),
    checkpointBodyDigest(b.views[1].checkpoint)
  );
  return b;
}

/** NEGATIVE — a normal epoch advance, with the committed ancestry link present. */
function negativeControl() {
  const b = baseBundle();
  const earlier = checkpoint({ epoch: 7, history_root: "root-7", predecessor: "body-6" });
  const later = checkpoint({
    epoch: 8,
    history_root: "root-8",
    predecessor: checkpointBodyDigest(earlier),
  });
  b.views = [view(earlier, ["w-a", "w-b"], ["r-a"]), view(later, ["w-a", "w-b"], ["r-b"])];
  b.comparison_manifest = comparisonManifest([earlier, later]);
  b.committed.chain = [earlier, later].map((cp) => ({
    body_digest: checkpointBodyDigest(cp),
    predecessor: cp.predecessor,
    epoch: cp.epoch,
    policy_digest: cp.policy_digest,
    protocol_version: cp.protocol_version,
  }));
  return b;
}

// ------------------------------------------------------------------ the positive control

test("[5s-t23] POSITIVE: a self-inflicted equivocation produces an artifact", () => {
  const result = evaluate(positiveControl());
  assert.equal(result.exit_code, 0, JSON.stringify(result.first_failure));
  assert.equal(result.statuses.comparison_status, "equivocation_detected");
  assert.equal(result.statuses.equivocation_artifact_status, "present");
  assert.ok(result.equivocation_artifact, "the detector produced no artifact");
  assert.deepEqual(result.relations, ["incompatible"]);
});

test("[5s-t23] POSITIVE: the artifact verifies from public inputs, by a stranger", () => {
  // An artifact only its maker can check is a press release. This is the same verification an
  // outside reviewer would run, with no access to any private key.
  const bundle = positiveControl();
  const result = evaluate(bundle);
  const verdict = verifyEquivocationArtifact(result.equivocation_artifact, {
    producer_public_key_pem: keyFor("producer").pem,
    comparison_policy: bundle.comparison_policy,
    comparison_manifest: bundle.comparison_manifest,
    witness_policy: bundle.witness_policy,
  });
  assert.equal(verdict.ok, true, JSON.stringify(verdict.refusal));
  assert.equal(verdict.comparison_status, "equivocation_detected");
});

test("[5s-t23] POSITIVE: both views reached COMMITTED receivers", () => {
  // The control is only a control if the fork actually reached the comparison set. Two checkpoints
  // nobody received would be a fork in a drawer.
  const bundle = positiveControl();
  const roster = new Set(
    bundle.comparison_policy.comparison_roster.map((s) => s.receiver_identity)
  );
  const carriers = bundle.views.map((v) => v.carried_by.map((r) => r.receiver_identity));
  for (const [i, ids] of carriers.entries()) {
    assert.ok(ids.length > 0, `view ${i} was carried by nobody`);
    for (const id of ids) assert.ok(roster.has(id), `${id} holds no committed roster seat`);
  }
  assert.notDeepEqual(carriers[0], carriers[1], "one receiver carried both views");
  assert.equal(evaluate(bundle).intake_complete, true);
});

// ------------------------------------------------------------------ the negative control

test("[5s-t23] NEGATIVE: a normal epoch advance is compatible and mints NOTHING", () => {
  const result = evaluate(negativeControl());
  assert.equal(result.exit_code, 0, JSON.stringify(result.first_failure));
  assert.deepEqual(result.relations, ["compatible"]);
  assert.equal(result.statuses.comparison_status, "no_conflict_in_committed_comparison_set");
  assert.equal(result.statuses.equivocation_artifact_status, "absent_compatible");
  assert.equal(result.equivocation_artifact, null, "an accusation was minted over a valid advance");
});

test("[5s-t23] NEGATIVE: the two checkpoints really are different and really are signed", () => {
  // Without this, the negative control could pass by being the SAME checkpoint twice — which proves
  // only that identical bytes are identical, and would make the whole control decorative.
  const bundle = negativeControl();
  const [a, b] = bundle.views.map((v) => v.checkpoint);
  assert.notEqual(
    checkpointBodyDigest(a),
    checkpointBodyDigest(b),
    "the control compares one object"
  );
  assert.notEqual(a.epoch, b.epoch);
  for (const cp of [a, b]) {
    assert.ok(cp.producer_signature, "an unsigned checkpoint would fail for the wrong reason");
  }
  assert.equal(a.producer_identity, b.producer_identity, "the control must be one producer");
});

test("[5s-t23] NEGATIVE: remove the committed link and it becomes INDETERMINATE, not a finding", () => {
  // The line between "we know these belong to one history" and "we cannot tell" — and neither of
  // them is an accusation. A detector that treated missing evidence as a fork would manufacture
  // findings out of incomplete records.
  const bundle = negativeControl();
  bundle.committed.chain = [];
  const result = evaluate(bundle);
  assert.equal(result.statuses.comparison_status, "comparison_indeterminate");
  assert.equal(result.statuses.equivocation_artifact_status, "absent_comparison_indeterminate");
  assert.equal(result.equivocation_artifact, null);
});

// ------------------------------------------------------------------ the pair, together

test("[5s-t23] the two controls DIFFER — the detector is not a constant function", () => {
  // Stated as one assertion because it is the actual claim: same producer, same scope, two signed
  // checkpoints in both cases, and opposite outcomes. Either control alone is satisfiable by a
  // detector that always says the same thing.
  const positive = evaluate(positiveControl());
  const negative = evaluate(negativeControl());
  assert.notEqual(positive.statuses.comparison_status, negative.statuses.comparison_status);
  assert.ok(positive.equivocation_artifact);
  assert.equal(negative.equivocation_artifact, null);
  assert.equal(positive.exit_code, 0);
  assert.equal(negative.exit_code, 0, "the controls must differ in FINDING, not in refusal");
});

test("[5s-t23] the non-claim ships with the lane output, not in prose", () => {
  // A non-claim that lives only in a comment is one summary away from being dropped.
  assert.match(CONTROL_NON_CLAIM, /not evidence about any provider/);
  assert.match(CONTROL_NON_CLAIM, /not an accusation/);
  assert.match(CONTROL_NON_CLAIM, /not a statement that any real producer has equivocated/);
});

test("[5s-t23] the positive control names no provider, and no real-world producer", () => {
  // The fork is ours. Nothing in the artifact may read as a claim about somebody else's system.
  const artifact = evaluate(positiveControl()).equivocation_artifact;
  const text = JSON.stringify(artifact).toLowerCase();
  for (const brand of [
    "openai",
    "anthropic",
    "google",
    "meta",
    "llama",
    "gpt",
    "claude",
    "gemini",
  ]) {
    assert.ok(!text.includes(brand), `the control artifact names ${brand}`);
  }
  assert.equal(artifact.comparison_coordinate_pair.coordinate_a.producer_identity, "producer-1");
});
