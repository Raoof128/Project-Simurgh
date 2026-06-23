import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLlamaGuard4 } from "../../../../tools/external-defense-adapters/llamaGuard4OutputGrammar.mjs";

test("safe", () => {
  assert.deepEqual(parseLlamaGuard4("safe"), { label: "safe", categories: [], error_code: "none" });
});
test("safe with surrounding whitespace/case", () => {
  assert.deepEqual(parseLlamaGuard4("  Safe \n"), {
    label: "safe",
    categories: [],
    error_code: "none",
  });
});
test("unsafe with no categories", () => {
  assert.deepEqual(parseLlamaGuard4("unsafe"), {
    label: "unsafe",
    categories: [],
    error_code: "none",
  });
});
test("unsafe with category codes", () => {
  assert.deepEqual(parseLlamaGuard4("unsafe\nS1,S14"), {
    label: "unsafe",
    categories: ["S1", "S14"],
    error_code: "none",
  });
});
test("empty string is malformed", () => {
  assert.deepEqual(parseLlamaGuard4(""), {
    label: "unknown",
    categories: [],
    error_code: "malformed_output",
  });
});
test("whitespace-only is malformed", () => {
  assert.deepEqual(parseLlamaGuard4("   \n  "), {
    label: "unknown",
    categories: [],
    error_code: "malformed_output",
  });
});
test("non-string is malformed", () => {
  assert.deepEqual(parseLlamaGuard4(null), {
    label: "unknown",
    categories: [],
    error_code: "malformed_output",
  });
});
test("garbage first line is malformed", () => {
  assert.deepEqual(parseLlamaGuard4("definitely-not-a-verdict"), {
    label: "unknown",
    categories: [],
    error_code: "malformed_output",
  });
});
test("unsafe with malformed category line is malformed", () => {
  assert.deepEqual(parseLlamaGuard4("unsafe\nnot-a-code"), {
    label: "unknown",
    categories: [],
    error_code: "malformed_output",
  });
});
