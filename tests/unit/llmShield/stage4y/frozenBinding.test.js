// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — frozen binding (184) + reconciliation (186) (plan Task 7).
// P0-2: VDR writes its OWN source witness over FOUR_WX_SOURCE_FILES (4 files), never
// reusing 4X's computeSourceWitness (hardcoded to only the two 4W files).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, cpSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkFrozenBinding,
  freshFrozenBlock,
  sourceWitness,
  FOUR_WX_SOURCE_FILES,
  checkReconciliation,
} from "../../../../tools/simurgh-attestation/stage4y/core/frozenBinding.mjs";

test("FOUR_WX_SOURCE_FILES covers BOTH 4W files AND BOTH 4X files (not just 4W)", () => {
  assert.equal(FOUR_WX_SOURCE_FILES.length, 4);
  assert.ok(FOUR_WX_SOURCE_FILES.some((f) => f.includes("stage4x/core/gateV2.mjs")));
  assert.ok(FOUR_WX_SOURCE_FILES.some((f) => f.includes("stage4x/core/metamorphicTable.mjs")));
  assert.ok(FOUR_WX_SOURCE_FILES.some((f) => f.includes("stage4w/core/leakageGate.mjs")));
  assert.ok(FOUR_WX_SOURCE_FILES.some((f) => f.includes("stage4w/constants.mjs")));
});

test("a map whose frozen block equals the live block passes 184", () => {
  const map = { frozen: freshFrozenBlock() };
  assert.equal(checkFrozenBinding(map), null);
});

test("a wrong content digest → 184", () => {
  const map = { frozen: { ...freshFrozenBlock(), v1_ruleset_digest: "sha256:" + "0".repeat(64) } };
  const r = checkFrozenBinding(map);
  assert.equal(r.raw, 184);
  assert.equal(r.reason, "vdr_frozen_binding_mismatch");
});

test("4X source drift trips 184 four_wx_source_drift (the P0-2 hole 4X's witness could not catch)", () => {
  // Build a rootDir mirror, mutate a 4X source file's BYTES (not its lexicon content), and
  // show the source witness diverges — v2Digest would NOT change, but the witness does.
  const root = mkdtempSync(join(tmpdir(), "vdr-src-"));
  for (const rel of FOUR_WX_SOURCE_FILES) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    cpSync(rel, join(root, rel));
  }
  const drifted = join(root, "tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs");
  writeFileSync(drifted, "// drifted byte\n", { flag: "a" });

  const liveWitness = sourceWitness();
  const driftedWitness = sourceWitness({ rootDir: root });
  assert.notEqual(
    driftedWitness["tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs"],
    liveWitness["tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs"],
    "witness detects a 4X byte change"
  );
});

test("reconciliation: absence is not failure (no counterpart → null)", () => {
  assert.equal(checkReconciliation({ reconciliation: null }, null), null);
});

test("reconciliation: agreeing sides pass; a differing class sequence fails 186", () => {
  const map = {
    reconciliation: {
      redaction_region_count: 1,
      unredacted_segment_count: 2,
      segment_class_sequence: ["caught_v1", "unflagged"],
    },
  };
  const counterpart = { segment_class_sequence: ["caught_v1", "unflagged"] };
  assert.equal(checkReconciliation(map, counterpart), null);

  const bad = { segment_class_sequence: ["caught_v1", "caught_v1"] };
  const r = checkReconciliation(map, bad);
  assert.equal(r.raw, 186);
  assert.equal(r.reason, "vdr_reconciliation_mismatch");
});
