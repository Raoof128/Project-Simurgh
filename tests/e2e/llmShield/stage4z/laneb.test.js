// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA Lane B — blind two-process recompute ceremony (plan Task 10).
import test from "node:test";
import assert from "node:assert/strict";
import { ceremony } from "../../../../tools/simurgh-attestation/stage4z/laneb/run-laneb-recompute-ceremony.mjs";

test("blind child rebuilds the committed map byte-for-byte; negatives exit 2", () => {
  const r = ceremony();
  assert.ok(r.positive_match, "rebuilt map must equal the committed map");
  assert.ok(r.env_leak_refused, "OPERATOR_* env must be refused (exit 2)");
  assert.ok(r.answer_leak_refused, "supplying the committed map must be refused (exit 2)");
  assert.ok(r.ok);
});
