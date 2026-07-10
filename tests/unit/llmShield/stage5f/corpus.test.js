// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCorpus } from "../../../../tools/simurgh-attestation/stage5f/core/corpus.mjs";
import { validBundle } from "./_validBundle.mjs";

test("valid corpus -> null", () => {
  assert.equal(checkCorpus(validBundle()), null);
});
test("corpus_digest mismatch -> 272", () => {
  const b = validBundle();
  b.corpus.corpus_digest = "sha256:wrong";
  assert.equal(checkCorpus(b), 272);
});
test("cell references uncommitted case -> 272", () => {
  const b = validBundle();
  b.cells[0].case_id = "c99";
  assert.equal(checkCorpus(b), 272);
});
test("duplicate case_id -> 272", () => {
  const b = validBundle();
  b.corpus.cases[1].case_id = "c1";
  assert.equal(checkCorpus(b), 272);
});
