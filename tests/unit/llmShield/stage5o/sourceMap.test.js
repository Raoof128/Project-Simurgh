// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §13 — the pinned prior-art and novelty source map, and its gate.
//
// An anti-fabrication project must not carry a fuzzy citation. The gate makes that discipline
// mechanical: a novelty claim with no pinned source is a REJECTED claim, an entry missing a required
// field is rejected, and an unknown classification fails CLOSED rather than being waved through.
//
// The required self-test is the last case: inject an unsourced novelty claim and confirm rejection.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_CLASSIFICATIONS,
  REQUIRED_ENTRY_FIELDS,
  validateEntry,
  sourceMapGate,
  loadSourceMap,
} from "../../../../tools/simurgh-attestation/stage5o/core/sourceMap.mjs";

const goodEntry = {
  id: "rfc6962",
  title: "Certificate Transparency",
  version_or_date: "June 2013",
  url: "https://www.rfc-editor.org/rfc/rfc6962.txt",
  retrieval_date: "2026-07-22",
  exact_quote: "For n > 1, let k be the largest power of two smaller than n (i.e., k < n <= 2k).",
  quote_unavailable_reason: null,
  classification: "prior_art_construction",
};

test("§13 the classification enum is closed", () => {
  assert.deepEqual([...SOURCE_CLASSIFICATIONS].sort(), [
    "classical_mathematics",
    "novelty_claim",
    "prior_art_construction",
    "prior_art_field",
  ]);
});

test("§13 an entry missing any required field is rejected", () => {
  assert.equal(validateEntry(goodEntry).ok, true);
  for (const f of REQUIRED_ENTRY_FIELDS) {
    const missing = { ...goodEntry };
    delete missing[f];
    assert.equal(validateEntry(missing).ok, false, `${f} must be required`);
  }
});

test("§13 an unknown classification fails CLOSED", () => {
  const bad = { ...goodEntry, classification: "vibes" };
  assert.equal(validateEntry(bad).ok, false);
  assert.equal(validateEntry(bad).detail, "classification");
});

test("§13 a quote may be absent ONLY with a stated reason — never silently", () => {
  const noQuote = { ...goodEntry, exact_quote: null, quote_unavailable_reason: null };
  assert.equal(validateEntry(noQuote).ok, false, "a silent missing quote is a fuzzy citation");
  const declared = {
    ...goodEntry,
    exact_quote: null,
    quote_unavailable_reason: "PDF is compressed; text extraction failed on retrieval",
  };
  assert.equal(validateEntry(declared).ok, true, "an DECLARED absence is honest and permitted");
});

test("§13 the retrieval date must be a real ISO date, not a vague word", () => {
  for (const bad of ["recently", "2026", "22/07/2026", ""]) {
    assert.equal(validateEntry({ ...goodEntry, retrieval_date: bad }).ok, false, bad);
  }
});

test("§13 REQUIRED SELF-TEST: a novelty claim with no pinned source is REJECTED", () => {
  const map = {
    sweep_scope: ["standards"],
    sweep_is_exhaustive: false,
    entries: [goodEntry],
    claims: [
      {
        id: "unsourced",
        claim: "Stage 5O invented the Merkle tree.",
        falsifiable_by: "point at any earlier Merkle construction",
        distinguishes_from: [],
        sources: [],
      },
    ],
  };
  const r = sourceMapGate(map);
  assert.equal(r.ok, false);
  assert.ok(
    r.violations.some((v) => v.detail === "claim_without_source"),
    JSON.stringify(r.violations)
  );
});

test("§13 a claim citing an id that is not in the map is rejected", () => {
  const map = {
    sweep_scope: ["standards"],
    sweep_is_exhaustive: false,
    entries: [goodEntry],
    claims: [
      {
        id: "dangling",
        claim: "x",
        falsifiable_by: "y",
        distinguishes_from: [],
        sources: ["rfc9999"],
      },
    ],
  };
  assert.equal(sourceMapGate(map).ok, false);
});

test("§13 a map claiming an EXHAUSTIVE sweep is rejected — no sweep proves absence", () => {
  const map = { sweep_scope: ["standards"], sweep_is_exhaustive: true, entries: [], claims: [] };
  const r = sourceMapGate(map);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.detail === "exhaustiveness_claimed"));
});

test("§13 the SHIPPED source map passes its own gate", () => {
  const map = loadSourceMap();
  const r = sourceMapGate(map);
  assert.deepEqual(r.violations, [], JSON.stringify(r.violations, null, 2));
  assert.equal(r.ok, true);
  assert.ok(map.entries.length > 0, "a gate over an empty map proves nothing");
});

test("§13 the shipped map records what Stage 5O did NOT invent", () => {
  const map = loadSourceMap();
  const byId = Object.fromEntries(map.entries.map((e) => [e.id, e]));
  // The §3.5 Merkle is RFC 6962's MTH, verbatim — leaf 0x00, node 0x01, k = largest power of two.
  assert.equal(byId.rfc6962.classification, "prior_art_construction");
  assert.match(byId.rfc6962.exact_quote, /largest power of two smaller than n/);
  // The §7 seed is RFC 5869 HKDF.
  assert.equal(byId.rfc5869.classification, "prior_art_construction");
  // The §9 detection probability is classical hypergeometric sampling, not a Stage 5O invention.
  assert.equal(byId.hypergeometric_detection.classification, "classical_mathematics");
  // Every novelty claim must distinguish itself from at least one pinned prior-art entry.
  for (const c of map.claims) {
    assert.ok(c.distinguishes_from.length > 0, `${c.id} distinguishes from nothing`);
    for (const d of c.distinguishes_from) assert.ok(byId[d], `${c.id} cites unknown ${d}`);
  }
});

test("§13 a PLACEHOLDER url is itself a fuzzy citation: null is permitted only, and declared", () => {
  const classical = {
    id: "x",
    title: "t",
    version_or_date: "classical",
    url: null,
    retrieval_date: "2026-07-22",
    exact_quote: null,
    quote_unavailable_reason: "no single primary source",
    classification: "classical_mathematics",
  };
  assert.equal(validateEntry(classical).ok, true, "a declared-null url is honest");
  // any other classification must carry a real url
  assert.equal(validateEntry({ ...classical, classification: "prior_art_field" }).ok, false);
  // an empty string is not a declaration of absence, it is a blank
  assert.equal(validateEntry({ ...classical, url: "" }).ok, false);
  // and the shipped map must not point a reader at an unrelated document
  const map = loadSourceMap();
  const h = map.entries.find((e) => e.id === "hypergeometric_detection");
  assert.equal(h.url, null, "no placeholder URL");
  assert.match(h.quote_unavailable_reason, /placeholder/);
});
