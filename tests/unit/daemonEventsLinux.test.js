// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";

import { DAEMON_EVENTS, buildDaemonProofRejectedEvent } from "../../src/device/daemonEvents.js";

test("DAEMON_PROOF_REJECTED event type exists", () => {
  assert.equal(DAEMON_EVENTS.DAEMON_PROOF_REJECTED, "DAEMON_PROOF_REJECTED");
});

test("buildDaemonProofRejectedEvent emits display_server_mismatch reason", () => {
  const event = buildDaemonProofRejectedEvent({
    session_id: "sess_linux",
    reason: "display_server_mismatch",
    locked_display_server: "x11",
    observed_display_server: "wayland",
  });
  assert.equal(event.type, "DAEMON_PROOF_REJECTED");
  assert.equal(event.reason, "display_server_mismatch");
  assert.equal(event.locked_display_server, "x11");
  assert.equal(event.observed_display_server, "wayland");
  assert.ok(!("window_title" in event));
  assert.ok(!("pid" in event));
});
