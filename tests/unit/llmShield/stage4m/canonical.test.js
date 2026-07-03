// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  sha256Canonical,
  canonicalJson as nodeCanonical,
} from "../../../../tools/simurgh-attestation/stage4d/stage4dCrypto.mjs";
import {
  canonicalJson,
  merkleRootSorted,
  recordDigest,
  sha256Hex,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import * as C from "../../../../tools/simurgh-attestation/stage4m/constants.mjs";

const sample = { b: [3, 1], a: { z: "x", y: null }, w: "2026-07" };

test("core canonicalJson matches stage4d byte-for-byte", () => {
  assert.equal(canonicalJson(sample), nodeCanonical(sample));
});

test("pure-JS sha256 matches node:crypto over canonical payloads", () => {
  assert.equal(sha256Hex(canonicalJson(sample)), sha256Canonical(sample));
  assert.equal(recordDigest(sample), `sha256:${sha256Canonical(sample)}`);
  // empty string + multi-block input (>64 bytes) exercise padding paths
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256Hex(nodeCanonical("a".repeat(200))), sha256Canonical("a".repeat(200)));
});

test("merkleRootSorted is order-independent, content-sensitive, and pair-hashed", () => {
  const d1 = recordDigest({ r: 1 });
  const d2 = recordDigest({ r: 2 });
  const d3 = recordDigest({ r: 3 });
  assert.equal(merkleRootSorted([d1, d2, d3]), merkleRootSorted([d3, d1, d2]));
  assert.notEqual(merkleRootSorted([d1, d2]), merkleRootSorted([d1, d3]));
  // single leaf promotes; empty list is the frozen empty-root
  assert.equal(merkleRootSorted([d1]), d1);
  assert.equal(merkleRootSorted([]), `sha256:${sha256Hex("vxd-empty")}`);
  // root differs from any leaf (no trivial passthrough for 2+ leaves)
  assert.notEqual(merkleRootSorted([d1, d2]), d1);
});

test("constants are frozen and spec-exact", () => {
  assert.equal(C.VXD_MERGE_EVENT_SCHEMA, "simurgh.ccb.cluster_merge_event.v1");
  assert.equal(C.VXD_RESCORE_SCHEMA, "simurgh.vxd.retro_rescore.v1");
  assert.equal(C.VXD_DISCLOSURE_SCHEMA, "simurgh.vxd.disclosure_claim.v1");
  assert.equal(C.VXD_CONTEST_SCHEMA, "simurgh.vxd.respondent_contest.v1");
  assert.equal(C.VXD_ACK_SCHEMA, "simurgh.vxd.contest_acknowledgement.v1");
  assert.equal(C.VXD_WINDOW_SCHEMA, "simurgh.vxd.window_commitment.v1");
  assert.equal(C.VXD_CHAIN_SCHEMA, "simurgh.vxd.chain.v1");
  assert.equal(C.VXD_ATTESTATION_SCHEMA, "simurgh.vxd.attestation.v1");
  assert.equal(C.VXD_MANIFEST_SCHEMA, "simurgh.vxd.manifest.v1");
  assert.equal(C.VXD_TIER_P_SCHEMA, "simurgh.vxd.tier_p.v1");
  assert.equal(C.VXD_PROJECTION_SCHEMA, "simurgh.vxd.article73_projection.v1");
  assert.equal(C.VXD_VERDICT_SCHEMA, "simurgh.vxd.verdict.v1");
  assert.equal(C.VXD_MANIFEST_DOMAIN, "SIMURGH_STAGE4M_VXD_MANIFEST_V1\0");
  assert.equal(C.VXD_CONTEST_DOMAIN, "SIMURGH_STAGE4M_VXD_CONTEST_V1\0");
  assert.deepEqual(C.CONTEST_TYPES, [
    "arithmetic_error_alleged",
    "assignment_disputed",
    "merge_evidence_disputed",
    "window_boundary_disputed",
  ]);
  assert.deepEqual(C.CLAIM_KINDS, [
    "breach_count",
    "cluster_count",
    "consumer_count",
    "exposure_total",
    "window_range",
  ]);
  assert.ok(C.VXD_NON_CLAIMS.includes("not_legal_compliance_certification"));
  assert.ok(C.VXD_NON_CLAIMS.includes("contest_is_recorded_not_adjudicated"));
  assert.ok(C.VXD_KNOWN_LIMITATIONS.includes("no_merge_no_reveal"));
  assert.ok(C.VXD_KNOWN_LIMITATIONS.includes("tier_r_slice_machinery_deferred"));
  assert.ok(Object.isFrozen(C.VXD_NON_CLAIMS) && Object.isFrozen(C.CLAIM_KINDS));
});
