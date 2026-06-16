// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";

import { createDisplayServerLock } from "../../src/device/daemonState.js";

test("first proof locks display_server for the session", () => {
  const lock = createDisplayServerLock();
  const r1 = lock.observe("sess_a", "x11");
  assert.equal(r1.ok, true);
  assert.equal(r1.locked_display_server, "x11");
});

test("second proof with same display_server is accepted", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_a", "x11");
  const r2 = lock.observe("sess_a", "x11");
  assert.equal(r2.ok, true);
});

test("second proof with different display_server is rejected", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_a", "x11");
  const r2 = lock.observe("sess_a", "wayland");
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, "display_server_mismatch");
  assert.equal(r2.locked_display_server, "x11");
});

test("different sessions track display_server independently", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_a", "x11");
  const r = lock.observe("sess_b", "wayland");
  assert.equal(r.ok, true);
  assert.equal(r.locked_display_server, "wayland");
});

test("evict removes session lock", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_a", "x11");
  lock.evict("sess_a");
  const r = lock.observe("sess_a", "wayland");
  assert.equal(r.ok, true);
  assert.equal(r.locked_display_server, "wayland");
});
