// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — verdictCore (203, 205) + token-id hygiene + conflictAntitone shadow. Task 4.
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTokenId,
  flagRelation,
  declaredLexicon,
  hitsFor,
  verdictFor,
  classify,
  checkClassification,
  checkVerdicts,
} from "../../../../tools/simurgh-attestation/stage5a/core/verdictCore.mjs";

// Synthetic flat 4Z-shaped map: lexicon {1001,1002,2001}; cell A flags 1001, cell B clean.
const score = (tid) => ({ token_id: tid, score_nano: "0" });
const cell = (t, flags) => ({
  prompt_id: "p1",
  t,
  layer: 2,
  scores: [score(1001), score(1002), score(2001)],
  flags,
});
const map = (flagsA = [1001]) => ({ cells: [cell(0, flagsA), cell(1, [])] });

const claim = (over) => ({
  claim_id: "c1",
  span_ref: { span_id: "s1", start_byte: 0, end_byte: 1 },
  token_ids: ["1001", "1002"],
  polarity: "asserts_unflagged",
  ...over,
});
const tableOf = (claims) => ({ content: { claims } });
const ledgerOf = (verdicts) => ({ content: { verdicts } });

test("parseTokenId canonicalizes valid ids and rejects malformed (N2)", () => {
  assert.equal(parseTokenId("1001"), "1001");
  assert.equal(parseTokenId(1001), "1001");
  assert.equal(parseTokenId("0"), "0");
  assert.equal(parseTokenId("01"), null);
  assert.equal(parseTokenId("1.0"), null);
  assert.equal(parseTokenId("-1"), null);
  assert.equal(parseTokenId(" 1"), null);
  assert.equal(parseTokenId(String(2 ** 53)), null);
});

test('membership is integer, never lexical: "9" never matches "10"', () => {
  const m = {
    cells: [{ prompt_id: "p1", t: 0, layer: 2, scores: [score(9), score(10)], flags: [10] }],
  };
  const c = claim({ token_ids: ["9"], polarity: "asserts_flagged" });
  // token 9 is in-lexicon but NOT flagged (only 10 is) → asserts_flagged with no hits.
  assert.equal(verdictFor(c, m).verdict, "contradicted");
});

test("flagRelation and declaredLexicon read the flat map", () => {
  assert.deepEqual(flagRelation(map()), [{ prompt_id: "p1", t: 0, layer: 2, token_id: "1001" }]);
  assert.deepEqual([...declaredLexicon(map())].sort(), ["1001", "1002", "2001"]);
});

test("verdictFor: asserts_unflagged with a hit → contradicted (evidence carried)", () => {
  const v = verdictFor(claim(), map());
  assert.equal(v.verdict, "contradicted");
  assert.deepEqual(v.evidence, [{ prompt_id: "p1", t: 0, layer: 2, token_id: "1001" }]);
});

test("verdictFor: asserts_unflagged, no hit → corroborated", () => {
  assert.equal(verdictFor(claim({ token_ids: ["2001"] }), map()).verdict, "corroborated");
});

test("verdictFor: asserts_flagged mirrors the polarity", () => {
  assert.equal(
    verdictFor(claim({ token_ids: ["1001"], polarity: "asserts_flagged" }), map()).verdict,
    "corroborated"
  );
  assert.equal(
    verdictFor(claim({ token_ids: ["2001"], polarity: "asserts_flagged" }), map()).verdict,
    "contradicted"
  );
});

test("verdictFor: out-of-lexicon token → unreadable; precedence over a mixed set", () => {
  assert.equal(verdictFor(claim({ token_ids: ["9999"] }), map()).verdict, "unreadable");
  assert.equal(verdictFor(claim({ token_ids: ["1001", "9999"] }), map()).verdict, "unreadable");
  // a malformed token id also drives unreadable (it can't correspond to any watched token)
  assert.equal(verdictFor(claim({ token_ids: ["01"] }), map()).verdict, "unreadable");
});

test("classify is TOTAL and sorted by claim_id", () => {
  const t = tableOf([claim({ claim_id: "c2" }), claim({ claim_id: "c1" })]);
  const rows = classify(t, map());
  assert.deepEqual(
    rows.map((r) => r.claim_id),
    ["c1", "c2"]
  );
});

test("hitsFor computes over all cells", () => {
  const m = { cells: [cell(0, [1001]), cell(1, [1001])] };
  assert.equal(hitsFor(claim({ token_ids: ["1001"] }), flagRelation(m)).length, 2);
});

test("checkClassification (203): clean → null; drift caught", () => {
  const t = tableOf([claim()]);
  const clean = ledgerOf(classify(t, map()));
  assert.equal(checkClassification(clean, t), null);
  assert.equal(checkClassification(ledgerOf([]), t).reason, "claim_without_verdict");
  assert.equal(
    checkClassification(ledgerOf([{ claim_id: "c1", verdict: "banana", evidence: [] }]), t).reason,
    "unknown_verdict_label"
  );
  assert.equal(
    checkClassification(ledgerOf([{ claim_id: "cX", verdict: "corroborated", evidence: [] }]), t)
      .reason,
    "verdict_for_undeclared_claim"
  );
});

test("checkVerdicts (205): recompute mismatch caught (flip verdict, drop evidence)", () => {
  const t = tableOf([claim()]);
  const clean = ledgerOf(classify(t, map()));
  assert.equal(checkVerdicts(clean, t, map()), null);
  // flip the verdict
  const flipped = ledgerOf([{ ...clean.content.verdicts[0], verdict: "corroborated" }]);
  assert.equal(checkVerdicts(flipped, t, map()).raw, 205);
  // drop an evidence entry
  const stripped = ledgerOf([{ ...clean.content.verdicts[0], evidence: [] }]);
  assert.equal(checkVerdicts(stripped, t, map()).raw, 205);
});

test("conflictAntitone shadow: adding flags never turns contradicted→corroborated (asserts_unflagged)", () => {
  const c = claim({ token_ids: ["1001"] });
  // start contradicted (flag present); add MORE flags — stays contradicted
  assert.equal(verdictFor(c, map([1001])).verdict, "contradicted");
  assert.equal(verdictFor(c, map([1001, 1002])).verdict, "contradicted");
  // the dual for asserts_flagged is INTENTIONALLY violable (documents the restriction)
  const cf = claim({ token_ids: ["1001"], polarity: "asserts_flagged" });
  assert.equal(verdictFor(cf, map([])).verdict, "contradicted");
  assert.equal(verdictFor(cf, map([1001])).verdict, "corroborated"); // contradicted→corroborated: allowed
});
