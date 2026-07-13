// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — Node↔Python parity on the pure core over identical injected facts, + INDEPENDENT Lane-D
// (Python consumes the raw frozen packet itself) → decision-equivalence with the Node adapter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { checkRekorSeat } from "../../../../tools/simurgh-attestation/stage5m/core/rekorSeat.mjs";
import {
  checkCrossSeat,
  checkDistinctEcologies,
} from "../../../../tools/simurgh-attestation/stage5m/core/crossSeat.mjs";
import {
  checkState,
  stateFields,
} from "../../../../tools/simurgh-attestation/stage5m/core/state.mjs";
import {
  verifyInclusion,
  verifyCheckpoint,
  verifySet,
  verifySubmitter,
} from "../../../../tools/simurgh-attestation/stage5m/node/rekorAdapter.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PY = join(HERE, "../../../../tools/simurgh-attestation/stage5m/python/vtcq_quorum_parity.py");
const EV = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-5m/real-laneb");

function jsExtension(f) {
  for (const step of [
    () => checkRekorSeat(f),
    () => checkCrossSeat(f),
    () => checkDistinctEcologies(f),
    () => checkState(f),
  ]) {
    const r = step();
    if (r) return r.raw;
  }
  return 0;
}
function pyExtension(f) {
  return JSON.parse(
    execFileSync("python3", [PY, "--facts", JSON.stringify(f)], { encoding: "utf8" })
  ).raw;
}

function base(over = {}) {
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

const VECTORS = [
  base(),
  base({ present_valid_ecology_classes: ["rfc3161", "rekor", "rekor"] }), // 392
  base({ checkpoint_ok: false, checkpoint_reason: "checkpoint_log_key_unpinned" }), // 388
  base({ anchor_sha256: "OTHER" }), // 386
  base({
    seat_present: false,
    present_valid_ecology_classes: ["rfc3161", "bitcoin"],
    declared_externally_anchored: false,
  }), // 393
  base({
    seat_present: false,
    present_valid_ecology_classes: ["rfc3161", "bitcoin"],
    declared_externally_anchored: true,
  }), // 394
];

test("Node↔Python core parity on shared fact vectors", () => {
  for (const v of VECTORS)
    assert.equal(jsExtension(v), pyExtension(v), `vector ${JSON.stringify(v).slice(0, 40)}`);
});

test("Lane D: Python independently verifies the real packet (all_ok)", () => {
  const d = JSON.parse(execFileSync("python3", [PY, "--laned", EV], { encoding: "utf8" }));
  assert.equal(d.all_ok, true);
  assert.equal(d.shard_leaf_index < d.tree_size, true);
});

test("Lane D decision-equivalence: Node adapter agrees seat-for-seat with Python", () => {
  const full = JSON.parse(readFileSync(join(EV, "rekor_entry_full.json"), "utf8"));
  const v = Object.values(full)[0];
  const rekorPub = readFileSync(join(EV, "rekor_pubkey.pem"), "utf8");
  const submitterPub = readFileSync(join(EV, "keys/PUB_submitter.pem"), "utf8");
  const anchorBytes = readFileSync(join(EV, "canonical-anchor.txt"));
  const seat = {
    body: v.body,
    logID: v.logID,
    logIndex: v.logIndex,
    integratedTime: v.integratedTime,
    signedEntryTimestamp: v.verification.signedEntryTimestamp,
    inclusionProof: v.verification.inclusionProof,
  };
  const nodeAllOk =
    verifyInclusion(seat).ok &&
    verifyCheckpoint(seat, rekorPub).ok &&
    verifySet(seat, rekorPub, canonicalJson) &&
    verifySubmitter(anchorBytes, seat, submitterPub).ok;
  const d = JSON.parse(execFileSync("python3", [PY, "--laned", EV], { encoding: "utf8" }));
  assert.equal(nodeAllOk, d.all_ok, "Node and Python reach the same decision on the real packet");
});
