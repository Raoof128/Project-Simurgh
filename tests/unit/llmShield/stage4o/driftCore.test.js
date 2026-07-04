// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyDrift,
  validateChain,
} from "../../../../tools/simurgh-attestation/stage4o/core/driftCore.mjs";
import { mkEntry, mkManifest, mkEnvelope } from "./helpers.mjs";

const M = (entries) => mkManifest(entries);

test("classifier: equal / narrowing / broadening / incomparable", () => {
  const base = M([mkEntry(1), mkEntry(2)]);
  assert.equal(classifyDrift(base, M([mkEntry(1), mkEntry(2)])), "equal");
  assert.equal(classifyDrift(base, M([mkEntry(1)])), "narrowing");
  assert.equal(classifyDrift(base, M([mkEntry(1), mkEntry(2), mkEntry(3)])), "broadening");
  assert.equal(
    classifyDrift(base, M([mkEntry(1), mkEntry(2, { authority_class: "write" })])),
    "broadening"
  );
  assert.equal(
    classifyDrift(
      M([mkEntry(1, { authority_class: "write" }), mkEntry(2)]),
      M([mkEntry(1), mkEntry(2)])
    ),
    "narrowing"
  );
  // schema change => incomparable (directionally undecidable from digests)
  assert.equal(
    classifyDrift(
      base,
      M([mkEntry(1, { tool_schema_digest: mkEntry(9).tool_schema_digest }), mkEntry(2)])
    ),
    "incomparable"
  );
  // mixed add+remove => incomparable
  assert.equal(classifyDrift(base, M([mkEntry(1), mkEntry(3)])), "incomparable");
});

test("chain: laundering (state-bound broadening) => 65; broken linkage => 64", () => {
  const m0 = M([mkEntry(1)]);
  const m1 = M([mkEntry(1), mkEntry(2)]);
  const e0 = mkEnvelope(m0, 0, null, "state");
  assert.equal(validateChain([e0]).ok, true);
  const blind = mkEnvelope(m1, 1, e0, "state");
  assert.deepEqual(validateChain([e0, blind]), {
    ok: false,
    raw: 65,
    reason: "state_bound_broadening",
  });
  const informed = mkEnvelope(m1, 1, e0, "delta");
  assert.equal(validateChain([e0, informed]).ok, true);
  const badLink = { ...informed, previous_manifest_digest: "sha256:" + "b".repeat(64) };
  assert.deepEqual(validateChain([e0, badLink]), {
    ok: false,
    raw: 64,
    reason: "prev_digest_mismatch",
  });
  const badDelta = { ...informed, delta_digest: "sha256:" + "c".repeat(64) };
  assert.deepEqual(validateChain([e0, badDelta]), {
    ok: false,
    raw: 64,
    reason: "delta_digest_mismatch",
  });
  assert.deepEqual(validateChain([informed]), {
    ok: false,
    raw: 64,
    reason: "ancestry_incomplete",
  });
});

test("chain: state-bound narrowing accepted (anti-theatre GREEN)", () => {
  const m0 = M([mkEntry(1), mkEntry(2)]);
  const m1 = M([mkEntry(1)]);
  const e0 = mkEnvelope(m0, 0, null, "state");
  const narrow = mkEnvelope(m1, 1, e0, "state");
  const out = validateChain([e0, narrow]);
  assert.equal(out.ok, true);
  assert.deepEqual(out.classifications, ["equal", "narrowing"]);
});
