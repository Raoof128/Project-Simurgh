// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — derive the worst-case canonical scope_manifest maximum with the PRODUCTION encoder,
// after A27 pins the seven previously-unpinned profile IDs. A27's regenerated limit-compatibility
// invariant comes from HERE, not from arithmetic on the quarantined pre-A27 figure.
//
// ORACLE-FREE (gate 2): this source contains no expected maximum and no historical figure at all —
// not even in a comment. It does not import, subtract from, calibrate against, or assert the
// quarantined pre-A27 manifest figure, its freed hypothetical, or any target replacement. The number
// is whatever the frozen schema encodes. Historical comparison happens only in a separate report,
// after derivation (see the closeout note, never this generator).
//
// TWO INDEPENDENT VIEWS (gate 3): the production encoder (`canonicalJson` + UTF-8 byte length) and an
// independent structural ledger that counts UTF-8 field names, values, quotes, colons, commas, braces
// and brackets. The manifest is canonical JSON, so the ledger counts ONLY JSON bytes — the `u16be(len)`
// framing lives in the separate `profile_bundle_digest` PREIMAGE, never inside canonicalJson(manifest).
// The two totals must agree exactly, or the derivation is rejected.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

// ---- Frozen schema (mirrors §4.1 scope_manifest / §4.4 bundle / §4.7.1 authority; the census test
//      proves this list against the current working-tree spec, not against a plausible reconstruction).

export const SCOPE_MANIFEST_KEYS = Object.freeze([
  "schema_version",
  "profile_bundle",
  "epoch_descriptor",
  "epoch_digest",
  "cardinality",
  "leaf_entries",
  "merkle_root",
  "scope_vector_digest",
  "producer_authority_descriptor",
  "producer_authority_digest",
  "policy_bindings",
  "stage5o_precommitment_digest",
]);

// 23 profile pairs, in frozen bundle order (§4.4). Each contributes `<prefix>_id` (pinned literal)
// and `<prefix>_digest` (bytes32). The seven A27 literals are first; the ten A17/A19 literals follow;
// A28 appends the six Section-7 pairs (one schema + five profiles). The `_schema`/`_profile` suffix
// matches each pair's role: schema pairs own an object schema+digest, profile pairs own a construction.
export const BUNDLE_PROFILES = Object.freeze([
  ["manifest_schema", "simurgh.vsc.scope_manifest.v1"], // A27
  ["commitment_profile", "simurgh.vsc.commitment.v1"], // A27
  ["leaf_profile", "simurgh.vsc.hidden_leaf.v1"], // A27
  ["tree_profile", "simurgh.vsc.merkle_tree.v1"], // A27
  ["case_schema", "simurgh.vsc.case_schema.v1"], // A27
  ["execution_object_schema", "simurgh.vsc.execution_object_schema.v1"], // A27
  ["result_object_schema", "simurgh.vsc.result_object_schema.v1"], // A27
  ["census_closure_schema", "simurgh.vsc.census_closure.v1"], // A17
  ["presented_closure_consistency_profile", "simurgh.vsc.presented_closure_consistency.v1"], // A17
  ["closure_conflict_schema", "simurgh.vsc.closure_conflict_evidence.v1"], // A17
  ["closure_anchor_schedule_profile", "simurgh.vsc.anchor_schedule.v1"], // A17
  ["challenge_subject_profile", "simurgh.vsc.challenge_subject.v1"], // A17
  ["stage4t_package_adapter_profile", "simurgh.vsc.stage4t_package_adapter.v1"], // A17
  ["package_closure_core_section_schema", "simurgh.vsc.package_closure_core_section.v1"], // A17
  ["producer_authority_schema", "simurgh.vsc.producer_authority.v1"], // A19
  ["producer_signature_profile", "simurgh.vsc.producer_signature.ed25519.v1"], // A19
  ["closure_authorization_schema", "simurgh.vsc.census_closure_authorization.v1"], // A19
  [
    "verified_closure_bitcoin_checkpoint_schema",
    "simurgh.vsc.verified_closure_bitcoin_checkpoint_schema.v1",
  ], // A28
  ["beacon_contract_profile", "simurgh.vsc.beacon_contract_profile.v1"], // A28
  ["beacon_suffix_profile", "simurgh.vsc.beacon_suffix_profile.v1"], // A28
  ["ordered_selected_indices_profile", "simurgh.vsc.ordered_selected_indices_profile.v1"], // A28
  ["challenge_protocol_profile", "simurgh.vsc.challenge_protocol_profile.v1"], // A28
  ["challenge_resource_limits_profile", "simurgh.vsc.challenge_resource_limits_profile.v1"], // A28
]);

export const PRODUCER_AUTHORITY_KEYS = Object.freeze([
  "schema_id",
  "schema_digest",
  "signature_profile_id",
  "signature_profile_digest",
  "public_key",
]);
export const EPOCH_DESCRIPTOR_KEYS = Object.freeze([
  "campaign_digest",
  "epoch_sequence",
  "epoch_nonce",
]);
export const POLICY_BINDINGS_KEYS = Object.freeze([
  "opening_predicate_digest",
  "relational_predicate_digest",
  "challenge_policy_digest",
  "beacon_contract_digest",
  "disclosure_policy_digest",
]);

// §4.1.1 pinned v1 limits (frozen). MAX_SCOPE_CARDINALITY is the number of leaf entries.
export const MAX_SCOPE_CARDINALITY = 65536;
export const MAX_SCOPE_CANONICAL_BYTES = 8388608; // ceiling only; used for the report/verdict, never in derivation
const HEX64 = "0123456789abcdef".repeat(4); // any bytes32 renders as 64 hex chars; content is size-irrelevant
const U64_MAX_DECIMAL = "18446744073709551615"; // 2^64 - 1, the widest canonical epoch_sequence (20 digits)
const SCHEMA_VERSION = "simurgh.vsc.scope_manifest.v1"; // §4.4: MUST equal manifest_schema_id
const PRODUCER_AUTHORITY_SCHEMA_ID = "simurgh.vsc.producer_authority.v1";
const PRODUCER_SIGNATURE_PROFILE_ID = "simurgh.vsc.producer_signature.ed25519.v1";

/** canonicalDecimal(array position) — no leading zeros; §4.2. */
const canonicalDecimal = (i) => String(i);

/** Construct the maximal schema-valid scope_manifest: pinned literals, N at its ceiling, epoch at the
 * widest u64, every bytes32/hex field at its fixed 64-char width. `epochSequence` is a parameter only
 * so the liveness test can pass a valid 19-digit value; it defaults to the u64 maximum. */
export function buildMaximalScopeManifest({
  epochSequence = U64_MAX_DECIMAL,
  N = MAX_SCOPE_CARDINALITY,
} = {}) {
  const profile_bundle = {};
  for (const [prefix, literal] of BUNDLE_PROFILES) {
    profile_bundle[`${prefix}_id`] = literal;
    profile_bundle[`${prefix}_digest`] = HEX64;
  }
  const leaf_entries = new Array(N);
  for (let i = 0; i < N; i++)
    leaf_entries[i] = { declared_index: canonicalDecimal(i), leaf_id: HEX64 };
  return {
    schema_version: SCHEMA_VERSION,
    profile_bundle,
    epoch_descriptor: { campaign_digest: HEX64, epoch_sequence: epochSequence, epoch_nonce: HEX64 },
    epoch_digest: HEX64,
    cardinality: String(N),
    leaf_entries,
    merkle_root: HEX64,
    scope_vector_digest: HEX64,
    producer_authority_descriptor: {
      schema_id: PRODUCER_AUTHORITY_SCHEMA_ID,
      schema_digest: HEX64,
      signature_profile_id: PRODUCER_SIGNATURE_PROFILE_ID,
      signature_profile_digest: HEX64,
      public_key: HEX64,
    },
    producer_authority_digest: HEX64,
    policy_bindings: {
      opening_predicate_digest: HEX64,
      relational_predicate_digest: HEX64,
      challenge_policy_digest: HEX64,
      beacon_contract_digest: HEX64,
      disclosure_policy_digest: HEX64,
    },
    stage5o_precommitment_digest: HEX64,
  };
}

// ---- Independent structural ledger. All manifest string values are ASCII (hex, canonical decimal,
//      dotted IDs) needing no JSON escaping, so a string is exactly `value.length + 2` (the quotes).
//      This counter never calls JSON.stringify, so it is a genuine second view of the byte total.
function strBytes(s) {
  if (/[\u0000-\u001f"\\]/.test(s))
    throw new Error("string needs JSON escaping: " + JSON.stringify(s));
  return Buffer.byteLength(s, "utf8") + 2;
}
export function structuralBytes(v) {
  if (typeof v === "string") return strBytes(v);
  if (Array.isArray(v)) {
    let n = 2; // [ ]
    for (let i = 0; i < v.length; i++) n += structuralBytes(v[i]) + (i ? 1 : 0);
    return n;
  }
  if (v && typeof v === "object") {
    const keys = Object.keys(v);
    let n = 2; // { }
    for (let i = 0; i < keys.length; i++) {
      n += strBytes(keys[i]) + 1 + structuralBytes(v[keys[i]]) + (i ? 1 : 0); // "key": value ,
    }
    return n;
  }
  throw new Error(`unexpected value type: ${typeof v}`);
}

/** A named per-field ledger over the top-level manifest, plus the leaf-array split you asked for. */
export function fieldLedger(manifest) {
  const rows = {};
  const keys = Object.keys(manifest); // canonicalJson sorts, but the byte SUM is order-independent
  for (const k of keys) {
    rows[k] = strBytes(k) + 1 + structuralBytes(manifest[k]); // "key": value
  }
  const structural_delimiters = 2 + (keys.length - 1); // outer braces + inter-field commas
  // leaf-array split (labelled exactly): objects+commas vs the two array brackets
  const arr = manifest.leaf_entries;
  let entriesPlusCommas = 0;
  for (let i = 0; i < arr.length; i++) entriesPlusCommas += structuralBytes(arr[i]) + (i ? 1 : 0);
  const leaf_split = { entries_plus_inter_commas: entriesPlusCommas, array_brackets: 2 };
  const ledgerTotal = Object.values(rows).reduce((a, b) => a + b, 0) + structural_delimiters;
  return { rows, structural_delimiters, leaf_split, ledgerTotal };
}

/** The derived maximum, both views, and the ledger. No target value anywhere. */
export function generateScopeManifestMaximum(opts = {}) {
  const manifest = buildMaximalScopeManifest(opts);
  const encoderTotal = Buffer.byteLength(canonicalJson(manifest), "utf8");
  const ledger = fieldLedger(manifest);
  return Object.freeze({
    MAX_SCOPE_CANONICAL_MANIFEST_BYTES_V1: encoderTotal,
    encoderTotal,
    ledgerTotal: ledger.ledgerTotal,
    ledger,
  });
}

// ---- Exact-key schema validator (census + pin-enforcement). Rejects unknown/missing keys, a mutated
//      pinned ID, or a non-canonical digest. A verifier boundary converts a throw into REJECT.
const BARE_HEX64 = /^[0-9a-f]{64}$/;
const CANON_DEC = /^(0|[1-9][0-9]*)$/;
function exactKeys(o, keys, what) {
  if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error(`${what}_not_object`);
  const got = Object.keys(o).sort();
  const want = [...keys].sort();
  if (got.length !== want.length || got.some((k, i) => k !== want[i]))
    throw new Error(`${what}_exact_keys`);
}
export function checkScopeManifestShape(m) {
  exactKeys(m, SCOPE_MANIFEST_KEYS, "scope_manifest");
  if (m.schema_version !== SCHEMA_VERSION) throw new Error("schema_version");
  const bundleKeys = [];
  for (const [p] of BUNDLE_PROFILES) bundleKeys.push(`${p}_id`, `${p}_digest`);
  exactKeys(m.profile_bundle, bundleKeys, "profile_bundle");
  for (const [p, lit] of BUNDLE_PROFILES) {
    if (m.profile_bundle[`${p}_id`] !== lit) throw new Error(`pinned_id_${p}`);
    if (!BARE_HEX64.test(m.profile_bundle[`${p}_digest`])) throw new Error(`digest_${p}`);
  }
  exactKeys(m.epoch_descriptor, EPOCH_DESCRIPTOR_KEYS, "epoch_descriptor");
  if (!BARE_HEX64.test(m.epoch_descriptor.campaign_digest)) throw new Error("epoch_campaign");
  if (!BARE_HEX64.test(m.epoch_descriptor.epoch_nonce)) throw new Error("epoch_nonce");
  if (!CANON_DEC.test(m.epoch_descriptor.epoch_sequence)) throw new Error("epoch_sequence");
  for (const k of [
    "epoch_digest",
    "merkle_root",
    "scope_vector_digest",
    "producer_authority_digest",
    "stage5o_precommitment_digest",
  ])
    if (!BARE_HEX64.test(m[k])) throw new Error(k);
  if (!CANON_DEC.test(m.cardinality)) throw new Error("cardinality");
  exactKeys(
    m.producer_authority_descriptor,
    PRODUCER_AUTHORITY_KEYS,
    "producer_authority_descriptor"
  );
  const pad = m.producer_authority_descriptor;
  if (pad.schema_id !== PRODUCER_AUTHORITY_SCHEMA_ID) throw new Error("auth_schema_id");
  if (pad.signature_profile_id !== PRODUCER_SIGNATURE_PROFILE_ID) throw new Error("auth_sig_id");
  for (const k of ["schema_digest", "signature_profile_digest", "public_key"])
    if (!BARE_HEX64.test(pad[k])) throw new Error(`auth_${k}`);
  exactKeys(m.policy_bindings, POLICY_BINDINGS_KEYS, "policy_bindings");
  for (const k of POLICY_BINDINGS_KEYS)
    if (!BARE_HEX64.test(m.policy_bindings[k])) throw new Error(k);
  if (!Array.isArray(m.leaf_entries)) throw new Error("leaf_entries_array");
  for (let i = 0; i < m.leaf_entries.length; i++) {
    const e = m.leaf_entries[i];
    exactKeys(e, ["declared_index", "leaf_id"], "leaf_entry");
    if (e.declared_index !== String(i)) throw new Error(`declared_index_${i}`);
    if (!BARE_HEX64.test(e.leaf_id)) throw new Error(`leaf_id_${i}`);
  }
  return m;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = generateScopeManifestMaximum();
  console.log("derived worst-case canonical manifest :", m.encoderTotal.toLocaleString(), "bytes");
  console.log("independent ledger total             :", m.ledgerTotal.toLocaleString(), "bytes");
  console.log("agree                                :", m.encoderTotal === m.ledgerTotal);
  console.log("MAX_SCOPE_CANONICAL_BYTES ceiling    :", MAX_SCOPE_CANONICAL_BYTES.toLocaleString());
  console.log(
    "headroom                             :",
    (MAX_SCOPE_CANONICAL_BYTES - m.encoderTotal).toLocaleString()
  );
  console.log(
    "leaf array (entries+commas / +[]):",
    m.ledger.leaf_split.entries_plus_inter_commas.toLocaleString(),
    "/",
    (
      m.ledger.leaf_split.entries_plus_inter_commas + m.ledger.leaf_split.array_brackets
    ).toLocaleString()
  );
  console.log("top-level field ledger:");
  for (const [k, v] of Object.entries(m.ledger.rows))
    console.log("  ", k.padEnd(32), v.toLocaleString());
}
