// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  expectedSequence,
  windowIdOf,
  windowIndex,
} from "../../../../tools/simurgh-attestation/stage4n/core/windowModel.mjs";

test("window ids round-trip and malformed ids throw", () => {
  assert.equal(windowIndex("synthetic-0003"), 3);
  assert.equal(windowIdOf(3), "synthetic-0003");
  assert.equal(windowIdOf(0), "synthetic-0000");
  for (const bad of ["synthetic-3", "synthetic-00030", "wall-0003", "synthetic-00a3", ""]) {
    assert.throws(() => windowIndex(bad), /window_id_malformed/);
  }
  assert.throws(() => windowIdOf(-1), /window_index_invalid/);
  assert.throws(() => windowIdOf(10000), /window_index_invalid/);
});

test("expectedSequence interleaves heartbeat(k) then reveal(k-d) — spec §5.0", () => {
  // d=2, as_of=3: hb0 hb1 hb2 rv0 hb3 rv1
  assert.deepEqual(expectedSequence(2, 3), [
    { record_type: "heartbeat", window_id: "synthetic-0000" },
    { record_type: "heartbeat", window_id: "synthetic-0001" },
    { record_type: "heartbeat", window_id: "synthetic-0002" },
    { record_type: "aggregate_reveal", window_id: "synthetic-0000" },
    { record_type: "heartbeat", window_id: "synthetic-0003" },
    { record_type: "aggregate_reveal", window_id: "synthetic-0001" },
  ]);
  // as_of=0: single heartbeat, nothing due
  assert.deepEqual(expectedSequence(2, 0), [
    { record_type: "heartbeat", window_id: "synthetic-0000" },
  ]);
});

test("expectedSequence is a pure function of (delay, asOf) — no clock", () => {
  const a = expectedSequence(2, 6);
  const b = expectedSequence(2, 6);
  assert.deepEqual(a, b);
  assert.equal(a.length, 7 + 5); // 7 heartbeats (0..6) + 5 reveals (0..4)
});
