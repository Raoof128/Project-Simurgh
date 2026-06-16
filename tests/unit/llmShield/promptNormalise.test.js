import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalisePrompt, hashPrompt } from "../../../src/llmShield/promptNormalise.js";

describe("promptNormalise", () => {
  test("strips zero-width characters", () => {
    assert.equal(normalisePrompt("ig​nore"), "ignore");
  });

  test("NFKC-folds compatibility characters", () => {
    // Fullwidth 'ignore' (U+FF49...) folds to ASCII 'ignore'
    assert.equal(normalisePrompt("ｉｇｎｏｒｅ"), "ignore");
  });

  test("strips control characters but keeps newline and tab", () => {
    assert.equal(normalisePrompt("ab\tc\nd"), "ab\tc\nd");
  });

  test("trims surrounding whitespace", () => {
    assert.equal(normalisePrompt("  hello  "), "hello");
  });

  test("non-string input becomes empty string", () => {
    assert.equal(normalisePrompt(undefined), "");
    assert.equal(normalisePrompt(null), "");
    assert.equal(normalisePrompt(42), "");
  });

  test("hashPrompt returns a sha256-prefixed digest", () => {
    const h = hashPrompt("hello");
    assert.match(h, /^sha256:[0-9a-f]{64}$/);
  });

  test("hashPrompt is stable and distinct per input", () => {
    assert.equal(hashPrompt("a"), hashPrompt("a"));
    assert.notEqual(hashPrompt("a"), hashPrompt("b"));
  });
});
