// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — total partition with precedence + 185 arithmetic (spec §2, plan Task 5).
// Motto: AnthropicSafe First, then ReviewerSafe.
// No Silent Region: every byte lands in exactly one region; lengths sum to the document
// length; redaction is COUNTED, not erased. Overlap resolved by fixed precedence.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VDR_CLASS_PRECEDENCE, VDR_REGION_CLASSES } from "../constants.mjs";

const CLASS_BY_RANK = ["redacted", "caught_v1", "caught_v2_only", "unflagged"];
export const PRECEDENCE_RANK = VDR_CLASS_PRECEDENCE;

const fail = (detail) => ({ raw: 185, reason: "vdr_partition_invalid", detail });

// buildPartition(byteLength, spans, manifest) → sorted, contiguous, gap-free regions.
// Precedence: redacted(0) > caught_v1(1) > caught_v2_only(2) > unflagged(3); lower wins.
export function buildPartition(byteLength, spans = [], manifest = []) {
  const rank = new Uint8Array(byteLength).fill(3); // default unflagged
  const paint = (start, end, r) => {
    const s = Math.max(0, start);
    const e = Math.min(byteLength, end);
    for (let i = s; i < e; i++) if (r < rank[i]) rank[i] = r;
  };
  for (const sp of spans) paint(sp.start_byte, sp.end_byte, PRECEDENCE_RANK[sp.class]);
  for (const m of manifest) paint(m.offset, m.offset + m.length, PRECEDENCE_RANK.redacted);

  const regions = [];
  let i = 0;
  while (i < byteLength) {
    const r = rank[i];
    let j = i + 1;
    while (j < byteLength && rank[j] === r) j++;
    regions.push({ offset: i, length: j - i, class: CLASS_BY_RANK[r] });
    i = j;
  }
  return regions;
}

// Recompute the structural aggregates from a region list (the 185 recount source of truth).
export function aggregatesFor(byteLength, regions) {
  const bytes_by_class = {};
  const span_counts_by_class = {};
  for (const c of VDR_REGION_CLASSES) {
    bytes_by_class[c] = 0;
    span_counts_by_class[c] = 0;
  }
  for (const r of regions) {
    bytes_by_class[r.class] += r.length;
    span_counts_by_class[r.class] += 1;
  }
  return { bytes_by_class, span_counts_by_class };
}

const nonNegInt = (n) => Number.isInteger(n) && n >= 0;

// checkPartition(map) → null | {raw:185,...}. map = {document_byte_length, regions, aggregates}.
export function checkPartition(map) {
  const len = map?.document_byte_length;
  const regions = map?.regions ?? [];
  if (!nonNegInt(len)) return fail("length_not_conserved");

  let cursor = 0;
  let prevOffset = -1;
  for (const r of regions) {
    if (!VDR_REGION_CLASSES.includes(r.class)) return fail("unknown_region_class");
    if (!nonNegInt(r.offset) || !nonNegInt(r.length) || r.length === 0)
      return fail("regions_unsorted");
    if (r.offset < prevOffset) return fail("regions_unsorted");
    if (r.offset < cursor) return fail("regions_overlap");
    if (r.offset > cursor) return fail("regions_gap");
    cursor = r.offset + r.length;
    prevOffset = r.offset;
  }
  if (cursor !== len) return fail("length_not_conserved");

  // Aggregate recount — compare with canonicalJson (never JSON.stringify; 4X gotcha).
  const recomputed = aggregatesFor(len, regions);
  const agg = map.aggregates ?? {};
  if (
    canonicalJson(agg.bytes_by_class ?? {}) !== canonicalJson(recomputed.bytes_by_class) ||
    canonicalJson(agg.span_counts_by_class ?? {}) !== canonicalJson(recomputed.span_counts_by_class)
  )
    return fail("aggregates_mismatch");

  // Shadow self-consistency (full replay is 187): non-negative ints, slips ≤ applicable.
  const sh = agg.shadow;
  if (sh) {
    for (const k of ["n_caught_regions", "a_applicable_variants", "k_slip_v1", "k_slip_v2"])
      if (!nonNegInt(sh[k])) return fail("shadow_arithmetic_broken");
    if (sh.k_slip_v1 > sh.a_applicable_variants || sh.k_slip_v2 > sh.a_applicable_variants)
      return fail("shadow_arithmetic_broken");
  }

  return null;
}
