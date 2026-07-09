// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — detector pin + provenance-bound score table (plan Task 4). External-review
// corrections: fixed-width decimals [PG-2/R], case-insensitive positive label [F6/PG-3], each entry
// keyed by generated_text_digest so an evasion cannot borrow another variant's low score [R].
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { applyRecipe } from "./recipes.mjs";
import { VDA_DETECTOR } from "../constants.mjs";

const sha256 = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const PREC = VDA_DETECTOR.SCORE_PRECISION;
const FIXED_DEC = /^(0\.[0-9]{4}|1\.0000)$/; // fixed-width decimal in [0,1] at precision 4

// --- fixed-width decimal helpers (lexical compare == numeric compare on this domain) ---
export const isFixedWidthDec = (s) => typeof s === "string" && FIXED_DEC.test(s);
export function decStr(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`score out of [0,1]: ${x}`);
  return n.toFixed(PREC);
}
export function decLt(a, b) {
  if (!isFixedWidthDec(a) || !isFixedWidthDec(b))
    throw new Error(`decLt needs fixed-width decimals: ${a}, ${b}`);
  return a < b; // safe: equal width, same [0,1] domain
}

// De-obfuscation is a FIXED normalizer, NOT the recipe inverse [R]: NFKC then strip combining marks
// and default-ignorable codepoints.
export function normalizeDeobfuscated(text) {
  return String(text)
    .normalize("NFKC")
    .replace(/\p{M}/gu, "")
    .replace(/\p{Default_Ignorable_Code_Point}/gu, "");
}

export const scoreTableDigest = (entries) => sha256(canonicalJson(entries));
export const runtimeDigest = (runtime) => sha256(canonicalJson(runtime));

function baseTextMap(bundle) {
  const m = new Map();
  for (const b of bundle.base_corpus ?? []) m.set(b.base_id, b.base_text);
  return m;
}

// The exact text a committed entry must hash to, given the public base text.
function expectedText(entry, baseText) {
  const obf = applyRecipe(baseText, entry.recipe ?? []);
  return entry.variant === "deobfuscated" ? normalizeDeobfuscated(obf) : obf;
}

// 257 — the detector is really pinned, and the capture is bound to this revision.
export function checkDetectorPinned(bundle) {
  const d = bundle.detector;
  if (!d || typeof d !== "object") return 257;
  for (const f of [
    "hf_revision",
    "resolved_commit_sha",
    "snapshot_manifest_digest",
    "tokenizer_manifest_digest",
    "runtime",
    "label_map",
  ])
    if (d[f] == null) return 257;
  const cp = bundle.capture_provenance;
  if (!cp || cp.detector_revision !== d.resolved_commit_sha) return 257;
  // positive_class_index must select POSITIVE_LABEL in label_map, matched case-insensitively.
  const label = d.label_map[String(d.positive_class_index)];
  if (typeof label !== "string") return 257;
  if (label.toLowerCase() !== VDA_DETECTOR.POSITIVE_LABEL.toLowerCase()) return 257;
  return null;
}

// 259 — score-table binding, in first-failure order (digest first, then keying, then provenance/range).
export function checkScoreTableBinding(bundle) {
  const st = bundle.score_table;
  if (!st || !Array.isArray(st.entries)) return 259;
  if (st.digest !== scoreTableDigest(st.entries)) return 259; // (a) digest FIRST
  const bt = baseTextMap(bundle);
  const rtDigest = runtimeDigest(bundle.detector.runtime);
  for (const e of st.entries) {
    if (!bt.has(e.base_id)) return 259;
    if (e.generated_text_digest !== sha256(expectedText(e, bt.get(e.base_id)))) return 259; // (b) keyed by what the recipe produces
    if (e.detector_snapshot_digest !== bundle.detector.snapshot_manifest_digest) return 259; // (c) pinned detector
    if (e.runtime_digest !== rtDigest) return 259;
    if (!isFixedWidthDec(e.score)) return 259; // (d) range + width
  }
  return null;
}

// Resolve a committed score by (base_id, variant) — never a live model.
export function resolveScore(bundle, base_id, variant) {
  const e = (bundle.score_table?.entries ?? []).find(
    (x) => x.base_id === base_id && x.variant === variant
  );
  return e ? e.score : null;
}
