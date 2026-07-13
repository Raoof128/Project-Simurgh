// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — node Rekor adapter over the REAL frozen Task-1A packet (offline). Positive path + negative
// controls that must produce TYPED false facts (never throws).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  verifyInclusion,
  verifyCheckpoint,
  verifySet,
  verifySubmitter,
} from "../../../../tools/simurgh-attestation/stage5m/node/rekorAdapter.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

const EV = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5m/real-laneb"
);
const full = JSON.parse(readFileSync(join(EV, "rekor_entry_full.json"), "utf8"));
const v = Object.values(full)[0];
const rekorPub = readFileSync(join(EV, "rekor_pubkey.pem"), "utf8");
const submitterPub = readFileSync(join(EV, "keys/PUB_submitter.pem"), "utf8");
const anchorBytes = readFileSync(join(EV, "canonical-anchor.txt")); // == hex(D)

function seat() {
  return {
    uuid: Object.keys(full)[0],
    body: v.body,
    logID: v.logID,
    logIndex: v.logIndex,
    integratedTime: v.integratedTime,
    signedEntryTimestamp: v.verification.signedEntryTimestamp,
    submitter_pubkey: submitterPub,
    inclusionProof: {
      logIndex: v.verification.inclusionProof.logIndex,
      treeSize: v.verification.inclusionProof.treeSize,
      rootHash: v.verification.inclusionProof.rootHash,
      hashes: v.verification.inclusionProof.hashes,
      checkpoint: v.verification.inclusionProof.checkpoint,
    },
  };
}

test("REAL packet: inclusion / checkpoint / SET / submitter all verify offline", () => {
  assert.deepEqual(verifyInclusion(seat()), { ok: true, reason: null });
  assert.deepEqual(verifyCheckpoint(seat(), rekorPub), { ok: true, reason: null });
  assert.equal(verifySet(seat(), rekorPub, canonicalJson), true);
  const sub = verifySubmitter(anchorBytes, seat(), submitterPub);
  assert.equal(sub.ok, true);
  assert.equal(sub.fpr, sub.expected_fpr, "entry submitter key == pinned expected key");
});

test("NEG shard_leaf_index=tree_size → typed 387 log_index_out_of_range (no throw)", () => {
  const s = seat();
  s.inclusionProof.logIndex = s.inclusionProof.treeSize;
  assert.deepEqual(verifyInclusion(s), { ok: false, reason: "log_index_out_of_range" });
});

test("NEG flipped inclusion hash → typed inclusion_root_mismatch", () => {
  const s = seat();
  s.inclusionProof.hashes = [...s.inclusionProof.hashes];
  s.inclusionProof.hashes[0] = "00" + s.inclusionProof.hashes[0].slice(2);
  assert.equal(verifyInclusion(s).reason, "inclusion_root_mismatch");
});

test("NEG checkpoint size tampered → typed checkpoint_tree_size_mismatch", () => {
  const s = seat();
  s.inclusionProof.treeSize = s.inclusionProof.treeSize + 1;
  assert.equal(verifyCheckpoint(s, rekorPub).reason, "checkpoint_tree_size_mismatch");
});

test("NEG corrupted SET → false (no throw)", () => {
  const s = seat();
  s.signedEntryTimestamp = "AAAA" + s.signedEntryTimestamp.slice(4);
  assert.equal(verifySet(s, rekorPub, canonicalJson), false);
});
