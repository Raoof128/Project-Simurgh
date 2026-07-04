// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildChain,
  verifyChainIntegrity,
  verifyTemporalCompleteness,
} from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";

// Minimal inline policy: only the fields chainCore reads (delay). Full-policy validation
// is genesisCore's job and is tested there.
const policy = {
  reveal_policy: { aggregate_reveal_delay_windows: 2 },
};
const roots = (tag) => ({
  stage4k_exposure_root: recordDigest({ tag, s: "4k" }),
  stage4l_cluster_budget_root: recordDigest({ tag, s: "4l" }),
  stage4m_disclosure_root: recordDigest({ tag, s: "4m" }),
});
const perWindow = (n) => {
  const m = new Map();
  for (let k = 0; k <= n; k++) {
    m.set(k, { roots: roots(k), rawCounts: { breach_count: k % 7, consumer_count: k * 3 } });
  }
  return m;
};

// Re-forge positions and prev digests after a mutation, so ONLY the intended violation
// remains visible (the realistic cover-up adversary; same helper the fixture builder uses).
const relink = (records) => {
  let prev = recordDigest(policy);
  return records.map((r, i) => {
    const linked = { ...r, position: i, prev_record_digest: prev };
    prev = recordDigest(linked);
    return linked;
  });
};

test("buildChain produces the exact interleaved sequence with linked digests", () => {
  const records = buildChain({ policy, asOfIndex: 3, perWindow: perWindow(3) });
  assert.equal(records.length, 6); // hb0 hb1 hb2 rv0 hb3 rv1
  assert.deepEqual(
    records.map((r) => [r.record_type, r.window_id, r.position]),
    [
      ["heartbeat", "synthetic-0000", 0],
      ["heartbeat", "synthetic-0001", 1],
      ["heartbeat", "synthetic-0002", 2],
      ["aggregate_reveal", "synthetic-0000", 3],
      ["heartbeat", "synthetic-0003", 4],
      ["aggregate_reveal", "synthetic-0001", 5],
    ]
  );
  assert.equal(records[0].prev_record_digest, recordDigest(policy));
  for (let i = 1; i < records.length; i++) {
    assert.equal(records[i].prev_record_digest, recordDigest(records[i - 1]));
  }
  // reveal bands derive from the raw counts: window 0 -> breach 0, consumers 0
  assert.deepEqual(records[3].bands, { breach_count: "0", consumer_count: "0" });
});

test("Q10 passes clean and fails each tamper with the exact reason", () => {
  const clean = buildChain({ policy, asOfIndex: 3, perWindow: perWindow(3) });
  assert.deepEqual(verifyChainIntegrity(clean, policy, 3), { raw: 0 });

  const reordered = [...clean];
  [reordered[1], reordered[2]] = [reordered[2], reordered[1]]; // T3, cover-up variant
  assert.deepEqual(verifyChainIntegrity(relink(reordered), policy, 3), {
    raw: 49,
    reason: "interleave_order_violation",
  });

  const dup = relink([...clean, clean[4]]); // duplicate heartbeat window 3, links re-forged
  assert.deepEqual(verifyChainIntegrity(dup, policy, 3), {
    raw: 49,
    reason: "duplicate_record",
  });

  const forkedPrev = clean.map((r, i) =>
    i === 2 ? { ...r, prev_record_digest: recordDigest({ evil: 1 }) } : r
  );
  assert.deepEqual(verifyChainIntegrity(forkedPrev, policy, 3), {
    raw: 49,
    reason: "prev_digest_mismatch",
  });

  const skipped = clean.map((r, i) => (i === 2 ? { ...r, position: 7 } : r));
  assert.deepEqual(verifyChainIntegrity(skipped, policy, 3), {
    raw: 49,
    reason: "position_discontinuity",
  });

  const badRecord = clean.map((r, i) => (i === 1 ? { ...r, extra: true } : r));
  assert.deepEqual(verifyChainIntegrity(badRecord, policy, 3), {
    raw: 49,
    reason: "schema_invalid",
  });

  // Gate separation (Fix to draft): a drop with RE-FORGED links passes Q10 — silence is
  // Q11's verdict, not a chain error. This is what keeps raw 47 reachable.
  const coverUp = relink(
    clean.filter((r) => !(r.record_type === "heartbeat" && r.window_id === "synthetic-0002"))
  );
  assert.deepEqual(verifyChainIntegrity(coverUp, policy, 3), { raw: 0 });
});

test("Q11 detects a covered-up dropped heartbeat (T1)", () => {
  const clean = buildChain({ policy, asOfIndex: 3, perWindow: perWindow(3) });
  assert.deepEqual(verifyTemporalCompleteness(clean, policy, 3), { raw: 0 });

  const coverUp = relink(
    clean.filter((r) => !(r.record_type === "heartbeat" && r.window_id === "synthetic-0002"))
  );
  assert.deepEqual(verifyTemporalCompleteness(coverUp, policy, 3), {
    raw: 47,
    reason: "heartbeat_absent_for_expected_window",
  });
});
