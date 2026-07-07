import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderView,
  checkMarkerIntegrity,
  MARKERS,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeViews.mjs";

// "voice one. " is 11 bytes; "EVIDENCE HERE." is 14 bytes -> span 11..25; then " " then
// "voice two." as prose 26..36.
const content = {
  narrative_body: "voice one. EVIDENCE HERE. voice two.\n",
  span_map: [
    {
      span_id: "s1",
      start_byte: 11,
      end_byte: 25,
      type: "slot_bound",
      regime: "r",
      section_id: "x",
      claimed_value: 1,
      recompute_kind: "k",
      evidence_digest: "sha256:" + "a".repeat(64),
    },
    { span_id: "p1", start_byte: 26, end_byte: 36, type: "unverified_prose" },
  ],
  judgments: [],
};

test("render: every span visibly typed, density sealed, digests stable", () => {
  const view = renderView(content, "audit");
  const markers = view.segments.map((s) => s.marker);
  assert.ok(markers.includes(MARKERS.slot_bound));
  assert.ok(markers.includes(MARKERS.unverified_prose));
  assert.ok(markers.includes(MARKERS.connective));
  assert.equal(view.density.total_bytes, Buffer.byteLength(content.narrative_body));
  assert.match(view.render_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(checkMarkerIntegrity(view, content), null);
});

test("public tier carries digests for voice, text only for evidence badges", () => {
  const pub = renderView(content, "public");
  const voice = pub.segments.find((s) => s.marker === MARKERS.unverified_prose);
  assert.equal(voice.text, undefined);
  assert.match(voice.text_digest, /^sha256:/);
  const badge = pub.segments.find((s) => s.marker === MARKERS.slot_bound);
  assert.ok(typeof badge.text === "string"); // evidence badge keeps its text in every tier
});

test("marker downgrade is refused", () => {
  const view = renderView(content, "audit");
  const tampered = JSON.parse(JSON.stringify(view));
  const idx = tampered.segments.findIndex((s) => s.marker === MARKERS.unverified_prose);
  tampered.segments[idx].marker = MARKERS.slot_bound; // voice dressed as evidence
  const r = checkMarkerIntegrity(tampered, content);
  assert.equal(r.violation, "marker_downgraded_or_forged");
});
