// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — map build + recompute (spec §2, plan Task 8). Motto: AnthropicSafe First,
// then ReviewerSafe. buildMap emits a content-free PUBLIC map + a sealed AUDIT bundle.
// The shadow unit is the caught LINE (deterministic sentence-ish context for the MRs).
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VDR_MAP_SCHEMA, VDR_AUDIT_SCHEMA, VDR_CLASS_PRECEDENCE } from "../constants.mjs";
import { extractSpans as realExtractSpans, gateAgrees } from "./spanExtractor.mjs";
import { buildPartition, aggregatesFor } from "./partition.mjs";
import { computeShadow, aggregateShadow } from "./shadow.mjs";
import { freshFrozenBlock } from "./frozenBinding.mjs";

const DEC = new TextDecoder();
const sha = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");

// document_commitment = "sha256:" + sha256(salt ‖ bytes) — audit-reopenable, not public-checkable.
export const documentCommitment = (salt, bytes) =>
  sha(Buffer.concat([Buffer.from(String(salt), "utf8"), Buffer.from(bytes)]));

// Deterministic caught-LINE ranges (shadow context). A line is caught if any span overlaps it.
export function caughtLines(bytes, spans) {
  const ranges = [];
  let start = 0;
  for (let i = 0; i < bytes.length; i++)
    if (bytes[i] === 0x0a) {
      ranges.push([start, i + 1]);
      start = i + 1;
    }
  if (start < bytes.length) ranges.push([start, bytes.length]);
  if (ranges.length === 0 && bytes.length > 0) ranges.push([0, bytes.length]);
  const caught = [];
  for (const [s, e] of ranges)
    if (spans.some((sp) => sp.start_byte < e && sp.end_byte > s))
      caught.push({ offset: s, length: e - s, text: DEC.decode(bytes.slice(s, e)) });
  return caught;
}

const insideManifest = (sp, manifest) =>
  manifest.some((m) => m.offset <= sp.start_byte && sp.end_byte <= m.offset + m.length);

// buildMap(bytes, manifest, {salt, provenance, extractSpansFn}) → { map, audit }.
export function buildMap(bytes, manifest = [], opts = {}) {
  const { salt = "0", provenance = "fixture", extractSpansFn = realExtractSpans } = opts;
  const text = DEC.decode(bytes);
  const spans = extractSpansFn(text);
  const regions = buildPartition(bytes.length, spans, manifest);
  const lines = caughtLines(bytes, spans);
  const perLine = lines.map((l) => computeShadow(l.text));
  const shadow = aggregateShadow(perLine);

  // caught_inside_redacted computed PRE-precedence (private-side, audit only).
  let cirV1 = 0;
  let cirV2 = 0;
  for (const sp of spans)
    if (insideManifest(sp, manifest)) {
      if (sp.class === "caught_v1") cirV1++;
      else cirV2++;
    }

  const map = {
    schema: VDR_MAP_SCHEMA,
    document_byte_length: bytes.length,
    document_commitment: documentCommitment(salt, bytes),
    regions,
    aggregates: { ...aggregatesFor(bytes.length, regions), shadow },
    frozen: freshFrozenBlock(),
    reconciliation: null,
    provenance,
  };
  const audit = {
    schema: VDR_AUDIT_SCHEMA,
    document_digest: sha(Buffer.from(bytes)),
    commitment_salt: String(salt),
    redaction_manifest: [...manifest].sort((a, b) => a.offset - b.offset),
    shadow_regions: lines.map((l, i) => ({
      offset: l.offset,
      length: l.length,
      records: perLine[i],
    })),
    caught_inside_redacted: { v1: cirV1, v2_only: cirV2 },
  };
  return { map, audit };
}

const fail188 = (detail) => ({ raw: 188, reason: "vdr_map_recompute_mismatch", detail });

// checkMapRecompute(bytes, audit, committedMap, {extractSpansFn}) → null | {raw:188,...}.
// Rebuilds the map from bytes + sealed manifest/salt and compares via canonicalJson. Also runs
// the gate-agreement oracle over caught lines (a poisoned extractor → gate_agreement_violated),
// and reopens the salted commitment.
export function checkMapRecompute(bytes, audit, committedMap, opts = {}) {
  const { extractSpansFn = realExtractSpans } = opts;
  const salt = audit?.commitment_salt;
  const manifest = audit?.redaction_manifest ?? [];

  // Commitment reopen.
  if (documentCommitment(salt, bytes) !== committedMap?.document_commitment)
    return fail188("commitment_does_not_reopen");

  // Gate-agreement oracle over EVERY line: the (possibly injected) extractor's v1 verdict must
  // equal the unmodified 4W gate's. A poisoned extractor colouring v1 where the frozen rules do
  // not (or missing one) is caught here BEFORE the byte compare.
  let start = 0;
  const lineRanges = [];
  for (let i = 0; i < bytes.length; i++)
    if (bytes[i] === 0x0a) {
      lineRanges.push([start, i + 1]);
      start = i + 1;
    }
  if (start < bytes.length) lineRanges.push([start, bytes.length]);
  for (const [s, e] of lineRanges) {
    const lineText = DEC.decode(bytes.slice(s, e));
    const extractorV1 = extractSpansFn(lineText).some((sp) => sp.class === "caught_v1");
    if (extractorV1 !== gateAgrees(lineText)) return fail188("gate_agreement_violated");
  }

  const rebuilt = buildMap(bytes, manifest, {
    salt,
    provenance: committedMap?.provenance,
    extractSpansFn,
  });
  if (canonicalJson(rebuilt.map) !== canonicalJson(committedMap))
    return fail188("map_recompute_mismatch");
  return null;
}

export { VDR_CLASS_PRECEDENCE };
