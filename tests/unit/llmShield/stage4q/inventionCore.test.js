// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateSourceMap,
  validateConstitutionProjection,
  validateReviewerNote,
  sourceMapDigest,
  constitutionProjectionDigest,
  reviewerNoteDigest,
} from "../../../../tools/simurgh-attestation/stage4q/core/inventionCore.mjs";

const FIX = "tests/fixtures/llmShield/stage4q/invention";
const load = (f) => JSON.parse(readFileSync(`${FIX}/${f}`, "utf8"));

test("committed source map has the seven frozen rows and the falsification rule", () => {
  const m = load("novelty-source-map.json");
  assert.deepEqual(validateSourceMap(m), { ok: true });
  assert.equal(m.rows.length, 7);
  const gh = m.rows.find((r) => r.prior_art.toLowerCase().includes("github"));
  assert.equal(
    gh.what_it_does_not,
    "evidence is not offline-recomputable, not chain-ordered, not key-separated"
  );
  assert.match(sourceMapDigest(m), /^sha256:[0-9a-f]{64}$/);
});

test("constitution projection covers all five boundary kinds exactly once", () => {
  const p = load("constitution-projection.json");
  assert.deepEqual(validateConstitutionProjection(p), { ok: true });
  assert.match(constitutionProjectionDigest(p), /^sha256:[0-9a-f]{64}$/);
});

test("reviewer note carries the frozen not-a-compliance-claim sentence (spec §1.4)", () => {
  const n = load("reviewer-note.json");
  assert.deepEqual(validateReviewerNote(n), { ok: true });
  assert.equal(
    n.status_sentence,
    "The reviewer note is signed for reproducibility but is not itself a compliance claim or raw-code enforcement rule."
  );
  assert.match(reviewerNoteDigest(n), /^sha256:[0-9a-f]{64}$/);
});

test("projection with a missing boundary kind is refused", () => {
  const p = load("constitution-projection.json");
  const broken = { ...p, rows: p.rows.slice(0, 4) };
  assert.equal(validateConstitutionProjection(broken).ok, false);
});
