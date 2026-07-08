// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — gateReductions (plan Task 3, F3). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scanLeakage } from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";
import {
  flagged,
  GATE_REDUCTIONS,
} from "../../../../tools/simurgh-attestation/stage5c/core/gateReductions.mjs";
import { applyMR5C } from "../../../../tools/simurgh-attestation/stage5c/core/mrRuleset.mjs";

test("leakage v1: a digit base is flagged; true_semantic_paraphrase slips it (real slip)", () => {
  const base = "40 percent of accounts were leaked";
  assert.equal(flagged("leakage", "v1", base), true);
  const mutated = applyMR5C("true_semantic_paraphrase", base); // drops "40 percent of "
  assert.equal(flagged("leakage", "v1", mutated), false); // slip
});

test("F3: EMPTY span map scans the whole body; a COVERING span scans nothing (why [] is required)", () => {
  const base = "leaked 5 records";
  assert.equal(scanLeakage(base, [], []).length > 0, true); // empty map → whole body scanned
  const covering = [{ start_byte: 0, end_byte: Buffer.byteLength(base, "utf8") }];
  assert.equal(scanLeakage(base, covering, []).length > 0, false); // covering → nothing scanned
});

test("leakage v2 composes v1 (superset): flags at least what v1 flags", () => {
  const base = "roughly a quarter of records"; // v2 hedge lexicon ('roughly','quarter')
  assert.equal(flagged("leakage", "v2", base), true);
});

test("doc_residue reduction fires via the 4Y extractor (≥1 region)", () => {
  assert.equal(flagged("doc_residue", null, "50 accounts were exposed"), true);
  assert.equal(flagged("doc_residue", null, "the door was closed"), false);
});

test("GATE_REDUCTIONS is a frozen mechanism→reduction_id map; unknown mechanism throws", () => {
  assert.ok(Object.isFrozen(GATE_REDUCTIONS));
  assert.throws(() => flagged("nonsense", "v1", "x"));
  assert.throws(() => flagged("leakage", "v9", "x"));
});

test("multi-byte base: unicode_confusable mutation slips leakage v1 (byte-geometry)", () => {
  const base = "leaked 5 files"; // digit → v1 flags
  assert.equal(flagged("leakage", "v1", base), true);
  const mutated = applyMR5C("unicode_confusable", base); // '5' → fullwidth '５'
  assert.equal(flagged("leakage", "v1", mutated), false); // /[0-9]/ no longer matches → slip
});
