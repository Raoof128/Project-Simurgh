// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — K7 all-functions net. Every raw 364-383 uniquely reachable; the four mandatory
// attacks land on their own code; the three computed states + profile matrix; real signed end-to-end;
// every export invoked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "../../../unit/llmShield/stage5l/_valid.mjs";
import { vtcqVerify } from "../../../../tools/simurgh-attestation/stage5l/core/vtcqCore.mjs";
import { releaseCapabilityDigest } from "../../../../tools/simurgh-attestation/stage5l/core/derive.mjs";
import {
  buildSignedVtcqBundle,
  attachProjections,
} from "../../../../tools/simurgh-attestation/stage5l/node/buildSignedBundle.mjs";
import {
  makeVtcqFacts,
  verifyVtcq,
} from "../../../../tools/simurgh-attestation/stage5l/node/adapter.mjs";
import { vtcqLaneKeys } from "../../../../tools/simurgh-attestation/stage5l/node/laneKeys.mjs";

const run = (v, tier = "public") => vtcqVerify(v.bundle, v.cfg, v.facts, { tier }).raw;
const tok = (v) => v.bundle.anchors.find((a) => a.anchor_type === "rfc3161_tsa").tsa_token_digest;
const ots = (v) => v.bundle.anchors.find((a) => a.anchor_type === "bitcoin_ots");

test("K7 tamper matrix — every raw 364..383 is reachable at its own boundary", () => {
  const cases = {
    364: () =>
      vtcqVerify(null, {
        schema_version: "simurgh.vtcq.config.v1",
        profile: "vtc_core",
        policy_digest: "x",
      }).raw,
    365: () => {
      const v = validBundle();
      v.bundle.review_window.window_close_after = 42;
      return run(v);
    },
    366: () => {
      const v = validBundle();
      v.facts.tsaCrypto[tok(v)].canonicalDer = false;
      return run(v);
    },
    367: () => {
      const v = validBundle();
      v.facts.tsaCrypto[tok(v)].cryptoResult = "invalid";
      return run(v);
    },
    368: () => {
      const v = validBundle();
      v.facts.tsaCrypto[tok(v)].certValidAtGenTime = false;
      return run(v);
    },
    369: () => {
      const v = validBundle();
      v.facts.tsaCrypto[tok(v)].accuracy_s = null;
      v.cfg.accuracy_policy_s = null;
      return run(v);
    },
    370: () => {
      const v = validBundle({ profile: "vtc_quorum" });
      v.facts.otsState[ots(v).ots_proof_digest] = "invalid";
      return run(v);
    },
    371: () => {
      const v = validBundle({ profile: "vtc_quorum" });
      ots(v).trust_domain = "tsa-x";
      return run(v);
    },
    372: () => {
      const v = validBundle({ profile: "vtc_quorum", finality: "pending" });
      return run(v);
    },
    373: () => {
      const v = validBundle();
      const b = "sha256:x";
      v.bundle.review_access_authorisation_receipt.start_capability_root_digest = b;
      v.bundle.review_access_authorisation_receipt.binds.start_capability_root_digest = b;
      return run(v);
    },
    374: () =>
      run(
        validBundle({
          reviewWindow: {
            window_open_not_before: 1,
            window_close_after: 2,
            required_anchor_profile: "vtc_core",
          },
        })
      ),
    375: () => {
      const v = validBundle();
      v.bundle.review_access_authorisation_receipt.gate_public_key_fingerprint = "fp:attacker";
      return run(v);
    },
    376: () => {
      const v = validBundle();
      v.bundle.declared_releases[0].consumption_record.release_capability_digest =
        "sha256:ceremony-B";
      return run(v);
    },
    377: () => {
      const v = validBundle();
      v.bundle.declared_releases = [];
      return run(v);
    },
    378: () => {
      const v = validBundle();
      const root = v.bundle.review_access_authorisation_receipt.start_capability_root_digest;
      const rpd = "sha256:p-smuggled";
      const rcd = releaseCapabilityDigest({
        start_capability_root_digest: root,
        endpoint_id: "smuggled",
        release_ordinal: 0,
        audience_digest: "sha256:a",
        release_payload_digest: rpd,
      });
      v.bundle.declared_releases.push({
        endpoint_id: "smuggled",
        release_ordinal: 0,
        audience_digest: "sha256:a",
        consumption_record: { release_capability_digest: rcd, release_payload_digest: rpd },
      });
      v.facts.releaseSigValid["smuggled:0"] = true;
      return run(v);
    },
    379: () => run(validBundle({ trustDomainRegistry: ["tsa-x", "ghost"] })),
    380: () => {
      const v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
      ots(v).checkpoint_evidence.observed_tip_height = ots(v).checkpoint_evidence.block_height + 1;
      return run(v);
    },
    381: () => {
      const v = validBundle();
      v.bundle.projections = { projection_root: "sha256:bad" };
      return run(v, "audit");
    },
    382: () => {
      const v = validBundle();
      v.bundle.reserved_slots = { minimum_elapsed_review_binding: { x: 1 } };
      return run(v);
    },
    383: () => {
      const v = validBundle();
      v.bundle.campaign_id = 10n;
      return run(v);
    }, // BigInt → canonicalJson throws → wrapper
  };
  for (const [code, fn] of Object.entries(cases)) assert.equal(fn(), Number(code), `raw ${code}`);
});

test("K7 four mandatory attacks land on their own code", () => {
  // gate-key substitution → 375
  let v = validBundle();
  v.bundle.review_access_authorisation_receipt.gate_public_key_fingerprint = "fp:evil";
  assert.equal(run(v), 375);
  // child-capability replay across a different ceremony → 376
  v = validBundle();
  v.bundle.declared_releases[0].consumption_record.release_capability_digest =
    "sha256:other-ceremony";
  assert.equal(run(v), 376);
  // swapped TSA adapter-attestation token_raw_digest → 367
  v = validBundle();
  v.facts.tsaCrypto[tok(v)].attestation.token_raw_digest = "sha256:someone-else";
  assert.equal(run(v), 367);
  // confirmed under wrong chain/checkpoint → 370 (before 380)
  v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  ots(v).checkpoint_evidence.witness_key_fingerprint = "fp:rogue";
  assert.equal(run(v), 370);
});

test("K7 profile matrix + three states over the REAL signed builder", () => {
  const keys = vtcqLaneKeys();
  const mk = (profile, finality) => {
    const { bundle, cfg } = buildSignedVtcqBundle(keys, { profile, finality });
    attachProjections(bundle, cfg, makeVtcqFacts(bundle, cfg, keys));
    return { bundle, cfg };
  };
  const core = mk("vtc_core", "confirmed");
  assert.equal(verifyVtcq(core.bundle, core.cfg, keys, { tier: "public" }).raw, 0);
  const qc = mk("vtc_quorum", "confirmed");
  assert.equal(verifyVtcq(qc.bundle, qc.cfg, keys, { tier: "public" }).raw, 0);
  assert.equal(verifyVtcq(qc.bundle, qc.cfg, keys, { tier: "audit" }).raw, 0);
  const qp = mk("vtc_quorum", "pending");
  assert.equal(verifyVtcq(qp.bundle, qp.cfg, keys, { tier: "public" }).raw, 372);
  // OTS-only rejected
  const otsOnly = mk("vtc_quorum", "confirmed");
  otsOnly.bundle.anchors = otsOnly.bundle.anchors.filter((a) => a.anchor_type !== "rfc3161_tsa");
  assert.equal(verifyVtcq(otsOnly.bundle, otsOnly.cfg, keys, { tier: "public" }).raw, 372);
});
