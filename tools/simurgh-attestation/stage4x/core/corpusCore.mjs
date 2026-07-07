// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR corpus core (spec §2). Motto: AnthropicSafe First, then ReviewerSafe.
// Schema (173), corpus well-formedness incl. MR-derivation + coverage (175), and the
// frozen-gate binding (176): v1 ruleset digest AND a 4W source-digest witness (constants OR
// wrapper drift both trip 176) — the read-only-leakage-kernel proof for a stage that RUNS the gate.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import {
  LEAKAGE_RULESET_ID,
  LEAKAGE_NUMBER_WORDS,
  LEAKAGE_QUANTIFIERS,
  LEAKAGE_MONTHS,
} from "../../stage4w/constants.mjs";
import {
  VLR_CORPUS_SCHEMA,
  VLR_FAMILIES,
  VLR_PROVENANCE,
  VLR_V1_COVERAGE_FAMILIES,
} from "../constants.mjs";
import { applyMR, MR_IDS } from "./metamorphicTable.mjs";

const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
// The imported 4W leakage modules — any byte change to constants OR wrapper trips the witness.
export const FOUR_W_SOURCE_FILES = Object.freeze([
  "tools/simurgh-attestation/stage4w/core/leakageGate.mjs",
  "tools/simurgh-attestation/stage4w/constants.mjs",
]);

// Digest of the imported (unmodified) 4W v1 lexical ruleset.
export function v1RulesetDigest() {
  return sha(
    canonicalJson({
      id: LEAKAGE_RULESET_ID,
      numberWords: LEAKAGE_NUMBER_WORDS,
      quantifiers: LEAKAGE_QUANTIFIERS,
      months: LEAKAGE_MONTHS,
    })
  );
}

// Source-digest witness over the 4W leakage module FILE BYTES (DI seam via rootDir — P1-5).
export function computeSourceWitness({ rootDir = DEFAULT_ROOT } = {}) {
  const out = {};
  for (const rel of FOUR_W_SOURCE_FILES) out[rel] = sha(readFileSync(join(rootDir, rel)));
  return out;
}

const TOP_KEYS = new Set([
  "schema",
  "ruleset_binding",
  "metamorphic_table_id",
  "metamorphic_table_digest",
  "source_witness",
  "items",
  "declared_item_count",
  "rubric_id",
  "coverage_witness",
]);
const ITEM_KEYS = new Set([
  "item_id",
  "provenance",
  "family",
  "claim_bearing",
  "seed_form",
  "metamorphic_relation",
  "residue_form",
  "incident_ref",
]);
const REQUIRED_ITEM_KEYS = [
  "item_id",
  "provenance",
  "family",
  "claim_bearing",
  "seed_form",
  "metamorphic_relation",
  "residue_form",
];

const fail = (raw, reason, detail) => ({ raw, reason, ...(detail ? { detail } : {}) });

export function validateCorpusSchema(corpus) {
  if (!corpus || typeof corpus !== "object")
    return fail(173, "vlr_schema_invalid", "not_an_object");
  if (corpus.schema !== VLR_CORPUS_SCHEMA) return fail(173, "vlr_schema_invalid", "schema_id");
  for (const k of Object.keys(corpus))
    if (!TOP_KEYS.has(k)) return fail(173, "vlr_schema_invalid", `unknown_key:${k}`);
  if (!Array.isArray(corpus.items) || corpus.items.length === 0)
    return fail(173, "vlr_schema_invalid", "items");
  if (typeof corpus.declared_item_count !== "number")
    return fail(173, "vlr_schema_invalid", "declared_item_count");
  if (!corpus.ruleset_binding || typeof corpus.ruleset_binding !== "object")
    return fail(173, "vlr_schema_invalid", "ruleset_binding");
  if (!corpus.source_witness || typeof corpus.source_witness !== "object")
    return fail(173, "vlr_schema_invalid", "source_witness");
  if (!corpus.coverage_witness || typeof corpus.coverage_witness !== "object")
    return fail(173, "vlr_schema_invalid", "coverage_witness");
  for (const it of corpus.items) {
    if (!it || typeof it !== "object") return fail(173, "vlr_schema_invalid", "item_not_object");
    for (const k of Object.keys(it))
      if (!ITEM_KEYS.has(k)) return fail(173, "vlr_schema_invalid", `unknown_item_key:${k}`);
    for (const k of REQUIRED_ITEM_KEYS)
      if (!(k in it)) return fail(173, "vlr_schema_invalid", `missing_item_key:${k}`);
    if (typeof it.seed_form !== "string" || typeof it.residue_form !== "string")
      return fail(173, "vlr_schema_invalid", "item_form_type");
  }
  return null;
}

export function checkCorpusWellFormed(corpus) {
  const items = corpus.items;
  if (corpus.declared_item_count !== items.length) return fail(175, "count_mismatch");
  const ids = items.map((i) => i.item_id);
  if (new Set(ids).size !== ids.length) return fail(175, "duplicate_item_id");
  if (ids.some((id, i) => i > 0 && !(ids[i - 1] < id))) return fail(175, "unsorted_item_id");
  for (const it of items) {
    if (!VLR_PROVENANCE.includes(it.provenance)) return fail(175, "bad_provenance", it.item_id);
    if (it.claim_bearing !== true) return fail(175, "missing_label", it.item_id);
    if (!VLR_FAMILIES.includes(it.family) || !MR_IDS.includes(it.metamorphic_relation))
      return fail(175, "rubric_inconsistent_label", it.item_id);
    if (it.residue_form !== applyMR(it.metamorphic_relation, it.seed_form))
      return fail(175, "residue_form_not_mr_derived", it.item_id);
  }
  const cw = corpus.coverage_witness;
  for (const fam of VLR_V1_COVERAGE_FAMILIES) {
    const list = cw[fam];
    if (!Array.isArray(list) || list.length === 0 || !list.every((id) => ids.includes(id)))
      return fail(175, "coverage_witness_incomplete", fam);
  }
  return null;
}

export function checkFrozenGate(corpus) {
  if (corpus.ruleset_binding?.v1_ruleset_digest !== v1RulesetDigest())
    return fail(176, "v1_ruleset_digest_mismatch");
  return null;
}

export function checkSourceWitness(corpus, { rootDir = DEFAULT_ROOT } = {}) {
  const live = computeSourceWitness({ rootDir });
  for (const rel of FOUR_W_SOURCE_FILES)
    if (corpus.source_witness?.[rel] !== live[rel]) return fail(176, "four_w_source_drift", rel);
  return null;
}
