// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — VSC constants pinned by A27.
//
// Schema IDs are exact ASCII and are MEASUREMENT INPUTS: canonicalJson emits them verbatim, so a
// longer ID is a larger artifact. They must be pinned before the maxima are generated, or the
// ruler moves with the thing it measures. A17/A19 set the precedent -- pinned IDs, exact ASCII,
// with the 2^16-1 bound deliberately unused.

export const STAGE5O_DIGEST_TOKEN_CODEC_ID = "simurgh.vsc.digest_token_codec.v1";

export const SCHEMA_IDS = Object.freeze({
  beacon_contract: "simurgh.vsc.beacon_contract.v1",
  beacon_suffix: "simurgh.vsc.beacon_suffix.v1",
  ordered_selected_indices: "simurgh.vsc.ordered_selected_indices.v1",
  challenge_record: "simurgh.vsc.challenge_record.v1",
});

// Section-7 construction PROFILE ids (A28 pairs 19–22). Distinct literals from the object SCHEMA_IDS
// above under the single-hat constitution (A31); this map MIRRORS the profile_id const_values in
// section7AuthorityDescriptors.mjs, which is the normative source (a census proves the mirror).
export const PROFILE_IDS = Object.freeze({
  beacon_contract: "simurgh.vsc.beacon_contract_profile.v1",
  beacon_suffix: "simurgh.vsc.beacon_suffix_profile.v1",
  ordered_selected_indices: "simurgh.vsc.ordered_selected_indices_profile.v1",
  challenge_protocol: "simurgh.vsc.challenge_protocol_profile.v1",
});

export const BEACON_SOURCE_ID = "simurgh.vsc.beacon.bitcoin_mainnet.v1";
export const BEACON_DEPTH_CONVENTION_ID = "simurgh.bitcoin.depth.descendants_after_beacon.v1";
export const STAGE5L_CHECKPOINT_DEPTH_CONVENTION = "simurgh.bitcoin.depth.inclusive_block_count.v1";

// Campaign policy constants (bound through beacon_contract_digest before the anchor).
export const BEACON_MIN_LEAD_BLOCKS_V1 = 6; // MINIMUM lead, never an exact offset
export const BEACON_REQUIRED_DESCENDANTS_V1 = 6; // descendants AFTER the beacon; never "+1"

// Structural maxima — fixed by rule, not by measurement.
export const MAX_BEACON_SUFFIX_HEADERS_V1 = 2016; // one full difficulty period (same-period rule)
export const MAX_SELECTED_INDICES_V1 = 65536; // MAX_SCOPE_CARDINALITY
export const MAX_CHALLENGE_DRAWS_V1 = 4194304; // 2^22; coupon-collector tail, failure <= 2^-76.33

// Lexical widths.
export const HEADER_HEX_CHARS = 160; // 80 bytes, lowercase hex, no 0x prefix
export const RETARGET_INTERVAL = 2016;
