// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 14 — the equivocation artifact and its self-verification.
//
// THE ARTIFACT PROVES ONE NARROW SENTENCE, and nothing wider:
//
//   Two producer-authenticated checkpoints occupy an incompatible relation under the committed
//   comparison authority.
//
// Not that the producer is dishonest. Not that a fork reached anyone. Not that the witness quorum
// agreed — quorum is irrelevant to the finding, and four of the tests below hold that line.
//
// THE VERIFIER RECOMPUTES; IT DOES NOT READ. Stored fields such as `same_scope: true`,
// `same_epoch: true` and `compatibility_verdict: "incompatible"` are EVIDENCE CLAIMS TO CHECK, not
// inputs to believe. An artifact asserting its own conclusion and being believed is a press release.
//
// IT ALSO MUST NOT CHECK ITSELF. `verifyEquivocationArtifact` never calls the builder: comparing a
// builder to itself proves the builder is deterministic and proves nothing about the artifact. A
// source scan holds that, and the scan is seeded-red-proven like the Task 13 ones.
//
// THE ANTI-FALSE-ACCUSATION CONTROL IS THE MOST IMPORTANT TEST IN THIS FILE. A normal epoch advance
// with valid transitive ancestry and fully authenticated views, wrapped in a forged artifact, must
// take 510 — never a finding. It is the proof that the detector is not "two different signed
// checkpoints means fork".

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

import {
  checkpointBodyDigest,
  checkpointEnvelopeDigest,
} from "../../../../tools/simurgh-attestation/stage5s/core/canonical.mjs";
import {
  ARTIFACT_SCHEMA,
  EQUIVOCATION_REFUSALS,
  REQUIRED_ARTIFACT_BINDINGS,
  artifactDigestOf,
  comparisonManifestDigest,
  deriveEquivocationArtifact,
  keyDigestOf,
  receiverProvenanceRoot,
  verifyEquivocationArtifact,
} from "../../../../tools/simurgh-attestation/stage5s/core/equivocation.mjs";

const SRC = "tools/simurgh-attestation/stage5s/core/equivocation.mjs";

// ------------------------------------------------------------------ fixture material

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PRODUCER_PUB_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const PRODUCER_KEY_DIGEST = keyDigestOf(PRODUCER_PUB_PEM);

const { publicKey: otherPub, privateKey: otherPriv } = generateKeyPairSync("ed25519");
const OTHER_PUB_PEM = otherPub.export({ type: "spki", format: "pem" }).toString();

/** Sign the canonical body digest, the way a producer commits to a checkpoint body. */
function signCheckpoint(body, key = privateKey) {
  const bodyDigest = checkpointBodyDigest(body);
  return edSign(null, Buffer.from(bodyDigest, "utf8"), key).toString("base64");
}

function checkpoint(over = {}, key = privateKey) {
  const body = {
    scope_id: "scope-1",
    epoch: 7,
    history_root: "root-a",
    predecessor: "body-6",
    c1_commitment: "c1-a",
    protocol_version: "vwq.1",
    policy_digest: "pol-1",
    producer_identity: "producer-1",
    ...over,
  };
  return {
    ...body,
    producer_signature: signCheckpoint(body, key),
    producer_signature_profile: "ed25519",
  };
}

const receipt = (id, envelopeDigest, over = {}) => ({
  receiver_identity: id,
  receiver_key_digest: `rk-${id.slice(-1)}`,
  checkpoint_envelope_digest: envelopeDigest,
  comparison_policy_digest: "cpd-1",
  receiver_sequence: 1,
  signature_verified: true,
  ...over,
});

function viewOf(cp, receiverIds) {
  const envelope = checkpointEnvelopeDigest(cp);
  return { checkpoint: cp, carried_by: receiverIds.map((id) => receipt(id, envelope)) };
}

const comparisonPolicy = () => ({
  comparison_roster: [
    { receiver_identity: "r-a", key_digest: "rk-a" },
    { receiver_identity: "r-b", key_digest: "rk-b" },
    { receiver_identity: "r-c", key_digest: "rk-c" },
  ],
  receiver_signature_profile: "ed25519",
  strong_tier_intake_rule: "every_roster_receiver_responds",
  comparison_policy_digest: "cpd-1",
});

/** The committed comparison manifest: the set of envelope digests actually compared. */
const manifestFor = (...views) => ({
  comparison_scope: { scope_id: "scope-1" },
  comparison_policy_digest: "cpd-1",
  policy_digest: "pol-1",
  comparator_version: "vwq-comparator.1",
  input_envelope_digests: views.map((v) => checkpointEnvelopeDigest(v.checkpoint)).sort(),
});

/** The forked pair: one coordinate, two bodies. */
const FORK_A = () => viewOf(checkpoint(), ["r-a"]);
const FORK_B = () => viewOf(checkpoint({ history_root: "root-b", c1_commitment: "c1-b" }), ["r-b"]);

/** The honest pair: a normal epoch advance with a real ancestry link. */
const ADVANCE_EARLY = () => viewOf(checkpoint(), ["r-a"]);
const ADVANCE_LATE = () =>
  viewOf(checkpoint({ epoch: 8, history_root: "root-8", predecessor: null }), ["r-b"]);

function chainFor(earlyView, lateView) {
  const early = earlyView.checkpoint;
  const late = lateView.checkpoint;
  return [
    {
      body_digest: checkpointBodyDigest(early),
      predecessor: null,
      epoch: early.epoch,
      policy_digest: early.policy_digest,
      protocol_version: early.protocol_version,
    },
    {
      body_digest: checkpointBodyDigest(late),
      predecessor: checkpointBodyDigest(early),
      epoch: late.epoch,
      policy_digest: late.policy_digest,
      protocol_version: late.protocol_version,
    },
  ];
}

const build = (over = {}) => {
  const a = over.view_a ?? FORK_A();
  const b = over.view_b ?? FORK_B();
  return deriveEquivocationArtifact({
    view_a: a,
    view_b: b,
    comparison_policy: comparisonPolicy(),
    comparison_manifest: manifestFor(a, b),
    producer_key_digest: PRODUCER_KEY_DIGEST,
    ...over,
  });
};

const publicInputs = (over = {}) => ({
  producer_public_key_pem: PRODUCER_PUB_PEM,
  comparison_policy: comparisonPolicy(),
  comparison_manifest: manifestFor(FORK_A(), FORK_B()),
  ...over,
});

/** Deep clone so an attack mutates a copy, never the shared fixture. */
const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * A COMPETENT forgery: every mechanical check is made to pass — real signatures, real receipts,
 * correctly recomputed digests, a correctly recomputed provenance root, a correctly recomputed seal.
 * The ONLY thing wrong is the claim. A forgery that fails on arithmetic tests the arithmetic; this
 * one tests whether the accusation itself is checked.
 */
function forgeAccusation(viewA, viewB, manifest) {
  const artifact = {
    schema: ARTIFACT_SCHEMA,
    protocol_version: viewA.checkpoint.protocol_version,
    fork_coordinate: {
      producer_identity: viewA.checkpoint.producer_identity,
      scope_id: viewA.checkpoint.scope_id,
      epoch_a: viewA.checkpoint.epoch,
      epoch_b: viewB.checkpoint.epoch,
    },
    view_a: {
      checkpoint: clone(viewA.checkpoint),
      checkpoint_body_digest: checkpointBodyDigest(viewA.checkpoint),
      checkpoint_envelope_digest: checkpointEnvelopeDigest(viewA.checkpoint),
      carried_by: clone(viewA.carried_by),
    },
    view_b: {
      checkpoint: clone(viewB.checkpoint),
      checkpoint_body_digest: checkpointBodyDigest(viewB.checkpoint),
      checkpoint_envelope_digest: checkpointEnvelopeDigest(viewB.checkpoint),
      carried_by: clone(viewB.carried_by),
    },
    producer_key_digest: PRODUCER_KEY_DIGEST,
    comparison_policy_digest: "cpd-1",
    comparison_manifest_digest: comparisonManifestDigest(manifest),
    receiver_provenance_root: receiverProvenanceRoot(viewA.carried_by, viewB.carried_by),
    derivation: {
      same_producer: true,
      same_scope: true,
      same_epoch: viewA.checkpoint.epoch === viewB.checkpoint.epoch,
      body_digests_differ: true,
      ancestry_verdict: "not_ancestor",
      compatibility_verdict: "incompatible",
    },
    comparison_status: "equivocation_detected",
    finding_id: "VWQ_EQUIVOCATION_DETECTED",
  };
  artifact.artifact_digest = artifactDigestOf(artifact);
  return artifact;
}

// ------------------------------------------------------------------ the happy path

test("[5s-t14] a genuine fork yields an artifact, exit 0, and the finding id", () => {
  const built = build();
  assert.equal(built.ok, true, JSON.stringify(built.refusal));
  assert.equal(built.comparison_status, "equivocation_detected");
  assert.equal(built.artifact.finding_id, "VWQ_EQUIVOCATION_DETECTED");

  const v = verifyEquivocationArtifact(built.artifact, publicInputs());
  assert.equal(v.ok, true, JSON.stringify(v.refusal));
  assert.equal(
    v.exit_code,
    0,
    "a detected fork is a FINDING about a producer, not a verifier failure"
  );
  assert.equal(v.comparison_status, "equivocation_detected");
});

test("[5s-t14] every required binding of the ruling is present and non-empty", () => {
  const { artifact } = build();
  for (const field of REQUIRED_ARTIFACT_BINDINGS) {
    assert.ok(
      artifact[field] !== undefined && artifact[field] !== null && artifact[field] !== "",
      `binding absent: ${field}`
    );
  }
  assert.equal(artifact.schema, ARTIFACT_SCHEMA);
});

test("[5s-t14] BOTH body and envelope digests are retained for BOTH views", () => {
  // Body establishes incompatibility; envelope establishes attribution and receipt binding. Dropping
  // either leaves a claim the artifact cannot support on its own.
  const { artifact } = build();
  for (const view of [artifact.view_a, artifact.view_b]) {
    assert.equal(view.checkpoint_body_digest, checkpointBodyDigest(view.checkpoint));
    assert.equal(view.checkpoint_envelope_digest, checkpointEnvelopeDigest(view.checkpoint));
    assert.notEqual(view.checkpoint_body_digest, view.checkpoint_envelope_digest);
  }
  assert.notEqual(artifact.view_a.checkpoint_body_digest, artifact.view_b.checkpoint_body_digest);
});

// ------------------------------------------------------------------ the twelve mandatory attacks

test("[5s-t14] ATTACK 1 — swap one checkpoint after construction → 510", () => {
  const { artifact } = build();
  const forged = clone(artifact);
  forged.view_b.checkpoint = clone(artifact.view_a.checkpoint);
  const v = verifyEquivocationArtifact(forged, publicInputs());
  assert.equal(v.ok, false);
  assert.equal(v.exit_code, 510);
});

test("[5s-t14] ATTACK 2 — substitute the envelope digest for the body digest → 510", () => {
  // The substitution that would make two valid signatures over one history look like a fork.
  const { artifact } = build();
  const forged = clone(artifact);
  forged.view_a.checkpoint_body_digest = forged.view_a.checkpoint_envelope_digest;
  const v = verifyEquivocationArtifact(forged, publicInputs());
  assert.equal(v.ok, false);
  assert.equal(v.exit_code, 510);
  assert.match(v.refusal.check, /body_digest/);
});

test("[5s-t14] ATTACK 3 — mutate producer identity, scope or epoch → 510", () => {
  for (const field of ["producer_identity", "scope_id", "epoch"]) {
    const { artifact } = build();
    const forged = clone(artifact);
    forged.view_b.checkpoint[field] = field === "epoch" ? 9 : "elsewhere";
    const v = verifyEquivocationArtifact(forged, publicInputs());
    assert.equal(v.ok, false, `${field} mutation was accepted`);
    assert.equal(v.exit_code, 510);
  }
});

test("[5s-t14] ATTACK 4 — replace one producer signature → 510", () => {
  // Signed by a key the committed policy never named. The artifact claims BOTH checkpoints are
  // producer-authenticated; one of them is not.
  const foreign = viewOf(checkpoint({ history_root: "root-b" }, otherPriv), ["r-b"]);
  const built = build({ view_b: foreign });
  const v = verifyEquivocationArtifact(built.artifact ?? built, {
    ...publicInputs(),
    comparison_manifest: manifestFor(FORK_A(), foreign),
  });
  assert.equal(v.ok, false);
  assert.equal(v.exit_code, 510);
  assert.match(v.refusal.check, /producer_signature/);
});

test("[5s-t14] ATTACK 4b — a foreign public key cannot verify a genuine artifact", () => {
  const { artifact } = build();
  const v = verifyEquivocationArtifact(
    artifact,
    publicInputs({ producer_public_key_pem: OTHER_PUB_PEM })
  );
  assert.equal(v.ok, false);
  assert.equal(v.exit_code, 510);
});

test("[5s-t14] ATTACK 5 — alter the comparison-policy digest → 510", () => {
  const { artifact } = build();
  const forged = clone(artifact);
  forged.comparison_policy_digest = "cpd-elsewhere";
  const v = verifyEquivocationArtifact(forged, publicInputs());
  assert.equal(v.ok, false);
  assert.equal(v.exit_code, 510);
});

test("[5s-t14] ATTACK 6 — omit one authenticated receiver receipt → 510", () => {
  const { artifact } = build();
  const forged = clone(artifact);
  forged.view_b.carried_by = [];
  const v = verifyEquivocationArtifact(forged, publicInputs());
  assert.equal(v.ok, false);
  assert.equal(v.exit_code, 510);
  assert.match(v.refusal.check, /receiver_provenance|carried_by/);
});

test("[5s-t14] ATTACK 6b — an unauthenticated or off-roster receipt carries nothing", () => {
  for (const over of [{ signature_verified: false }, { receiver_identity: "r-invented" }]) {
    const { artifact } = build();
    const forged = clone(artifact);
    forged.view_a.carried_by = [{ ...forged.view_a.carried_by[0], ...over }];
    const v = verifyEquivocationArtifact(forged, publicInputs());
    assert.equal(v.ok, false, `${JSON.stringify(over)} was accepted as provenance`);
    assert.equal(v.exit_code, 510);
  }
});

test("[5s-t14] ATTACK 7 — change the stored derivation, checkpoints intact → 510", () => {
  // The stored derivation is a CLAIM. Each of these leaves both checkpoints untouched and valid.
  for (const mutation of [
    { same_scope: false },
    { same_epoch: false },
    { body_digests_differ: false },
    { compatibility_verdict: "compatible" },
  ]) {
    const { artifact } = build();
    const forged = clone(artifact);
    Object.assign(forged.derivation, mutation);
    const v = verifyEquivocationArtifact(forged, publicInputs());
    assert.equal(v.ok, false, `${JSON.stringify(mutation)} was believed`);
    assert.equal(v.exit_code, 510);
  }
});

test("[5s-t14] ATTACK 8 — claim incompatibility over a valid ancestry chain → 510", () => {
  const early = ADVANCE_EARLY();
  const late = ADVANCE_LATE();
  const chain = chainFor(early, late);
  const built = build({
    view_a: early,
    view_b: late,
    comparison_manifest: manifestFor(early, late),
    committed_chain: chain,
  });
  // The builder refuses outright: this is not a fork.
  assert.equal(built.ok, true);
  assert.equal(built.artifact, null);
  assert.notEqual(built.comparison_status, "equivocation_detected");

  // And a COMPETENT forgery over the same pair — every digest and seal recomputed correctly — is
  // refused on the claim itself, not on arithmetic.
  const forged = forgeAccusation(early, late, manifestFor(early, late));
  const v = verifyEquivocationArtifact(forged, {
    ...publicInputs(),
    comparison_manifest: manifestFor(early, late),
    committed_chain: chain,
  });
  assert.equal(v.ok, false);
  assert.equal(v.exit_code, 510);
  assert.equal(v.refusal.check, "compatibility_verdict");
});

test("[5s-t14] ATTACK 9 — malformed cyclic ancestry → 509, never 510", () => {
  // A contradictory proof is a different failure from a false artifact, and blending them would tell
  // a reviewer the artifact was forged when the chain was the broken thing.
  const early = ADVANCE_EARLY();
  const late = ADVANCE_LATE();
  const cyclic = chainFor(early, late).map((n) => ({
    ...n,
    predecessor: checkpointBodyDigest(late.checkpoint),
  }));
  const built = build({
    view_a: early,
    view_b: late,
    comparison_manifest: manifestFor(early, late),
    committed_chain: cyclic,
  });
  assert.equal(built.ok, false);
  assert.equal(built.exit_code, 509);
  assert.equal(built.refusal.reason, EQUIVOCATION_REFUSALS.ANCESTRY_PROOF_INVALID);
});

test("[5s-t14] ATTACK 10 — reordering set-canonical receipts leaves the artifact BYTE-STABLE", () => {
  const a = viewOf(checkpoint(), ["r-a", "r-b", "r-c"]);
  const b = viewOf(checkpoint({ history_root: "root-b" }), ["r-c", "r-b", "r-a"]);
  const forward = build({ view_a: a, view_b: b, comparison_manifest: manifestFor(a, b) });

  const aRev = { ...a, carried_by: [...a.carried_by].reverse() };
  const bRev = { ...b, carried_by: [...b.carried_by].reverse() };
  const reversed = build({
    view_a: aRev,
    view_b: bRev,
    comparison_manifest: manifestFor(aRev, bRev),
  });

  assert.equal(forward.artifact.artifact_digest, reversed.artifact.artifact_digest);
  assert.deepEqual(forward.artifact, reversed.artifact);
});

test("[5s-t14] ATTACK 11 — an artifact built in ANOTHER PROCESS verifies from public inputs only", () => {
  // Built by a separate `node` process that holds the private key; verified here with nothing but the
  // artifact, the public key, and the committed comparison authority.
  const coreUrl = pathToFileURL(
    `${process.cwd()}/tools/simurgh-attestation/stage5s/core/equivocation.mjs`
  ).href;
  const canonUrl = pathToFileURL(
    `${process.cwd()}/tools/simurgh-attestation/stage5s/core/canonical.mjs`
  ).href;
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  const script = `
    import { deriveEquivocationArtifact } from ${JSON.stringify(coreUrl)};
    import { checkpointBodyDigest, checkpointEnvelopeDigest } from ${JSON.stringify(canonUrl)};
    import { createPrivateKey, sign } from "node:crypto";
    const key = createPrivateKey(${JSON.stringify(privPem)});
    const mk = (over) => {
      const body = { scope_id: "scope-1", epoch: 7, history_root: "root-a", predecessor: "body-6",
        c1_commitment: "c1-a", protocol_version: "vwq.1", policy_digest: "pol-1",
        producer_identity: "producer-1", ...over };
      return { ...body,
        producer_signature: sign(null, Buffer.from(checkpointBodyDigest(body), "utf8"), key).toString("base64"),
        producer_signature_profile: "ed25519" };
    };
    const rc = (id, env) => ({ receiver_identity: id, receiver_key_digest: "rk-" + id.slice(-1),
      checkpoint_envelope_digest: env, comparison_policy_digest: "cpd-1", receiver_sequence: 1,
      signature_verified: true });
    const view = (cp, ids) => ({ checkpoint: cp, carried_by: ids.map((i) => rc(i, checkpointEnvelopeDigest(cp))) });
    const a = view(mk({}), ["r-a"]);
    const b = view(mk({ history_root: "root-b", c1_commitment: "c1-b" }), ["r-b"]);
    const out = deriveEquivocationArtifact({
      view_a: a, view_b: b,
      comparison_policy: ${JSON.stringify(comparisonPolicy())},
      comparison_manifest: { comparison_scope: { scope_id: "scope-1" }, comparison_policy_digest: "cpd-1",
        policy_digest: "pol-1", comparator_version: "vwq-comparator.1",
        input_envelope_digests: [checkpointEnvelopeDigest(a.checkpoint), checkpointEnvelopeDigest(b.checkpoint)].sort() },
      producer_key_digest: ${JSON.stringify(PRODUCER_KEY_DIGEST)},
    });
    process.stdout.write(JSON.stringify(out));
  `;
  const raw = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8",
  });
  const foreign = JSON.parse(raw);
  assert.equal(foreign.ok, true, JSON.stringify(foreign.refusal));

  const manifest = {
    comparison_scope: { scope_id: "scope-1" },
    comparison_policy_digest: "cpd-1",
    policy_digest: "pol-1",
    comparator_version: "vwq-comparator.1",
    input_envelope_digests: [
      foreign.artifact.view_a.checkpoint_envelope_digest,
      foreign.artifact.view_b.checkpoint_envelope_digest,
    ].sort(),
  };
  const v = verifyEquivocationArtifact(
    foreign.artifact,
    publicInputs({ comparison_manifest: manifest })
  );
  assert.equal(v.ok, true, JSON.stringify(v.refusal));
  assert.equal(v.exit_code, 0);
});

test("[5s-t14] ATTACK 12 — all four quorum combinations verify the SAME finding", () => {
  const { artifact } = build();
  for (const a of ["witnessed_quorum", "quorum_incomplete"]) {
    for (const b of ["witnessed_quorum", "quorum_incomplete"]) {
      const v = verifyEquivocationArtifact(artifact, {
        ...publicInputs(),
        quorum_status_a: a,
        quorum_status_b: b,
      });
      assert.equal(v.ok, true, `${a}/${b} suppressed the finding`);
      assert.equal(v.exit_code, 0);
      assert.equal(v.comparison_status, "equivocation_detected");
    }
  }
});

// ------------------------------------------------------------------ the control

test("[5s-t14] ANTI-FALSE-ACCUSATION — honest advance + forged artifact → 510, NEVER a finding", () => {
  // Everything about this run is legitimate: a normal epoch advance, valid transitive ancestry, both
  // views fully authenticated by the committed producer key, both carried by roster receivers. Only
  // the artifact lies. If this returned a finding, the detector would be nothing more than
  // "two different signed checkpoints means fork".
  const early = ADVANCE_EARLY();
  const late = ADVANCE_LATE();
  const chain = chainFor(early, late);
  const manifest = manifestFor(early, late);

  const forged = forgeAccusation(early, late, manifest);

  // Every mechanical check passes by construction. Prove that before asserting the refusal, so a
  // pass here can never come from the forgery being sloppy somewhere else.
  assert.equal(artifactDigestOf(forged), forged.artifact_digest);
  assert.equal(
    receiverProvenanceRoot(forged.view_a.carried_by, forged.view_b.carried_by),
    forged.receiver_provenance_root
  );
  assert.equal(comparisonManifestDigest(manifest), forged.comparison_manifest_digest);

  const v = verifyEquivocationArtifact(forged, {
    ...publicInputs(),
    comparison_manifest: manifest,
    committed_chain: chain,
  });
  assert.equal(v.ok, false, "a forged accusation over an honest history was believed");
  assert.equal(v.exit_code, 510);
  assert.equal(v.refusal.check, "compatibility_verdict");
  assert.notEqual(v.comparison_status, "equivocation_detected");
});

test("[5s-t14] the control's honest twin: the SAME pair with no forgery is simply clean", () => {
  // The other half of the control. If the fixture could not produce a clean verdict at all, the
  // refusal above would prove nothing about accusation-checking.
  const early = ADVANCE_EARLY();
  const late = ADVANCE_LATE();
  const built = build({
    view_a: early,
    view_b: late,
    comparison_manifest: manifestFor(early, late),
    committed_chain: chainFor(early, late),
  });
  assert.equal(built.ok, true);
  assert.equal(built.artifact, null);
  assert.equal(built.comparison_status, "no_conflict_in_committed_comparison_set");
});

test("[5s-t14] insufficient committed material → comparison_indeterminate and NO artifact", () => {
  const early = ADVANCE_EARLY();
  const late = ADVANCE_LATE();
  const built = build({
    view_a: early,
    view_b: late,
    comparison_manifest: manifestFor(early, late),
    // No committed chain at all: ancestry is unprovable, so the relation is indeterminate.
  });
  assert.equal(built.ok, true);
  assert.equal(built.artifact, null, "an artifact was minted from an indeterminate comparison");
  assert.equal(built.comparison_status, "comparison_indeterminate");
});

// ------------------------------------------------------------------ structural guarantees

test("[5s-t14] the artifact digest covers every binding — one flipped byte anywhere breaks it", () => {
  const { artifact } = build();
  for (const path of [
    ["comparison_manifest_digest"],
    ["receiver_provenance_root"],
    ["fork_coordinate", "epoch_a"],
    ["view_a", "checkpoint_envelope_digest"],
    ["derivation", "compatibility_verdict"],
    ["finding_id"],
  ]) {
    const forged = clone(artifact);
    let node = forged;
    for (const k of path.slice(0, -1)) node = node[k];
    const leaf = path[path.length - 1];
    node[leaf] = typeof node[leaf] === "number" ? node[leaf] + 1 : `${node[leaf]}-x`;
    const v = verifyEquivocationArtifact(forged, publicInputs());
    assert.equal(v.ok, false, `${path.join(".")} was not covered by the digest`);
    assert.equal(v.exit_code, 510);
  }
});

test("[5s-t14] a missing binding is refused, one field at a time", () => {
  for (const field of REQUIRED_ARTIFACT_BINDINGS) {
    const { artifact } = build();
    const forged = clone(artifact);
    delete forged[field];
    const v = verifyEquivocationArtifact(forged, publicInputs());
    assert.equal(v.ok, false, `${field} was optional`);
    assert.equal(v.exit_code, 510);
  }
});

test("[5s-t14] the verifier NEVER calls the builder — checked over source", () => {
  const code = readFileSync(SRC, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  const body = code.slice(code.indexOf("export function verifyEquivocationArtifact"));
  const next = body.indexOf("\nexport ", 1);
  const fn = next === -1 ? body : body.slice(0, next);
  assert.ok(fn.includes("artifact_digest"), "the extracted body is not the verifier");
  assert.ok(
    !fn.includes("deriveEquivocationArtifact"),
    "the verifier calls the builder and compares it to itself"
  );
  // ATTACK 12's structural half. Four passing quorum combinations prove nothing if the verifier
  // reads the quorum lane and merely happens to agree with itself today.
  assert.ok(!/quorum/i.test(fn), "the verifier reads the quorum lane");
});

test("[5s-t14] the verifier is pure over its inputs — verifying twice changes nothing", () => {
  const { artifact } = build();
  const before = JSON.stringify(artifact);
  const first = verifyEquivocationArtifact(artifact, publicInputs());
  const second = verifyEquivocationArtifact(artifact, publicInputs());
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(artifact), before, "verification mutated the artifact");
});

test("[5s-t14] a malformed artifact is refused rather than thrown — 512 never fires from here", () => {
  for (const bad of [undefined, null, "artifact", [], 7, {}]) {
    const v = verifyEquivocationArtifact(bad, publicInputs());
    assert.equal(v.ok, false);
    assert.equal(v.exit_code, 510);
  }
});
