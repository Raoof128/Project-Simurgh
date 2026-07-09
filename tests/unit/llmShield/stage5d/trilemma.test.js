// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — Normalization Trilemma (plan Task 6). The measured pick-2 table.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cornerOutcomes,
  trilemmaHolds,
  flaggedAsciiAllowlist,
  flaggedCrossScript,
  TRILEMMA_PROBE,
} from "../../../../tools/simurgh-attestation/stage5d/core/trilemma.mjs";

test("corner A (ASCII-allowlist): closes confusables but over-blocks café", () => {
  assert.equal(flaggedAsciiAllowlist(TRILEMMA_PROBE.cross_script), true);
  assert.equal(flaggedAsciiAllowlist(TRILEMMA_PROBE.latin_internal), true);
  assert.equal(flaggedAsciiAllowlist(TRILEMMA_PROBE.legit_diacritics), true); // over-block
});

test("corner B (cross-script): café clear but misses Latin-internal ı", () => {
  assert.equal(flaggedCrossScript(TRILEMMA_PROBE.cross_script), true);
  assert.equal(flaggedCrossScript(TRILEMMA_PROBE.latin_internal), false); // residual miss
  assert.equal(flaggedCrossScript(TRILEMMA_PROBE.legit_diacritics), false);
});

test("cornerOutcomes reproduces the measured table", () => {
  const o = cornerOutcomes();
  assert.deepEqual(o[0], {
    corner: "ascii_allowlist",
    closes_confusables: true,
    diacritic_overblock: true,
    fixed: true,
  });
  assert.deepEqual(o[1], {
    corner: "cross_script",
    closes_confusables: false,
    diacritic_overblock: false,
    fixed: true,
  });
  assert.equal(o[2].corner, "uts39_skeleton");
  assert.equal(o[2].fixed, false);
  assert.equal(o[2].declared_only, true);
});

test("pick-2 holds: no corner is {closes ∧ ¬overblock ∧ fixed}", () => {
  assert.equal(trilemmaHolds(), true);
});

test("a fabricated all-three corner breaks the invariant", () => {
  const cheat = [
    { corner: "x", closes_confusables: true, diacritic_overblock: false, fixed: true },
  ];
  assert.equal(trilemmaHolds(cheat), false);
});
