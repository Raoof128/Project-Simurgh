// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — Lane B blind two-process recompute ceremony (plan Task 11). Motto:
// AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage5a/laneb/run-laneb-recompute-ceremony.mjs";

test("Lane B: child independently rebuilds the committed ledger byte-for-byte; refuses when blinded", () => {
  const r = runCeremony();
  assert.ok(r.match, "child ledger byte-equals the committed ledger");
  assert.ok(r.envRefusal, "child exits 2 on an OPERATOR_* env var");
  assert.ok(r.leakRefusal, "child exits 2 when the message leaks the committed ledger");
});
