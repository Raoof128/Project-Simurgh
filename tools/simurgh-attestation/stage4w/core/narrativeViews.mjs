// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W audience views — Voice Is Not Evidence, enforced in render (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Invariant: no view may hide or downgrade a span's visible type marker.
import { recordDigest, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { bodyBytes } from "./textCore.mjs";
import { computeEvidenceDensity } from "./narrativeCore.mjs";

export const MARKERS = Object.freeze({
  slot_bound: "[E]",
  judgment: "[J]",
  unverified_prose: "[V]",
  connective: "[·]",
});

const DEC = new TextDecoder();

function segmentsOf(content) {
  const bytes = bodyBytes(content.narrative_body);
  const spans = [...(content.span_map ?? [])].sort((a, b) => a.start_byte - b.start_byte);
  const segs = [];
  let cursor = 0;
  const push = (start, end, type, span_id) =>
    segs.push({
      marker: MARKERS[type],
      type,
      ...(span_id ? { span_id } : {}),
      text: DEC.decode(bytes.subarray(start, end)),
    });
  for (const s of spans) {
    if (s.start_byte > cursor) push(cursor, s.start_byte, "connective");
    push(s.start_byte, s.end_byte, s.type, s.span_id);
    cursor = s.end_byte;
  }
  if (cursor < bytes.length) push(cursor, bytes.length, "connective");
  return segs;
}

export function renderView(content, tier) {
  const segments = segmentsOf(content).map((seg) => {
    if (tier === "audit" || seg.type === "slot_bound") return seg;
    const { text, ...rest } = seg;
    return { ...rest, text_digest: `sha256:${sha256Hex(text)}` };
  });
  const density = computeEvidenceDensity(content);
  const view = { tier, segments, density };
  return { ...view, render_digest: recordDigest(view) };
}

// The 4W No Two Stories: rebuild the expected marker sequence from the signed
// content and require exact match — a downgraded/forged marker never verifies.
export function checkMarkerIntegrity(view, content) {
  const expected = segmentsOf(content).map((s) => s.marker);
  const got = (view.segments ?? []).map((s) => s.marker);
  if (expected.length !== got.length || expected.some((m, i) => m !== got[i]))
    return { violation: "marker_downgraded_or_forged" };
  return null;
}
