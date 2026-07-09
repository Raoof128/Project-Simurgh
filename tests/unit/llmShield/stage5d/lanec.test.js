// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — Lane C / BYO adapter (plan Task 14). CI-safe surface only (no live API, no ML).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  byoTargetBinding,
  assertByoContract,
} from "../../../../tools/simurgh-attestation/stage5d/lanec/byoAdapter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LANEC = join(HERE, "..", "..", "..", "..", "tools/simurgh-attestation/stage5d/lanec");

test("byoTargetBinding produces a valid byo_target shape", () => {
  const b = byoTargetBinding("export const flagged = () => true;", "example");
  assert.equal(b.schema, "simurgh.varl.byo_target.v1");
  assert.match(b.adapter_digest, /^sha256:[0-9a-f]{64}$/);
});

test("assertByoContract enforces flagged(text)->bool", () => {
  assert.ok(assertByoContract((t) => t.includes("40")));
  assert.throws(() => assertByoContract(null), /must export flagged/);
  assert.throws(() => assertByoContract(() => "yes"), /must return a boolean/);
});

test("boundary: byoAdapter imports no heavyweight ML", () => {
  const src = readFileSync(join(LANEC, "byoAdapter.mjs"), "utf8");
  assert.doesNotMatch(src, /^\s*(import|const|let|var)\b.*\b(torch|transformers|onnxruntime)\b/m);
});
