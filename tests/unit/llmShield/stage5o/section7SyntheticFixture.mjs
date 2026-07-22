// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 Lane A — the sealed synthetic Bitcoin validator + a valid producer bundle builder.
//
// NOT a test file (no .test suffix), so the runner never executes it directly. The synthetic
// validator accepts EXACTLY one frozen header-vector byte sequence and returns one fixed
// VerifiedBitcoinSuffix; it is NOT claimed to satisfy Bitcoin proof of work — it exists only to prove
// the verifier's ordering and late-check reachability (real PoW is Lane B/C). The builder is an
// INDEPENDENT producer: it re-implements the checkpoint_instance_digest and challenge_seed
// constructions from the spec rather than importing the verifier's internals, so a green S7.1 means
// producer and verifier agree, not that they share a bug.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  encodeDigestToken,
  decodeDigestToken,
} from "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";
import { hkdfExtract } from "../../../../tools/simurgh-attestation/stage5o/core/hkdf.mjs";
import { deriveChallengeIndices } from "../../../../tools/simurgh-attestation/stage5o/core/challengeIndexSampler.mjs";
import { mintSection6AcceptedContext } from "../../../../tools/simurgh-attestation/stage5o/core/section6AcceptedContext.mjs";
import {
  SCHEMA_IDS,
  PROFILE_IDS,
  BEACON_SOURCE_ID,
  BEACON_DEPTH_CONVENTION_ID,
  MAX_CHALLENGE_DRAWS_V1,
} from "../../../../tools/simurgh-attestation/stage5o/core/constants.mjs";
import {
  PROFILE_DESCRIPTORS,
  SCHEMA_DESCRIPTORS,
} from "../../../../tools/simurgh-attestation/stage5o/core/section7AuthorityDescriptors.mjs";
import { generateAuthorityRegistry } from "../../../../tools/simurgh-attestation/stage5o/node/measureStage5oAuthorityRegistry.mjs";

const { registry: REGISTRY } = generateAuthorityRegistry();
const PAIR22 = PROFILE_DESCRIPTORS.challenge_protocol_profile;
const SEED_RULE = PAIR22.rules.find((r) => r.rule_id === "challenge_seed");
const CHECKPOINT_RULE = PAIR22.rules.find((r) => r.rule_id === "checkpoint_instance_digest");
const SEED_DOMAIN = SEED_RULE.seed_domain;
const DRAW_DOMAIN = SEED_RULE.draw_domain;
const CHECKPOINT_DOMAIN = CHECKPOINT_RULE.domain;
const PAIR18_ID = SCHEMA_DESCRIPTORS.verified_closure_bitcoin_checkpoint.schema_id;
const PAIR22_ID = PAIR22.profile_id;
const MAINNET = "simurgh.bitcoin.mainnet.header_validation.v1";

const sha256 = (buf) => createHash("sha256").update(buf).digest();
const digestTokenOf = (obj) => encodeDigestToken(sha256(Buffer.from(canonicalJson(obj), "utf8")));
const tok = (fill) => encodeDigestToken(Buffer.alloc(32, fill));

// One frozen synthetic suffix: seven distinct valid 160-hex headers. NOT real PoW.
export const FROZEN_HEADERS = Object.freeze(
  Array.from({ length: 7 }, (_, i) => i.toString(16).padStart(160, "0"))
);
const FROZEN_SUFFIX_BYTES = canonicalJson([...FROZEN_HEADERS]);

// The one fixed verifier-fact the synthetic validator returns for the frozen bytes.
const BEACON_HEIGHT = 850000;
export const VERIFIED_FACT = Object.freeze({
  checkpointBlockHash: "aa".repeat(32),
  beaconValue: "bc".repeat(32), // raw block hash (internal order), 64 hex
  beaconHeight: BEACON_HEIGHT,
  finalSuffixHeight: BEACON_HEIGHT + 6, // depth 6 == BEACON_REQUIRED_DESCENDANTS_V1
  validatedHeaderCount: FROZEN_HEADERS.length,
  networkProfileId: MAINNET,
});

/**
 * A sealed synthetic validator that accepts EXACTLY the frozen bytes and returns one fixed fact.
 * It ignores fixture identity. A depth-underflow row uses a validator built with a shorter fact.
 */
export function makeSyntheticValidator(fact = VERIFIED_FACT) {
  return function validateSyntheticBitcoinSuffix(input) {
    if (canonicalJson(input.headers) !== FROZEN_SUFFIX_BYTES) {
      return { ok: false, reason: "synthetic_suffix_mismatch" };
    }
    return { ok: true, value: fact };
  };
}
export const validateSyntheticBitcoinSuffix = makeSyntheticValidator();

function checkpointInstanceToken(checkpoint) {
  const pre = Buffer.concat([
    Buffer.from(CHECKPOINT_DOMAIN, "utf8"),
    decodeDigestToken(REGISTRY[PAIR18_ID]),
    Buffer.from(canonicalJson(checkpoint), "utf8"),
  ]);
  return encodeDigestToken(sha256(pre));
}

function challengeSeedToken(challengeSubjectDigest, beaconValueHex) {
  const ikm = Buffer.concat([
    Buffer.from(SEED_DOMAIN, "utf8"),
    decodeDigestToken(challengeSubjectDigest),
    Buffer.from(beaconValueHex, "hex"),
  ]);
  return encodeDigestToken(hkdfExtract(decodeDigestToken(REGISTRY[PAIR22_ID]), ikm));
}

/**
 * Build a valid producer bundle + accepted context that passes all eleven checks under the synthetic
 * validator. Returns raw canonical strings (the bundle Section 7 consumes) plus the parsed parts.
 */
export function buildValidSection7Case({ k = 8, universeSize = 256, forgedSeedToken } = {}) {
  const challengeSubjectDigest = tok(0x5c);
  const beaconContract = {
    schema_id: SCHEMA_IDS.beacon_contract,
    schema_digest: REGISTRY[SCHEMA_IDS.beacon_contract],
    profile_id: PROFILE_IDS.beacon_contract,
    profile_digest: REGISTRY[PROFILE_IDS.beacon_contract],
    beacon_source_id: BEACON_SOURCE_ID,
    depth_convention_id: BEACON_DEPTH_CONVENTION_ID,
    challenge_height: String(BEACON_HEIGHT),
  };
  const checkpoint = {
    network_profile_id: MAINNET,
    checkpoint_height: String(BEACON_HEIGHT - 10),
    checkpoint_block_hash: tok(0xc1),
    checkpoint_header: "c".repeat(160),
    checkpoint_nbits: "1a2b3c4d",
    checkpoint_witness_profile_id: "simurgh.vsc.checkpoint_witness.v1",
    checkpoint_witness_profile_digest: tok(0xc2),
    checkpoint_witness_key_fingerprint: tok(0xc3),
    stage5l_checkpoint_evidence_digest: tok(0xc4),
  };
  const beaconSuffix = {
    schema_id: SCHEMA_IDS.beacon_suffix,
    schema_digest: REGISTRY[SCHEMA_IDS.beacon_suffix],
    profile_id: PROFILE_IDS.beacon_suffix,
    profile_digest: REGISTRY[PROFILE_IDS.beacon_suffix],
    verified_closure_bitcoin_checkpoint_digest: checkpointInstanceToken(checkpoint),
    headers: [...FROZEN_HEADERS],
  };
  const context = mintSection6AcceptedContext({
    challenge_subject_digest: challengeSubjectDigest,
    anchor_schedule_profile_digest: tok(0xa5),
    network_profile_id: MAINNET,
    precommitted_beacon_height: String(BEACON_HEIGHT),
    beacon_contract_digest: digestTokenOf(beaconContract),
    challenge_policy_digest: tok(0xb0),
    k,
    universe_size: universeSize,
    checkpoint,
  });
  // A forged-seed case regenerates its indices from the FORGED seed, so checks 1-10 stay internally
  // consistent and only check 11 (expected != forged) fails.
  const seedToken =
    forgedSeedToken ?? challengeSeedToken(challengeSubjectDigest, VERIFIED_FACT.beaconValue);
  const seedRaw = decodeDigestToken(seedToken);
  const { sortedIndices } = deriveChallengeIndices({
    seed: seedRaw,
    universeSize,
    k,
    drawCeiling: MAX_CHALLENGE_DRAWS_V1,
    drawDomain: DRAW_DOMAIN,
  });
  const orderedIndices = {
    schema_id: SCHEMA_IDS.ordered_selected_indices,
    schema_digest: REGISTRY[SCHEMA_IDS.ordered_selected_indices],
    profile_id: PROFILE_IDS.ordered_selected_indices,
    profile_digest: REGISTRY[PROFILE_IDS.ordered_selected_indices],
    indices: sortedIndices.map(String),
  };
  const record = {
    schema_id: SCHEMA_IDS.challenge_record,
    schema_digest: REGISTRY[SCHEMA_IDS.challenge_record],
    challenge_protocol_profile_id: PROFILE_IDS.challenge_protocol,
    challenge_protocol_profile_digest: REGISTRY[PAIR22_ID],
    challenge_seed: seedToken,
    challenge_subject_digest: challengeSubjectDigest,
    verified_closure_bitcoin_checkpoint_digest: checkpointInstanceToken(checkpoint),
    beacon_contract_digest: digestTokenOf(beaconContract),
    beacon_suffix_digest: digestTokenOf(beaconSuffix),
    ordered_selected_indices_digest: digestTokenOf(orderedIndices),
  };
  const parts = { beaconContract, checkpoint, beaconSuffix, orderedIndices, record };
  const bundle = bundleOf(parts);
  return { context, bundle, parts, registry: REGISTRY, seedToken };
}

/** Serialise the parsed parts back into the raw-canonical-string bundle Section 7 consumes. */
export function bundleOf(parts) {
  return {
    beacon_contract: canonicalJson(parts.beaconContract),
    beacon_suffix: canonicalJson(parts.beaconSuffix),
    ordered_selected_indices: canonicalJson(parts.orderedIndices),
    challenge_record: canonicalJson(parts.record),
  };
}

export { digestTokenOf, checkpointInstanceToken, tok, REGISTRY };
