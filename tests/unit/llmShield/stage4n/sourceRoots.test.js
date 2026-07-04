// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";
import {
  computeSourceRoots,
  verifySourceRoots,
} from "../../../../tools/simurgh-attestation/stage4n/node/sourceRoots.mjs";

const policy = { reveal_policy: { aggregate_reveal_delay_windows: 2 } };

test("computeSourceRoots derives stable roots from the committed 4K/4L/4M fixtures", async () => {
  const a = await computeSourceRoots(process.cwd());
  const b = await computeSourceRoots(process.cwd());
  assert.deepEqual(a, b); // deterministic
  for (const key of [
    "stage4k_exposure_root",
    "stage4l_cluster_budget_root",
    "stage4m_disclosure_root",
  ]) {
    assert.match(a[key], /^sha256:[a-f0-9]{64}$/, key);
  }
  assert.ok(Array.isArray(a.disclosure_leaves) && a.disclosure_leaves.length >= 1);
});

test("Q15 passes a chain built on the real roots and fails a mutated root (T4)", async () => {
  const { disclosure_leaves, ...roots } = await computeSourceRoots(process.cwd());
  void disclosure_leaves;
  const perWindow = new Map();
  for (let k = 0; k <= 2; k++) {
    perWindow.set(k, { roots, rawCounts: { breach_count: 0, consumer_count: 0 } });
  }
  const records = buildChain({ policy, asOfIndex: 2, perWindow });
  const heartbeats = records.filter((r) => r.record_type === "heartbeat");
  assert.deepEqual(verifySourceRoots(heartbeats, roots), { raw: 0 });

  const tampered = heartbeats.map((h, i) =>
    i === 1
      ? {
          ...h,
          commitments: { ...h.commitments, stage4k_exposure_root: recordDigest({ evil: 1 }) },
        }
      : h
  );
  assert.deepEqual(verifySourceRoots(tampered, roots), { raw: 50, reason: "source_root_mismatch" });

  const badPer = heartbeats.map((h, i) =>
    i === 0
      ? { ...h, commitments: { ...h.commitments, private_evidence_root: recordDigest({ x: 2 }) } }
      : h
  );
  assert.deepEqual(verifySourceRoots(badPer, roots), {
    raw: 50,
    reason: "private_evidence_root_mismatch",
  });
});
