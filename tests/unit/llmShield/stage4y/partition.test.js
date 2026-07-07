// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — total partition with precedence + 185 checks (plan Task 5).
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPartition,
  checkPartition,
  aggregatesFor,
} from "../../../../tools/simurgh-attestation/stage4y/core/partition.mjs";
import { extractSpans } from "../../../../tools/simurgh-attestation/stage4y/core/spanExtractor.mjs";

const enc = (s) => new TextEncoder().encode(s);
const sumLen = (regs) => regs.reduce((a, r) => a + r.length, 0);

test("partition is sorted, contiguous, gap-free, and conserves length", () => {
  const body = "about 42% roughly there";
  const len = enc(body).length;
  const regs = buildPartition(len, extractSpans(body), []);
  assert.equal(sumLen(regs), len, "conservation");
  let cursor = 0;
  for (const r of regs) {
    assert.equal(r.offset, cursor, "contiguous, no gap/overlap");
    cursor += r.length;
  }
  assert.equal(cursor, len, "covers to EOF");
});

test("precedence: 'roughly 40' → 40 is caught_v1, roughly is caught_v2_only, no double-count", () => {
  const body = "roughly 40";
  const regs = buildPartition(enc(body).length, extractSpans(body), []);
  const classAt = (byteOff) =>
    regs.find((r) => r.offset <= byteOff && byteOff < r.offset + r.length).class;
  assert.equal(classAt(0), "caught_v2_only", "'roughly' bytes");
  assert.equal(classAt(8), "caught_v1", "'40' bytes");
});

test("redacted wins: a v-hit fully inside a manifest region is classified redacted", () => {
  const body = "value 42 here";
  const regs = buildPartition(enc(body).length, extractSpans(body), [{ offset: 6, length: 2 }]);
  const classAt = (o) => regs.find((r) => r.offset <= o && o < r.offset + r.length).class;
  assert.equal(classAt(6), "redacted", "the 42 is inside the redaction → redacted");
});

test("adjacent same-class bytes coalesce into one maximal region", () => {
  const regs = buildPartition(enc("plain text only").length, [], []);
  assert.equal(regs.length, 1);
  assert.equal(regs[0].class, "unflagged");
});

test("edge geometry: redaction at offset 0 and at EOF both conserve", () => {
  const body = "abcdefgh";
  const len = enc(body).length;
  const regs = buildPartition(
    len,
    [],
    [
      { offset: 0, length: 2 },
      { offset: len - 2, length: 2 },
    ]
  );
  assert.equal(sumLen(regs), len);
  assert.equal(regs[0].class, "redacted");
  assert.equal(regs[regs.length - 1].class, "redacted");
});

// ---- checkPartition (185) ----
function goodMap() {
  const body = "about 42% roughly there";
  const len = enc(body).length;
  const regions = buildPartition(len, extractSpans(body), []);
  return {
    document_byte_length: len,
    regions,
    aggregates: {
      ...aggregatesFor(len, regions),
      shadow: { n_caught_regions: 2, a_applicable_variants: 3, k_slip_v1: 1, k_slip_v2: 0 },
    },
  };
}

test("a well-formed map passes checkPartition", () => {
  assert.equal(checkPartition(goodMap()), null);
});

test("185 reasons are each reachable", () => {
  const g = goodMap();
  const R = (m) => checkPartition(m)?.detail;

  const gap = structuredClone(g);
  gap.regions[0].length += 1; // breaks contiguity + conservation
  assert.ok(["regions_gap", "regions_overlap", "length_not_conserved"].includes(R(gap)));

  const short = structuredClone(g);
  short.document_byte_length += 5;
  assert.equal(R(short), "length_not_conserved");

  const badClass = structuredClone(g);
  badClass.regions[0].class = "mystery";
  assert.equal(R(badClass), "unknown_region_class");

  const badAgg = structuredClone(g);
  badAgg.aggregates.bytes_by_class.unflagged += 99;
  assert.equal(R(badAgg), "aggregates_mismatch");

  const badShadow = structuredClone(g);
  badShadow.aggregates.shadow.k_slip_v1 = 999; // > applicable
  assert.equal(R(badShadow), "shadow_arithmetic_broken");

  const unsorted = structuredClone(g);
  unsorted.regions.reverse();
  assert.ok(["regions_unsorted", "regions_gap", "regions_overlap"].includes(R(unsorted)));
});
