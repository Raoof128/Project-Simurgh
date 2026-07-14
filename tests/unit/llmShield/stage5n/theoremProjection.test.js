// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — the anti-theatre gate: Lean projection must stay bound to the runtime (no code/domain/order drift).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkProjection,
  loadProjection,
} from "../../../../tools/simurgh-attestation/stage5n/theoremProjection.mjs";

test("theorem projection is consistent with the runtime (build-failing on drift)", () => {
  const errors = checkProjection();
  assert.deepEqual(errors, [], `projection drift:\n${errors.join("\n")}`);
});

test("projection references the real Lean file + covers the honest core theorems", () => {
  const p = loadProjection();
  assert.equal(p.lean_file, "proofs/stage5n/VtcDelay.lean");
  const names = p.theorems.map((t) => t.name);
  for (const req of [
    "coreTotality",
    "overclaimUnassertable",
    "startTokenDependencyConformance",
    "elapsedSoundness",
  ]) {
    assert.ok(names.includes(req), `projection missing ${req}`);
  }
  // The physical-time non-claim is preserved in the projection wording.
  const st = p.theorems.find((t) => t.name === "startTokenDependencyConformance");
  assert.match(st.asserts, /NOT physical postdating/);
});
