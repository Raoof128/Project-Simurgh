// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — Lane C DETERMINISTIC adversarial corpus (CI-gated, not digest-only). Each forgery class is a
// frozen fact mutation driven through the real dispatcher; the live-model lane (later) only ADDS to this.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchVtcQuorum } from "../../../../tools/simurgh-attestation/stage5m/core/dispatch.mjs";

const ok5L = () => ({ raw: 0 });
function v2bundle() {
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
  };
}
function facts(over = {}) {
  return {
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
    ...over,
  };
}
const run = (bundle, facts5M) =>
  dispatchVtcQuorum(bundle, { facts5L: {}, facts5M, cfg5L: {}, run5L: ok5L });

const CORPUS = [
  [
    "counterfeit ecology (aliasing)",
    () => facts({ present_valid_ecology_classes: ["rfc3161", "rekor", "rekor"] }),
    392,
  ],
  [
    "cross-log / wrong-checkpoint replay",
    () => facts({ checkpoint_ok: false, checkpoint_reason: "checkpoint_log_key_unpinned" }),
    388,
  ],
  ["cross-commitment entry replay", () => facts({ anchor_sha256: "OTHER" }), 386],
  [
    "honest 2-seat floor (seat absent)",
    () =>
      facts({
        seat_present: false,
        present_valid_ecology_classes: ["rfc3161", "bitcoin"],
        declared_externally_anchored: false,
      }),
    393,
  ],
  [
    "promoted 2-seat floor (declared anchored)",
    () =>
      facts({
        seat_present: false,
        present_valid_ecology_classes: ["rfc3161", "bitcoin"],
        declared_externally_anchored: true,
      }),
    394,
  ],
];

for (const [name, mk, code] of CORPUS) {
  test(`Lane C: ${name} → contained ${code}`, () => {
    assert.equal(run(v2bundle(), mk()).raw, code);
  });
}

test("Lane C control: a clean 3-ecology bundle banks (raw 0)", () => {
  assert.equal(run(v2bundle(), facts()).raw, 0);
});
