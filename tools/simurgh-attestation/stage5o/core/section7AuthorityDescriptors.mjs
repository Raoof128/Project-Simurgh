// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 — the AUTHORITY DESCRIPTOR PACKET (normative source; digests NOT generated here).
//
// This file is the CONSTITUTION the Section-7 registry is generated from. It is the normative
// source: constants.mjs, the pure shape module, and the verifier tables must MIRROR these
// descriptors (a census proves it), never the reverse. The registry generator hashes these
// descriptors in topological order to produce the read-only SECTION7_AUTHORITY_REGISTRY that
// check 4 compares BOTH the profile_bundle pair digest AND the presented artifact digest against.
//
// Imports are listed by { id } only; the generator resolves each to its digest topologically, so a
// changed upstream descriptor propagates into every dependent digest. Every import MUST resolve to
// exactly one registry entry OR one explicitly pinned EXTERNAL_AUTHORITY_ROOT — no dangling imports
// (the transitive-closure census enforces this). The count is NOT fixed at ten.

// ---- Bootstrap digest-domain constants (pinned DIRECTLY; they take NO registry entry — a registry
//      entry for the domain used to hash registry entries would be a recursion trap).
export const SCHEMA_DESCRIPTOR_DIGEST_DOMAIN = "simurgh.vsc.schema_descriptor_digest_domain.v1";
export const PROFILE_DESCRIPTOR_DIGEST_DOMAIN = "simurgh.vsc.profile_descriptor_digest_domain.v1";
export const GRAMMAR_DESCRIPTOR_DIGEST_DOMAIN = "simurgh.vsc.grammar_descriptor_digest_domain.v1";

// Scalar domains owned by challenge_protocol_profile's rules (NOT self-referential registry roots).
export const CHECKPOINT_INSTANCE_DIGEST_DOMAIN =
  "simurgh.vsc.verified_closure_bitcoin_checkpoint_digest_domain.v1";
export const CHALLENGE_SEED_DIGEST_DOMAIN = "simurgh.vsc.challenge_seed_digest_domain.v1";

// Framed descriptor-digest preimage (shared by all three kinds; the domain switches per kind):
//   SHA256( u16be(len(UTF8(DOMAIN))) || UTF8(DOMAIN)
//        || u32be(len(UTF8(canonicalJson(descriptor)))) || UTF8(canonicalJson(descriptor)) )

// External authority roots: STATIC pinned digests this registry does NOT own or regenerate — a
// registry descriptor or a pinned external profile/schema authority, each with a stable {id,digest}.
// PER-RUN values (precommitment, epoch, closure_slot, census_closure, challenge_policy, beacon
// contract) are NOT authorities and never appear here — they are pair 12 `runtime_inputs`, resolved
// from an accepted prior-section context. Static protocol authority and runtime evidence stay apart.
export const EXTERNAL_AUTHORITY_ROOTS = Object.freeze([]);

// ---- GRAMMAR descriptors (GRAMMAR_DESCRIPTOR_DIGEST_DOMAIN). Field-level lexical grammars only.
//      No ascii-literal grammar (IDs use const_value); no nbits grammar (nbits->target is network
//      validation semantics, owned by the network profile, not a lexical field rule).
export const GRAMMAR_DESCRIPTORS = Object.freeze({
  digest_token_codec: {
    descriptor_version: "1",
    kind: "grammar",
    grammar_id: "simurgh.vsc.digest_token_codec.v1",
    rule: {
      encoding: "bare_lowercase_hex",
      exact_chars: 64,
      prefix: null,
      rejects: ["sha256:", "uppercase", "0x"],
    },
  },
  bitcoin_header_hex160: {
    descriptor_version: "1",
    kind: "grammar",
    grammar_id: "simurgh.vsc.grammar.bitcoin_header_hex160.v1",
    rule: { encoding: "bare_lowercase_hex", exact_chars: 160, bytes: 80, prefix: null },
  },
  canonical_unsigned_decimal: {
    descriptor_version: "1",
    kind: "grammar",
    grammar_id: "simurgh.vsc.grammar.canonical_unsigned_decimal.v1",
    rule: {
      encoding: "canonical_unsigned_decimal",
      regex: "^(0|[1-9][0-9]*)$",
      sign: false,
      leading_zero: false,
    },
  },
  // Lexical only: the compact-target FIELD encoding. The compact-target -> PoW-threshold decoding and
  // the header-derivation equality are network-validation SEMANTICS (pair: network profile), not here.
  lowercase_hex8: {
    descriptor_version: "1",
    kind: "grammar",
    grammar_id: "simurgh.vsc.grammar.lowercase_hex8.v1",
    rule: { encoding: "bare_lowercase_hex", exact_chars: 8, bytes: 4, prefix: null },
  },
});

// ---- SCHEMA descriptors (SCHEMA_DESCRIPTOR_DIGEST_DOMAIN). `fields` is a canonical MAP; its keys
//      ARE the exact-key authority (canonicalJson sorts them, so field order is not identity). IDs
//      are pinned with const_value, not proven merely ASCII.
const codecRef = { id: "simurgh.vsc.digest_token_codec.v1" };
const header160Ref = { id: "simurgh.vsc.grammar.bitcoin_header_hex160.v1" };
const decimalRef = { id: "simurgh.vsc.grammar.canonical_unsigned_decimal.v1" };
const hex8Ref = { id: "simurgh.vsc.grammar.lowercase_hex8.v1" };

export const SCHEMA_DESCRIPTORS = Object.freeze({
  // pair 18 — the FROZEN §6.5.4 projection; §7 validates it externally and never adds a field to it.
  verified_closure_bitcoin_checkpoint: {
    descriptor_version: "1",
    kind: "schema",
    schema_id: "simurgh.vsc.verified_closure_bitcoin_checkpoint_schema.v1",
    closed: true,
    fields: {
      network_profile_id: {
        type: "string",
        const_value: "simurgh.bitcoin.mainnet.header_validation.v1",
      },
      checkpoint_height: { type: "string", grammar_ref: decimalRef },
      checkpoint_block_hash: { type: "string", grammar_ref: codecRef },
      checkpoint_header: { type: "string", grammar_ref: header160Ref },
      // LEXICAL only (hex8); the network profile owns extraction-from-header + equality (no second fact).
      checkpoint_nbits: { type: "string", grammar_ref: hex8Ref },
      checkpoint_witness_profile_id: { type: "string" },
      checkpoint_witness_profile_digest: { type: "string", grammar_ref: codecRef },
      checkpoint_witness_key_fingerprint: { type: "string", grammar_ref: codecRef },
      stage5l_checkpoint_evidence_digest: { type: "string", grammar_ref: codecRef },
    },
  },
  beacon_contract: {
    descriptor_version: "1",
    kind: "schema",
    schema_id: "simurgh.vsc.beacon_contract.v1",
    closed: true,
    fields: {
      schema_id: { type: "string", const_value: "simurgh.vsc.beacon_contract.v1" },
      schema_digest: { type: "string", grammar_ref: codecRef },
      profile_id: { type: "string", const_value: "simurgh.vsc.beacon_contract_profile.v1" },
      profile_digest: { type: "string", grammar_ref: codecRef },
      beacon_source_id: { type: "string", const_value: "simurgh.vsc.beacon.bitcoin_mainnet.v1" },
      depth_convention_id: {
        type: "string",
        const_value: "simurgh.bitcoin.depth.descendants_after_beacon.v1",
      },
      challenge_height: { type: "string", grammar_ref: decimalRef },
    },
  },
  beacon_suffix: {
    descriptor_version: "1",
    kind: "schema",
    schema_id: "simurgh.vsc.beacon_suffix.v1",
    closed: true,
    fields: {
      schema_id: { type: "string", const_value: "simurgh.vsc.beacon_suffix.v1" },
      schema_digest: { type: "string", grammar_ref: codecRef },
      profile_id: { type: "string", const_value: "simurgh.vsc.beacon_suffix_profile.v1" },
      profile_digest: { type: "string", grammar_ref: codecRef },
      verified_closure_bitcoin_checkpoint_digest: { type: "string", grammar_ref: codecRef },
      headers: { type: "array", element_schema: { type: "string", grammar_ref: header160Ref } },
    },
  },
  ordered_selected_indices: {
    descriptor_version: "1",
    kind: "schema",
    schema_id: "simurgh.vsc.ordered_selected_indices.v1",
    closed: true,
    fields: {
      schema_id: { type: "string", const_value: "simurgh.vsc.ordered_selected_indices.v1" },
      schema_digest: { type: "string", grammar_ref: codecRef },
      profile_id: {
        type: "string",
        const_value: "simurgh.vsc.ordered_selected_indices_profile.v1",
      },
      profile_digest: { type: "string", grammar_ref: codecRef },
      indices: { type: "array", element_schema: { type: "string", grammar_ref: decimalRef } },
    },
  },
  challenge_record: {
    descriptor_version: "1",
    kind: "schema",
    schema_id: "simurgh.vsc.challenge_record.v1",
    closed: true,
    fields: {
      schema_id: { type: "string", const_value: "simurgh.vsc.challenge_record.v1" },
      schema_digest: { type: "string", grammar_ref: codecRef },
      challenge_protocol_profile_id: {
        type: "string",
        const_value: "simurgh.vsc.challenge_protocol_profile.v1",
      },
      challenge_protocol_profile_digest: { type: "string", grammar_ref: codecRef },
      challenge_seed: { type: "string", grammar_ref: codecRef }, // 32-byte token, NOT a *_digest
      challenge_subject_digest: { type: "string", grammar_ref: codecRef },
      verified_closure_bitcoin_checkpoint_digest: { type: "string", grammar_ref: codecRef },
      beacon_contract_digest: { type: "string", grammar_ref: codecRef },
      beacon_suffix_digest: { type: "string", grammar_ref: codecRef },
      ordered_selected_indices_digest: { type: "string", grammar_ref: codecRef },
    },
  },
});

// ---- PROFILE descriptors (PROFILE_DESCRIPTOR_DIGEST_DOMAIN). Structured `rules`, never `owns`
//      labels; every complex semantic is either structurally encoded or an imported {id} authority.
export const PROFILE_DESCRIPTORS = Object.freeze({
  // Network-validation authority (verifier cfg root; mirrored, not §7-owned).
  bitcoin_mainnet_header_validation: {
    descriptor_version: "1",
    kind: "profile",
    profile_id: "simurgh.bitcoin.mainnet.header_validation.v1",
    rules: [
      { rule_id: "network_identity", value: "bitcoin_mainnet" },
      { rule_id: "pow_limit", encoding: "compact_target", testnet_min_difficulty_exception: false },
      { rule_id: "header_encoding", byte_order: "internal_le", hash: "double_sha256" },
      { rule_id: "retarget_interval", blocks: 2016 },
      // nbits SEMANTICS live here (the hex8 grammar owns only the field's lexical form):
      {
        rule_id: "nbits_extraction",
        from: "checkpoint_header",
        field: "compact_target",
        into: "checkpoint_nbits",
      },
      {
        rule_id: "nbits_equality",
        left: "extracted_compact_target(checkpoint_header)",
        operator: "equals",
        right: "checkpoint_nbits",
      },
      { rule_id: "compact_target_decode", value: "compact_target_to_pow_threshold" },
    ],
    imports: [],
  },
  // Pair 11 — mirrored A17 definition; a DIGEST ROOT with no upstream (spec §, line 3026).
  closure_anchor_schedule_profile: {
    descriptor_version: "1",
    kind: "profile",
    profile_id: "simurgh.vsc.anchor_schedule.v1",
    rules: [
      { rule_id: "anchor_roles", source: "section_4_6_frozen_A17" },
      { rule_id: "anchor_binding_digest", source: "section_4_6_frozen_A17" },
      { rule_id: "timing_rules", source: "section_4_6_frozen_A17" },
      { rule_id: "receipt_non_mixing", source: "section_4_6_frozen_A17" },
      { rule_id: "anchor_instance_exact_key_schema", source: "section_4_6_frozen_A17" },
    ],
    imports: [], // root: no upstream
  },
  // Pair 12 — mirrored A17/§6.6 definition; imports resolve to EXTERNAL_AUTHORITY_ROOTS.
  challenge_subject_profile: {
    descriptor_version: "1",
    kind: "profile",
    profile_id: "simurgh.vsc.challenge_subject.v1",
    rules: [
      {
        rule_id: "challenge_subject_digest_construction",
        domain: "simurgh.vsc.challenge_subject.v1", // §6.6 CHALLENGE_SUBJECT_DOMAIN (frozen)
        // Each preimage slot is a TYPED reference: a symbolic self-reference, a per-run runtime input,
        // or a static import. `self_profile_digest` is NOT an import and NOT a dependency edge — it is
        // resolved from this profile's own frozen registry entry AFTER descriptor hashing, so the
        // descriptor-import graph stays acyclic while the runtime preimage still contains the pair-12 digest.
        preimage_order: [
          { ref: "self_profile_digest" },
          { ref: "runtime_input", field: "stage5o_precommitment_digest" },
          { ref: "runtime_input", field: "epoch_digest" },
          { ref: "runtime_input", field: "closure_slot_id" },
          { ref: "runtime_input", field: "census_closure_digest" },
          { ref: "runtime_input", field: "challenge_policy_digest" },
          { ref: "runtime_input", field: "beacon_contract_digest" },
          { ref: "static_import", id: "simurgh.vsc.anchor_schedule.v1" },
        ],
        source: "section_6_frozen_6.6",
      },
    ],
    // Per-run evidence, resolved from an accepted prior-section context — never authorities.
    runtime_inputs: [
      {
        field: "stage5o_precommitment_digest",
        source: "section6_accepted_context",
        type: "digest_token",
      },
      { field: "epoch_digest", source: "section6_accepted_context", type: "digest_token" },
      { field: "closure_slot_id", source: "section6_accepted_context", type: "digest_token" },
      { field: "census_closure_digest", source: "section6_accepted_context", type: "digest_token" },
      {
        field: "challenge_policy_digest",
        source: "section6_accepted_context",
        type: "digest_token",
      },
      {
        field: "beacon_contract_digest",
        source: "section6_accepted_context",
        type: "digest_token",
      },
    ],
    imports: [{ id: "simurgh.vsc.anchor_schedule.v1" }], // static authorities only (pair 11, a root)
  },
  // Pair 19 — owns beacon-contract SEMANTICS; imports its schema.
  beacon_contract_profile: {
    descriptor_version: "1",
    kind: "profile",
    profile_id: "simurgh.vsc.beacon_contract_profile.v1",
    rules: [
      { rule_id: "beacon_source_identity", value: "simurgh.vsc.beacon.bitcoin_mainnet.v1" },
      { rule_id: "depth_convention", value: "simurgh.bitcoin.depth.descendants_after_beacon.v1" },
      { rule_id: "minimum_lead_blocks", value: 6 },
      { rule_id: "required_descendants", value: 6, plus_one: false },
    ],
    imports: [{ id: "simurgh.vsc.beacon_contract.v1" }],
  },
  // Pair 20 — owns suffix SEMANTICS (not shape, not limits); imports schema + network + pair 23.
  beacon_suffix_profile: {
    descriptor_version: "1",
    kind: "profile",
    profile_id: "simurgh.vsc.beacon_suffix_profile.v1",
    rules: [
      {
        rule_id: "checkpoint_binding",
        left: "beacon_suffix.verified_closure_bitcoin_checkpoint_digest",
        operator: "equals",
        right: "verifier.checkpoint_instance_digest",
      },
      { rule_id: "header_linkage", algorithm: "bitcoin_header_double_sha256_linkage" },
      {
        rule_id: "pow_validation",
        authority_ref: { id: "simurgh.bitcoin.mainnet.header_validation.v1" },
      },
      {
        rule_id: "same_period",
        limit_ref: { id: "simurgh.vsc.challenge_resource_limits_profile.v1" },
      },
    ],
    imports: [
      { id: "simurgh.vsc.beacon_suffix.v1" },
      { id: "simurgh.bitcoin.mainnet.header_validation.v1" },
      { id: "simurgh.vsc.challenge_resource_limits_profile.v1" },
    ],
  },
  // Pair 21 — owns sampler SEMANTICS; imports schema + pair 23.
  ordered_selected_indices_profile: {
    descriptor_version: "1",
    kind: "profile",
    profile_id: "simurgh.vsc.ordered_selected_indices_profile.v1",
    rules: [
      { rule_id: "hkdf_sampler_construction", algorithm: "hkdf_index_sampler" },
      { rule_id: "ordering", value: "strictly_increasing_declared_index" },
      { rule_id: "uniqueness", value: true },
      { rule_id: "universe_relation", operator: "less_than", right: "universe_size" },
      {
        rule_id: "count_ceiling",
        limit_ref: { id: "simurgh.vsc.challenge_resource_limits_profile.v1" },
      },
    ],
    imports: [
      { id: "simurgh.vsc.ordered_selected_indices.v1" },
      { id: "simurgh.vsc.challenge_resource_limits_profile.v1" },
    ],
  },
  // Pair 23 — owns numeric ceilings + the four generator-derived maxima (digest HELD until maxima
  //           regenerate). Imports the source schema digests the maxima derive from.
  challenge_resource_limits_profile: {
    descriptor_version: "1",
    kind: "profile",
    profile_id: "simurgh.vsc.challenge_resource_limits_profile.v1",
    rules: [
      { rule_id: "max_beacon_suffix_headers", value: 2016 },
      { rule_id: "max_selected_indices", value: 65536 },
      { rule_id: "max_challenge_draws", value: 4194304 },
      { rule_id: "max_beacon_suffix_artifact_bytes", value: "<regenerated>" },
      { rule_id: "max_selected_indices_artifact_bytes", value: "<regenerated>" },
      { rule_id: "max_challenge_record_bytes", value: "<regenerated>" },
      // CANONICAL package maximum (generator-derived sum of the three variable artifacts) and the
      // chosen TRANSPORT pre-parse ceiling. beacon_contract has NO separate byte maximum in v1 — it
      // is bounded by its schema, field bounds, and this package aggregate (§7.3.8 item 1).
      { rule_id: "max_challenge_package_canonical_bytes", value: "<regenerated>" },
      { rule_id: "max_challenge_package_transport_bytes", value: 1048576 },
    ],
    imports: [
      { id: "simurgh.vsc.beacon_contract.v1" },
      { id: "simurgh.vsc.beacon_suffix.v1" },
      { id: "simurgh.vsc.ordered_selected_indices.v1" },
      { id: "simurgh.vsc.challenge_record.v1" },
    ],
  },
  // Pair 22 — cross-artifact orchestration. Scalar domains live HERE (not self-referential roots).
  challenge_protocol_profile: {
    descriptor_version: "1",
    kind: "profile",
    profile_id: "simurgh.vsc.challenge_protocol_profile.v1",
    rules: [
      {
        rule_id: "first_failure_order",
        order: [
          "s7_noncanonical_or_oversize",
          "s7_artifact_shape",
          "s7_bytes32_token_grammar",
          "s7_schema_pin_mismatch",
          "s7_checkpoint_not_verifier_derived",
          "s7_chain_invalid",
          "s7_insufficient_descendants",
          "s7_precommitment_binding_mismatch",
          "s7_index_derivation",
          "s7_root_incomplete",
          "s7_seed_binding",
        ],
      },
      {
        // Symbolic CHECK IDs, parallel to first_failure_order (ordinal i -> check_ids[i-1] ->
        // order[i-1]). This table alone assigns ordinals; prose refers to checks by these names,
        // never a bare number, so inserting a check never leaves a stale "check N" behind (§7.3.8 item 3).
        rule_id: "check_identifiers",
        ids: [
          "canonical_input",
          "artifact_shape",
          "token_grammar",
          "authority_pins",
          "checkpoint_derivation",
          "bitcoin_chain",
          "descendant_depth",
          "precommitment_binding",
          "index_replay",
          "root_completeness",
          "seed_binding",
        ],
      },
      {
        rule_id: "checkpoint_instance_digest",
        domain: "simurgh.vsc.verified_closure_bitcoin_checkpoint_digest_domain.v1",
        preimage: [
          "UTF8(domain)",
          "decodeDigestToken(pair18_schema_digest)",
          "UTF8(canonicalJson(context.checkpoint))",
        ],
      },
      {
        rule_id: "challenge_seed",
        construction: "hkdf_extract_sha256", // frozen A25; NOT plain SHA256 (A32 corrected the salt)
        seed_domain: "simurgh.vsc.challenge_seed_digest_domain.v1",
        draw_domain: "simurgh.vsc.challenge_index_draw.v1",
        // salt is pair 22's OWN digest — symbolic self-reference, never an import or a graph edge
        salt: { source: "self_profile_digest" },
        ikm_order_raw32: [
          { ref: "seed_domain_utf8" },
          { ref: "runtime_input", field: "challenge_subject_digest" }, // Section-6-accepted context
          { ref: "verifier_derived", field: "beacon_value" }, // raw block hash (internal order) at precommitted beacon height
        ],
        // per-draw random-access expansion; never one enormous output
        draw: {
          construction: "hkdf_expand_sha256",
          info: "draw_domain_utf8 || u64be(j)",
          length_bytes: 32,
        },
      },
      {
        rule_id: "five_root_completeness",
        roots: [
          "challenge_subject",
          "verified_closure_bitcoin_checkpoint",
          "beacon_contract",
          "beacon_suffix",
          "ordered_selected_indices",
        ],
        each_present_once: true,
        no_cross_wire: true,
      },
      {
        rule_id: "discharge_mapping",
        beacon_chain_roots: [
          "s7_checkpoint_not_verifier_derived",
          "s7_chain_invalid",
          "s7_insufficient_descendants",
        ],
        seed_binds_closure: ["s7_seed_binding"],
      },
    ],
    imports: [
      { id: "simurgh.vsc.anchor_schedule.v1" }, // pair 11
      { id: "simurgh.vsc.challenge_subject.v1" }, // pair 12
      { id: "simurgh.vsc.verified_closure_bitcoin_checkpoint_schema.v1" }, // pair 18
      { id: "simurgh.vsc.beacon_contract_profile.v1" }, // pair 19
      { id: "simurgh.vsc.beacon_suffix_profile.v1" }, // pair 20
      { id: "simurgh.vsc.ordered_selected_indices_profile.v1" }, // pair 21
      { id: "simurgh.vsc.challenge_resource_limits_profile.v1" }, // pair 23
      { id: "simurgh.vsc.challenge_record.v1" }, // challenge-record SCHEMA — direct semantic dependency
      { id: "simurgh.vsc.digest_token_codec.v1" }, // codec authority
    ],
  },
});

// ---- Topological generation order (leaf-first). Pair 23's and pair 22's digests are HELD until the
//      four challenge maxima regenerate against the revised shapes.
export const GENERATION_ORDER = Object.freeze([
  "grammar:digest_token_codec",
  "grammar:bitcoin_header_hex160",
  "grammar:canonical_unsigned_decimal",
  "grammar:lowercase_hex8",
  "profile:bitcoin_mainnet_header_validation",
  "profile:closure_anchor_schedule_profile", // pair 11 (root)
  "profile:challenge_subject_profile", // pair 12
  "schema:verified_closure_bitcoin_checkpoint", // pair 18
  "schema:beacon_contract",
  "schema:beacon_suffix",
  "schema:ordered_selected_indices",
  "schema:challenge_record",
  "profile:challenge_resource_limits_profile", // pair 23 — AFTER maxima regenerate
  "profile:beacon_contract_profile", // pair 19
  "profile:beacon_suffix_profile", // pair 20
  "profile:ordered_selected_indices_profile", // pair 21
  "profile:challenge_protocol_profile", // pair 22 — last
]);
