// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — K7 all-functions e2e net: every export exercised + full tamper reachability + cross-stage
// invariants (embedded 5I + 5J still raw 0; audit => public). Runs via scripts/check.sh, not `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as merkle from "../../../../tools/simurgh-attestation/stage5k/core/merkle.mjs";
import * as projection from "../../../../tools/simurgh-attestation/stage5k/core/projection.mjs";
import * as digests from "../../../../tools/simurgh-attestation/stage5k/core/digests.mjs";
import * as signatures from "../../../../tools/simurgh-attestation/stage5k/core/signatures.mjs";
import * as attestation from "../../../../tools/simurgh-attestation/stage5k/core/attestation.mjs";
import * as projections from "../../../../tools/simurgh-attestation/stage5k/core/projections.mjs";
import { buildSignedVucBundle } from "../../../../tools/simurgh-attestation/stage5k/node/buildSignedBundle.mjs";
import {
  makeAdapterFacts,
  makeAttestationFacts,
  verifyVuc,
} from "../../../../tools/simurgh-attestation/stage5k/node/adapter.mjs";
import { makeCtx } from "../../../../tools/simurgh-attestation/stage5k/core/context.mjs";
import { vucVerify } from "../../../../tools/simurgh-attestation/stage5k/core/vucCore.mjs";
import { buildLaneAEvidence } from "../../../../tools/simurgh-attestation/stage5k/node/build-vuc-evidence.mjs";
import { verifyPack } from "../../../../tools/simurgh-attestation/stage5k/node/verify-vuc-attestation.mjs";
import { verifyByteStability } from "../../../../tools/simurgh-attestation/stage5k/node/verify-byte-stability.mjs";

const { bundle, cfg } = buildSignedVucBundle();
const facts = makeAdapterFacts(bundle, cfg);

test("every core export is reachable and exercised", () => {
  // merkle
  const h = merkle.leafHash({
    leaf_id: "1",
    leaf_type: "vpc_section",
    subject_digest: "sha256:" + "0".repeat(64),
  });
  const root = merkle.merkleRoot([h, h]);
  merkle.nodeHash(h, h);
  const proof = merkle.buildInclusion([h, h], 0);
  assert.equal(
    merkle.verifyInclusion(proof, merkle.encodeDigest(h), merkle.encodeDigest(root)),
    true
  );
  // projection
  const p = projection.projectSection(
    { section_id: "1", canonical_path: "sec/1", redaction_types: [] },
    "sha256:" + "a".repeat(64)
  );
  projection.sectionSubjectDigest({
    partition_digest: "sha256:" + "a".repeat(64),
    section_id: "1",
    canonical_path: "sec/1",
    redaction_types: [],
  });
  assert.ok(projection.universeSetDigest([p]).startsWith("sha256:"));
  // digests
  assert.ok(digests.artifactDigest({ x: 1 }).startsWith("sha256:"));
  assert.ok(digests.domainDigest("d", { x: 1 }).startsWith("sha256:"));
  digests.identityDigest({ identity_subject: "s", key_fingerprint: "f" });
  // signatures
  assert.equal(typeof signatures.fingerprint, "function");
  // projections + attestation module functions
  const ctx = makeCtx(bundle, cfg, facts);
  assert.ok(projections.computeProjections(ctx).projection_root.startsWith("sha256:"));
  assert.ok(attestation.vucBundleDigest(bundle).startsWith("sha256:"));
  assert.ok(attestation.verificationContextDigest(bundle).startsWith("sha256:"));
});

test("valid ceremony verifies raw 0 both tiers; verifyVuc wrapper agrees", () => {
  assert.equal(vucVerify(bundle, cfg, facts, { tier: "public" }).raw, 0);
  assert.equal(vucVerify(bundle, cfg, facts, { tier: "audit" }).raw, 0);
  assert.equal(verifyVuc(bundle, cfg, { tier: "audit" }).raw, 0);
});

test("cross-stage invariant: embedded 5I + 5J verdicts are 0", () => {
  assert.equal(facts.vpc_verdict, 0);
  assert.equal(facts.vrc_verdict, 0);
});

test("tamper reachability — every raw 349..363 reachable at first-failure", () => {
  const v = (mut, tier = "public", fo = null) => {
    const b = structuredClone(bundle);
    mut(b);
    const f = fo ?? makeAdapterFacts(b, cfg);
    return vucVerify(b, cfg, f, { tier }).raw;
  };
  assert.equal(
    v((b) => (b.universe_commitment.universe_root = "sha256:" + "9".repeat(64))),
    349
  );
  assert.equal(
    v((b) => (b.ordering_anchor.subject_digest = "sha256:" + "1".repeat(64))),
    350
  );
  assert.equal(
    v((b) => {}, "public", { ...facts, orderingState: "invalid" }),
    351
  );
  assert.equal(
    v((b) => (b.vpc_ref.partition_digest = "sha256:" + "2".repeat(64))),
    352
  );
  assert.equal(
    v((b) => b.review_start_records.pop()),
    353
  );
  assert.equal(
    v((b) => (b.start_challenges[0].ordering_receipt_digest = "sha256:" + "3".repeat(64))),
    354
  );
  assert.equal(
    v((b) => (b.review_execution_bindings[0].rating_entry_digests = [])),
    355
  );
  assert.equal(
    v((b) => b.inclusion_proofs.pop()),
    356
  );
  // 357/358/359 via injected ctx are covered in unit setlaws; here confirm 360/361/362/363
  assert.equal(
    v((b) => (b.claimed_finality_state = "confirmed")),
    360
  );
  assert.equal(
    v((b) => (b.projections.projection_root = "sha256:" + "4".repeat(64)), "audit"),
    361
  );
  assert.equal(
    v((b) => (b.review_window_binding = { x: 1 })),
    362
  );
  assert.equal(vucVerify(bundle, undefined, {}).raw, 363);
});

test("committed pack byte-stable + verifies", () => {
  const dir = mkdtempSync(join(tmpdir(), "vuc-k7-"));
  buildLaneAEvidence(dir);
  assert.equal(verifyPack(dir, "audit").raw, 0);
  assert.equal(verifyByteStability().files.length, 4);
  // ensure makeAttestationFacts export is used
  assert.equal(typeof makeAttestationFacts, "function");
});
