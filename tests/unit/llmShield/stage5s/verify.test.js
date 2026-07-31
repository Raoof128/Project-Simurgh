// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 16 — the ordered evaluator, and the check order as a SEQUENCE.
//
// A SET OF REACHABLE CODES IS NOT AN ORDER. Task 18 will prove every one of the 38 codes can be
// reached; that net passes unchanged if two untested checks swap places, because each code is still
// reachable from somewhere. The order is a separate claim and needs separate evidence, so it is
// pinned here as a sequence against two independent authorities — the allocator's own table and the
// spec's arrow diagram — and exercised by double-defect bundles where the reported code is the only
// thing that can distinguish a correct order from a plausible one.
//
// THE LANE SPLIT IS THE OTHER HALF. `⟂` in §2.8 means the comparison lane is evaluated on every run.
// The tests below hand the evaluator bundles whose witness lane is refused outright and require the
// fork to still be found, the artifact to still be minted, and `comparison_status` to still say what
// it saw. A verifier that stops at the first refusal would pass every reachability test and fail
// every one of these.

import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  checkpointBodyDigest,
  checkpointEnvelopeDigest,
} from "../../../../tools/simurgh-attestation/stage5s/core/canonical.mjs";
import { keyDigestOf } from "../../../../tools/simurgh-attestation/stage5s/core/equivocation.mjs";
import {
  VWQ_CLOSED_BAND,
  codeFor,
} from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";
import {
  CHECK_ORDER,
  evaluate,
  firstFailure,
} from "../../../../tools/simurgh-attestation/stage5s/core/verify.mjs";

const SPEC = "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md";

// ------------------------------------------------------------------ fixture material

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PRODUCER_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRODUCER_KEY_DIGEST = keyDigestOf(PRODUCER_PEM);
const POLICY_DIGEST = "sha256:policy-1";
const CPD = "sha256:cpd-1";

function checkpoint(over = {}, key = privateKey) {
  const body = {
    scope_id: "scope-1",
    epoch: 7,
    history_root: "root-a",
    predecessor: "body-6",
    c1_commitment: "c1-root",
    protocol_version: "vwq.1",
    policy_digest: POLICY_DIGEST,
    producer_identity: "producer-1",
    ...over,
  };
  return {
    ...body,
    producer_signature: edSign(null, Buffer.from(checkpointBodyDigest(body), "utf8"), key).toString(
      "base64"
    ),
    producer_signature_profile: "ed25519",
  };
}

const witnessPolicy = (over = {}) => ({
  scope_id: "scope-1",
  policy_id: "wp-1",
  threshold_q: 2,
  witness_roster: [
    { witness_identity: "w-a", key_digest: "sha256:wk-a", witness_operator_class: "unresolved" },
    { witness_identity: "w-b", key_digest: "sha256:wk-b", witness_operator_class: "unresolved" },
    { witness_identity: "w-c", key_digest: "sha256:wk-c", witness_operator_class: "unresolved" },
  ],
  required_class_mix: {},
  producer_identity: "producer-1",
  producer_key_digest: PRODUCER_KEY_DIGEST,
  producer_signature_profile: "ed25519",
  canonicalisation: "simurgh.vwq.canonical-json.v1",
  policy_digest: POLICY_DIGEST,
  ...over,
});

const statement = (id, cp, over = {}) => ({
  witness_identity: id,
  key_digest: `sha256:wk-${id.slice(-1)}`,
  checkpoint_envelope_digest: checkpointEnvelopeDigest(cp),
  scope_id: cp.scope_id,
  epoch: cp.epoch,
  policy_digest: cp.policy_digest,
  signature_profile: "ed25519",
  signature: "sig",
  signature_verified: true,
  ...over,
});

const receipt = (id, cp, over = {}) => ({
  receiver_identity: id,
  receiver_key_digest: `sha256:rk-${id.slice(-1)}`,
  checkpoint_envelope_digest: checkpointEnvelopeDigest(cp),
  comparison_policy_digest: CPD,
  receiver_sequence: 1,
  signature_profile: "ed25519",
  signature: "sig",
  signature_verified: true,
  ...over,
});

const comparisonPolicy = (over = {}) => ({
  comparison_roster: [
    { receiver_identity: "r-a", key_digest: "sha256:rk-a" },
    { receiver_identity: "r-b", key_digest: "sha256:rk-b" },
  ],
  receiver_signature_profile: "ed25519",
  strong_tier_intake_rule: "every_roster_receiver_responds",
  comparison_policy_digest: CPD,
  ...over,
});

/** A view whose statements and receipts bind THIS checkpoint — rebuilt, never carried over. */
const viewFor = (cp, witnesses = ["w-a", "w-b"], receivers = ["r-a"]) => ({
  checkpoint: cp,
  witness_statements: witnesses.map((id) => statement(id, cp)),
  carried_by: receivers.map((id) => receipt(id, cp)),
});

const STRANGER = generateKeyPairSync("ed25519").privateKey;

const comparisonManifest = (...cps) => ({
  comparison_policy_digest: CPD,
  views: cps.map((cp) => checkpointEnvelopeDigest(cp)).sort(),
  input_envelope_digests: cps.map((cp) => checkpointEnvelopeDigest(cp)).sort(),
  intake_complete: true,
  comparison_roster_digest: "sha256:roster-1",
});

/**
 * A bundle whose two views are one checkpoint each, both fully witnessed, both carried.
 * `histories` picks whether the two views are the same object, a fork, or an authorised advance.
 */
function bundle({ histories = ["root-a", "root-b"], epochs = [7, 7], ...over } = {}) {
  const cpA = checkpoint({ history_root: histories[0], epoch: epochs[0] });
  const cpB = checkpoint({ history_root: histories[1], epoch: epochs[1] });
  return {
    committed: {
      producer_public_key_pem: PRODUCER_PEM,
      producer_key_digest: PRODUCER_KEY_DIGEST,
      protocol_version: "vwq.1",
      c1_roots: ["c1-root"],
      chain: [],
      transition_policy: {},
    },
    witness_policy: witnessPolicy(),
    comparison_policy: comparisonPolicy(),
    comparison_manifest: comparisonManifest(cpA, cpB),
    views: [
      {
        checkpoint: cpA,
        witness_statements: [statement("w-a", cpA), statement("w-b", cpA)],
        carried_by: [receipt("r-a", cpA)],
      },
      {
        checkpoint: cpB,
        witness_statements: [statement("w-a", cpB), statement("w-b", cpB)],
        carried_by: [receipt("r-b", cpB)],
      },
    ],
    receiver_statuses: [],
    ...over,
  };
}

/** A bundle with no fork: both views are byte-identical checkpoints. */
const cleanBundle = (over = {}) => bundle({ histories: ["root-a", "root-a"], ...over });

/**
 * Seat the producer on the witness roster and have it witness its own checkpoint — 491.
 *
 * This is the laundering case used to span the order, rather than the key alias at 492: 492 is
 * currently UNREACHABLE as a first failure, because reaching the alias check requires every
 * statement to have passed the (identity, key) roster pair at 489, which forces distinct keys, and
 * the only roster that shares a key is refused six codes earlier at 485. Recorded as 5S-F010; a
 * fixture that pretended otherwise would be the test agreeing with a bug.
 */
function selfWitness(b, index) {
  // The producer takes an ADDITIONAL seat; the honest three stay, so the other view's witnesses keep
  // their seats and 489 does not fire ahead of the laundering this fixture is about.
  b.witness_policy = witnessPolicy({
    witness_roster: witnessPolicy().witness_roster.concat({
      witness_identity: "producer-1",
      key_digest: "sha256:wk-p",
      witness_operator_class: "unresolved",
    }),
  });
  const cp = b.views[index].checkpoint;
  b.views[index].witness_statements = [
    statement("producer-1", cp, { key_digest: "sha256:wk-p" }),
    statement("w-b", cp),
  ];
  return b;
}

const codeOf = (result) => result.first_failure?.raw_code ?? 0;

// ------------------------------------------------------------------ the order, as a sequence

test("[5s-t16] CHECK_ORDER is the allocator's first-appearance order, as a SEQUENCE", () => {
  const seen = [];
  for (const row of VWQ_CLOSED_BAND) {
    if (!seen.includes(row.check_id)) seen.push(row.check_id);
  }
  // deepEqual on arrays compares position by position: a swap of any two entries fails here, which a
  // set comparison would not.
  assert.deepEqual([...CHECK_ORDER], seen);
});

test("[5s-t16] CHECK_ORDER is the SPEC's §2.8 arrow diagram, parsed from the spec", () => {
  const spec = readFileSync(SPEC, "utf8");
  const block = spec.slice(spec.indexOf("### 2.8"), spec.indexOf("### 2.9"));
  // The closing fence is searched from the OPENING one. Searching from a fixed offset re-finds the
  // opener and yields an empty slice, which reads as "the spec names no checks" — a spec-parsing
  // test that passes over nothing is worse than no test.
  const open = block.indexOf("```text");
  const fence = block.slice(open + 7, block.indexOf("```", open + 7));
  const fromSpec = fence
    .split(/→|⟂/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  assert.equal(fromSpec.length, CHECK_ORDER.length, `spec names ${fromSpec.length} checks`);
  // The allocator abbreviates `checkpoint + producer` to fit its column; the sequence is the claim,
  // not the spelling, so only the prefix is compared.
  for (const [i, name] of fromSpec.entries()) {
    const mine = CHECK_ORDER[i].replace(/\+/g, " + ").replace(/\.$/, "");
    assert.ok(
      name.startsWith(mine.slice(0, 8)) || mine.startsWith(name.slice(0, 8)),
      `position ${i}: spec says "${name}", CHECK_ORDER says "${CHECK_ORDER[i]}"`
    );
  }
});

test("[5s-t16] every allocated check_id has a position, and every position is allocated", () => {
  const allocated = new Set(VWQ_CLOSED_BAND.map((r) => r.check_id));
  assert.deepEqual([...allocated].sort(), [...CHECK_ORDER].sort());
});

test("[5s-t16] firstFailure picks by position, then by the lowest code within one check", () => {
  const f = (outcome) => ({
    check_id: VWQ_CLOSED_BAND.find((r) => r.policy_outcome === outcome).check_id,
    policy_outcome: outcome,
    raw_code: codeFor(outcome),
  });
  assert.equal(
    firstFailure([f("QUORUM_BELOW_POLICY"), f("SCHEMA_UNSUPPORTED")]).raw_code,
    475,
    "a later check outranked an earlier one"
  );
  assert.equal(
    firstFailure([f("HISTORY_ROOT_MISMATCH"), f("CHECKPOINT_BINDING_MISMATCH")]).raw_code,
    477,
    "within one check the lowest allocated code must win"
  );
  assert.equal(firstFailure([]), null);
});

// ------------------------------------------------------------------ the clean run

test("[5s-t16] a clean bundle exits 0 and reports every check as evaluated but the claim gate", () => {
  const r = evaluate(cleanBundle());
  assert.equal(r.exit_code, 0, JSON.stringify(r.first_failure));
  assert.equal(r.ok, true);
  const unevaluated = r.checks.filter((c) => !c.evaluated).map((c) => c.check_id);
  // The claim gate is Task 29's and the wrapper only fires on a throw. Both are reported as
  // unevaluated rather than quietly counted as passing.
  assert.deepEqual(unevaluated, ["claim gate", "wrapper"]);
});

test("[5s-t16] the clean bundle really is clean — not green because nothing was compared", () => {
  const r = evaluate(cleanBundle());
  assert.deepEqual(r.relations, ["same_checkpoint"]);
  assert.equal(r.statuses.comparison_status, "no_conflict_in_committed_comparison_set");
  assert.equal(r.statuses.equivocation_artifact_status, "absent_same_checkpoint");
  assert.equal(r.equivocation_artifact, null);
});

test("[5s-t16] a fork exits 0 with a finding — the stage's central success is not an error", () => {
  const r = evaluate(bundle());
  assert.equal(r.exit_code, 0, JSON.stringify(r.first_failure));
  assert.deepEqual(r.relations, ["incompatible"]);
  assert.equal(r.statuses.comparison_status, "equivocation_detected");
  assert.equal(r.statuses.equivocation_artifact_status, "present");
  assert.ok(r.equivocation_artifact, "a detected fork must carry its artifact");
});

// ------------------------------------------------------------------ the lane split

test("[5s-t16] a REFUSED witness lane never silences the comparison lane", () => {
  // Producer self-witness: the witness set is laundered and takes 491. The producer's own two
  // signatures over incompatible bodies are untouched by that, and must still be reported.
  const b = bundle();
  b.witness_policy = witnessPolicy({
    witness_roster: [
      {
        witness_identity: "producer-1",
        key_digest: "sha256:wk-a",
        witness_operator_class: "unresolved",
      },
      { witness_identity: "w-b", key_digest: "sha256:wk-b", witness_operator_class: "unresolved" },
      { witness_identity: "w-c", key_digest: "sha256:wk-c", witness_operator_class: "unresolved" },
    ],
  });
  b.views = b.views.map((v) => ({
    ...v,
    witness_statements: [
      statement("producer-1", v.checkpoint, { key_digest: "sha256:wk-a" }),
      statement("w-b", v.checkpoint),
    ],
  }));

  const r = evaluate(b);
  assert.equal(codeOf(r), 491, JSON.stringify(r.first_failure));
  assert.equal(r.statuses.comparison_status, "equivocation_detected");
  assert.equal(r.statuses.equivocation_artifact_status, "present");
  assert.ok(r.equivocation_artifact, "the artifact was withdrawn because the witnesses were bad");
});

test("[5s-t16] Ruling 8 — a short witness set is a STATUS, not a refusal", () => {
  const b = bundle();
  // One statement each, against a threshold of two. Nothing claims otherwise.
  b.views = b.views.map((v) => ({ ...v, witness_statements: [statement("w-a", v.checkpoint)] }));

  const r = evaluate(b);
  assert.equal(r.exit_code, 0, `a shortfall became a refusal: ${JSON.stringify(r.first_failure)}`);
  assert.deepEqual(r.statuses.quorum_status, { a: "quorum_incomplete", b: "quorum_incomplete" });
  assert.equal(r.statuses.comparison_status, "equivocation_detected");
});

test("[5s-t16] Ruling 8 — a CLAIMED quorum that the tally does not meet takes 496", () => {
  const b = bundle();
  b.views = b.views.map((v) => ({
    ...v,
    witness_statements: [statement("w-a", v.checkpoint)],
    quorum_certificate: { claims_threshold_met: true },
  }));

  const r = evaluate(b);
  assert.equal(codeOf(r), 496, JSON.stringify(r.first_failure));
  // And even a counterfeit quorum does not withdraw the finding.
  assert.equal(r.statuses.comparison_status, "equivocation_detected");
});

test("[5s-t16] the four quorum combinations all preserve the finding", () => {
  // The executable form of QuorumShortfallCannotSuppressEquivocation. Four separate receipts, not
  // one argument — this is the question the design most invites.
  const full = (cp) => [statement("w-a", cp), statement("w-b", cp)];
  const short = (cp) => [statement("w-a", cp)];
  const cases = [
    ["met", "met", full, full, "witnessed_quorum", "witnessed_quorum"],
    ["met", "incomplete", full, short, "witnessed_quorum", "quorum_incomplete"],
    ["incomplete", "met", short, full, "quorum_incomplete", "witnessed_quorum"],
    ["incomplete", "incomplete", short, short, "quorum_incomplete", "quorum_incomplete"],
  ];
  for (const [labelA, labelB, makeA, makeB, statusA, statusB] of cases) {
    const b = bundle();
    b.views[0].witness_statements = makeA(b.views[0].checkpoint);
    b.views[1].witness_statements = makeB(b.views[1].checkpoint);
    const r = evaluate(b);
    assert.equal(
      r.statuses.comparison_status,
      "equivocation_detected",
      `${labelA}/${labelB} lost the finding`
    );
    assert.deepEqual(r.statuses.quorum_status, { a: statusA, b: statusB }, `${labelA}/${labelB}`);
    assert.ok(r.equivocation_artifact, `${labelA}/${labelB} withdrew the artifact`);
  }
});

// ------------------------------------------------------------------ six spanning double defects

test("[5s-t16] six double-defect bundles each report the EARLIER check, never the later", () => {
  // Each pair straddles a different span of the order. A verifier that ran its checks in any other
  // sequence reports the second member of at least one of these pairs.
  const pairs = [
    [
      "structural before checkpoint+producer",
      475,
      (b) => {
        delete b.witness_policy.policy_id; // 475
        b.views[0].checkpoint.history_root = ""; // 483
      },
    ],
    [
      "checkpoint+producer before witness policy",
      479,
      (b) => {
        // Signed by a stranger, and the statements REBUILT over it. Mutating the signature in place
        // would move the envelope digest out from under the statements and report 477 instead —
        // correct behaviour, wrong fixture, and the first run of this test said so.
        b.views[0] = viewFor(checkpoint({ history_root: "root-a" }, STRANGER)); // 479
        b.witness_policy.threshold_q = 0; // 485
      },
    ],
    [
      "witness policy before witness identity",
      485,
      (b) => {
        b.witness_policy.threshold_q = 0; // 485
        b.views[0].witness_statements[0].witness_identity = ""; // 488
      },
    ],
    [
      "witness identity before laundering",
      489,
      (b) => {
        b.views[0].witness_statements[0].witness_identity = "w-stranger"; // 489
        selfWitness(b, 1); // 491
      },
    ],
    [
      "laundering before quorum",
      491,
      (b) => {
        selfWitness(b, 0); // 491
        b.views[1].witness_statements = [statement("w-a", b.views[1].checkpoint)];
        b.views[1].quorum_certificate = { claims_threshold_met: true }; // 496
      },
    ],
    [
      "quorum before comparison policy",
      496,
      (b) => {
        b.views[0].witness_statements = [statement("w-a", b.views[0].checkpoint)];
        b.views[0].quorum_certificate = { claims_threshold_met: true }; // 496
        // An EMPTY roster, not a deleted digest: a deleted required field is a structural defect and
        // takes 475 at the top of the order, which would make this pair span the wrong two checks.
        b.comparison_policy.comparison_roster = []; // 498
      },
    ],
  ];

  for (const [label, expected, damage] of pairs) {
    const b = bundle();
    damage(b);
    const r = evaluate(b);
    assert.equal(
      codeOf(r),
      expected,
      `${label}: got ${codeOf(r)} ${JSON.stringify(r.first_failure)}`
    );
  }
});

// ------------------------------------------------------------------ fail-closed

test("[5s-t16] the wrapper catches anything unmodelled as 512, never as a pass", () => {
  const b = bundle();
  // A getter that throws is the cheapest stand-in for the class of defect nobody enumerated.
  Object.defineProperty(b, "views", {
    get() {
      throw new Error("unmodelled input");
    },
  });
  const r = evaluate(b);
  assert.equal(r.exit_code, 512);
  assert.equal(r.first_failure.policy_outcome, "VWQ_UNKNOWN");
  assert.equal(r.statuses.comparison_status, "comparison_unavailable");
  assert.equal(
    r.checks.every((c) => !c.evaluated),
    true,
    "a crashed run must claim no checks"
  );
});

test("[5s-t16] absent, empty and malformed bundles never exit 0", () => {
  for (const bad of [undefined, null, {}, { views: [] }, { views: "two" }]) {
    const r = evaluate(bad);
    assert.notEqual(r.exit_code, 0, `${JSON.stringify(bad)} verified clean`);
  }
});

test("[5s-t16] the claim gate runs only when a surface is declared, and is never assumed green", () => {
  const withoutSurface = evaluate(cleanBundle());
  assert.equal(
    withoutSurface.checks.find((c) => c.check_id === "claim gate").evaluated,
    false,
    "an unevaluated gate must not report as evaluated"
  );

  const withSurface = evaluate(
    cleanBundle({ claim_surfaces: ["the producer did not equivocate"] }),
    {
      claimGate: (surfaces) =>
        surfaces
          .filter((s) => /did not equivocate/.test(s))
          .map((s) => ({ reason: "NONEQUIVOCATION_OVERCLAIM", detail: s })),
    }
  );
  assert.equal(withSurface.exit_code, 511);
  assert.equal(withSurface.checks.find((c) => c.check_id === "claim gate").evaluated, true);
});
