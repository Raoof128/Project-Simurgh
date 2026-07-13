// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — dispatch + frozen spine. projectToFiveL WHITELISTS 5L keys (G-I); two fact sets (G-B); v2
// marker routing; 383 propagates; 395 outer boundary via injected thrower (no bundle field).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectToFiveL,
  dispatchVtcQuorum,
} from "../../../../tools/simurgh-attestation/stage5m/core/dispatch.mjs";

const facts5Mconfirmed = {
  seat_present: true,
  rekor: { kind: "hashedrekord", artifact_hash: "H" },
  anchor_sha256: "H",
  inclusion_ok: true,
  checkpoint_ok: true,
  set_ok: true,
  submitter_ok: true,
  entry_submitter_fpr: "fp",
  expected_submitter_fpr: "fp",
  commitment: "D",
  anchor_decoded: "D",
  tsa_imprint: "D",
  ots_leaf: "D",
  rekor_artifact_hash: "H",
  present_valid_ecology_classes: ["rfc3161", "bitcoin", "rekor"],
  declared_externally_anchored: true,
};

function v2bundle(over = {}) {
  return {
    schema_version: "simurgh.vtcq.bundle.v1",
    envelope_schema: "vtc_quorum_confirmed.v2",
    quorum_profile: "third_trust_ecology",
    quorum_rule: "all_required",
    required_members: [
      "rfc3161_tsa",
      "bitcoin_confirmed_publication",
      "transparency_log_inclusion",
    ],
    anchors: [{ anchor_type: "rfc3161_tsa" }, { anchor_type: "bitcoin_ots" }],
    quorum_policy: { profile: "vtc_quorum" },
    transparency_log_seat: {
      uuid: "u",
      body: "b",
      logID: "l",
      signedEntryTimestamp: "s",
      submitter_pubkey: "p",
      inclusionProof: {
        logIndex: 0,
        treeSize: 2,
        rootHash: "00",
        hashes: [],
        checkpoint: "c\n\n— x y",
      },
    },
    ...over,
  };
}
const ok5L = () => ({ raw: 0 });

test("projectToFiveL whitelists — v2-only + novel fields never reach the core (G-I)", () => {
  const p = projectToFiveL(v2bundle({ some_future_v2_field: 1 }));
  assert.equal(p.envelope_schema, undefined);
  assert.equal(p.transparency_log_seat, undefined);
  assert.equal(p.some_future_v2_field, undefined);
  assert.equal(p.schema_version, "simurgh.vtcq.bundle.v1");
  assert.equal(p.quorum_policy.profile, "vtc_quorum");
});

test("v2 confirmed → raw 0 + ecology_confirmed + N=3", () => {
  const r = dispatchVtcQuorum(v2bundle(), {
    facts5L: {},
    facts5M: facts5Mconfirmed,
    cfg5L: {},
    run5L: ok5L,
  });
  assert.equal(r.raw, 0);
  assert.equal(r.outcome_class, "ecology_confirmed");
  assert.equal(r.ecology_independence_number, 3);
  assert.equal(r.externally_anchored, true);
});

test("frozenCorePreserved — nonzero 5L core short-circuits before 384 (e.g. pending OTS 372)", () => {
  const r = dispatchVtcQuorum(v2bundle(), {
    facts5L: {},
    facts5M: facts5Mconfirmed,
    cfg5L: {},
    run5L: () => ({ raw: 372, reason: "pending" }),
  });
  assert.equal(r.raw, 372);
});

test("the core receives the PROJECTED bundle (no v2 fields)", () => {
  let seen;
  dispatchVtcQuorum(v2bundle(), {
    facts5L: {},
    facts5M: facts5Mconfirmed,
    cfg5L: {},
    run5L: (b) => {
      seen = b;
      return { raw: 0 };
    },
  });
  assert.equal(seen.envelope_schema, undefined);
  assert.equal(seen.transparency_log_seat, undefined);
});

test("envelope_schema absent → v1 route (core called with original bundle)", () => {
  const b = { schema_version: "simurgh.vtcq.bundle.v1" };
  let seen;
  const r = dispatchVtcQuorum(b, {
    facts5L: {},
    facts5M: {},
    cfg5L: {},
    run5L: (x) => {
      seen = x;
      return { raw: 0, reason: "v1" };
    },
  });
  assert.equal(seen, b);
  assert.equal(r.reason, "v1");
});

test("unknown marker 'v3' + core 0 → 384 (P1 #107)", () => {
  const r = dispatchVtcQuorum(v2bundle({ envelope_schema: "v3" }), {
    facts5L: {},
    facts5M: facts5Mconfirmed,
    cfg5L: {},
    run5L: ok5L,
  });
  assert.equal(r.raw, 384);
});

test("395 via injected thrower (no bundle field)", () => {
  const r = dispatchVtcQuorum(v2bundle(), {
    facts5L: {},
    facts5M: facts5Mconfirmed,
    cfg5L: {},
    run5L: () => {
      throw new Error("boom");
    },
  });
  assert.equal(r.raw, 395);
});
