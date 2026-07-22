// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — derive the exact §5.2.2 census canonical maxima with the PRODUCTION encoder (A30).
//
// §5.2.2 carried "<derived>" placeholders while a §5 freeze-gate row hand-cited both figures.
// The result figure silently assumed the top field name `reported_result_census_digest`, while the
// frozen §5.2 schema misspelled it `reported_reported_result_census_digest` (a doubled word worth 9
// bytes). This generator derives both maxima from the CORRECTED schema in two independent views that
// must agree; it is oracle-free — no expected maximum appears in this source, not even in a comment.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { structuralBytes } from "./measureScopeManifestMaximum.mjs";

export const N_MAX = 65536; // MAX_SCOPE_CARDINALITY
const HEX64 = "0123456789abcdef".repeat(4); // any bytes32 renders as 64 hex chars; content is size-irrelevant

export const EXECUTION_CENSUS_SCHEMA_ID = "simurgh.vsc.execution_record_census.v1";
export const RESULT_CENSUS_SCHEMA_ID = "simurgh.vsc.reported_result_census.v1";

// Top-level census keys (§5.2) and entry keys. The result census carries the CORRECTED single-word
// `reported_result_census_digest`; the census-from-spec test proves the working-tree schema matches.
export const EXECUTION_CENSUS_KEYS = Object.freeze([
  "schema_id",
  "schema_digest",
  "stage5o_precommitment_digest",
  "epoch_digest",
  "cardinality",
  "entries",
  "execution_record_census_digest",
]);
export const RESULT_CENSUS_KEYS = Object.freeze([
  "schema_id",
  "schema_digest",
  "stage5o_precommitment_digest",
  "epoch_digest",
  "cardinality",
  "entries",
  "reported_result_census_digest",
]);
export const EXECUTION_ENTRY_KEYS = Object.freeze([
  "declared_index",
  "scope_leaf_id",
  "case_link_commitment",
  "execution_record_digest",
]);
export const RESULT_ENTRY_KEYS = Object.freeze([
  "declared_index",
  "scope_leaf_id",
  "execution_entry_digest",
  "result_payload_digest",
]);

function buildCensus(schemaId, topKeys, entryKeys, N) {
  const entries = new Array(N);
  for (let i = 0; i < N; i++) {
    const e = { declared_index: String(i) };
    for (const k of entryKeys) if (k !== "declared_index") e[k] = HEX64;
    entries[i] = e;
  }
  const c = {};
  for (const k of topKeys) {
    if (k === "schema_id") c[k] = schemaId;
    else if (k === "cardinality") c[k] = String(N);
    else if (k === "entries") c[k] = entries;
    else c[k] = HEX64; // schema_digest, precommitment, epoch, top census digest
  }
  return c;
}
export function buildMaximalExecutionCensus(N = N_MAX) {
  return buildCensus(EXECUTION_CENSUS_SCHEMA_ID, EXECUTION_CENSUS_KEYS, EXECUTION_ENTRY_KEYS, N);
}
export function buildMaximalResultCensus(N = N_MAX) {
  return buildCensus(RESULT_CENSUS_SCHEMA_ID, RESULT_CENSUS_KEYS, RESULT_ENTRY_KEYS, N);
}

// Two independent views: the production encoder (canonicalJson + UTF-8 length) and the structural
// ledger (imported from the A27 generator). They must agree or the derivation is rejected.
function measure(obj) {
  return {
    encoderTotal: Buffer.byteLength(canonicalJson(obj), "utf8"),
    ledgerTotal: structuralBytes(obj),
  };
}
export function generateCensusMaxima(opts = {}) {
  const N = opts.N ?? N_MAX;
  const exec = measure(buildMaximalExecutionCensus(N));
  const result = measure(buildMaximalResultCensus(N));
  return Object.freeze({
    MAX_EXECUTION_CENSUS_CANONICAL_BYTES_V1: exec.encoderTotal,
    MAX_RESULT_CENSUS_CANONICAL_BYTES_V1: result.encoderTotal,
    exec,
    result,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = generateCensusMaxima();
  const line = (name, v) =>
    console.log(
      name,
      ":",
      v.encoderTotal.toLocaleString(),
      "(ledger",
      v.ledgerTotal.toLocaleString() + ")",
      "agree:",
      v.encoderTotal === v.ledgerTotal
    );
  line("execution census", m.exec);
  line("result census   ", m.result);
}
