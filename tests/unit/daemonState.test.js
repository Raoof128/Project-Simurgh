// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";

import {
  createDaemonStateRegistry,
  scoreDaemonRisk,
  summariseDaemonState,
} from "../../src/device/daemonState.js";

test("state registry tracks paired, healthy, stale, and ended states", () => {
  const registry = createDaemonStateRegistry({ staleAfterMs: 10_000 });
  registry.recordPaired("sess_daemon", {
    node_id_hash: "sha256:abc",
    public_key: "pub",
    daemon_version: "0.4.5",
    now: 1000,
  });
  assert.equal(registry.get("sess_daemon").daemon_state, "paired");
  registry.recordProofVerified("sess_daemon", {
    sequence: 1,
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    timestamp: "2026-05-15T08:00:00.000Z",
    now: 2000,
  });
  assert.equal(registry.get("sess_daemon", 3000).daemon_state, "healthy");
  assert.equal(summariseDaemonState(registry.get("sess_daemon"), 13_000).daemon_state, "stale");
  registry.recordEnded("sess_daemon", { now: 14_000 });
  assert.equal(registry.get("sess_daemon").daemon_state, "ended");
});

test("invalid signatures and capture-excluded windows escalate risk", () => {
  assert.deepEqual(scoreDaemonRisk({ daemon_state: "healthy" }), {
    daemon_risk: 0,
    forceCritical: false,
  });
  assert.deepEqual(scoreDaemonRisk({ daemon_state: "untrusted" }), {
    daemon_risk: 50,
    forceCritical: false,
  });
  assert.deepEqual(
    scoreDaemonRisk({ daemon_state: "healthy", capture_excluded_window_count_max: 1 }),
    { daemon_risk: 100, forceCritical: true }
  );
});
