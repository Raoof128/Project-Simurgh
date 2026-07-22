// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 — the pure, total, prefix-ordered eleven-check challenge-issuance verifier.
//
// The PUBLIC contract is two arguments: verifySection7Relation(section6AcceptedContext, producerBundle).
// Internally the verifier is constructed through a SEALED seam, makeSection7Verifier({ validateBitcoinSuffix }),
// so the Bitcoin suffix validator can be exercised deterministically in the unit lane while the
// exported production verifier is permanently wired to the real mainnet validator. Ordinary callers
// never supply or select the validator. The seam returns a TYPED VerifiedBitcoinSuffix fact (never a
// boolean, never producer-supplied); it does not decide checks 7-11.
//
// Exactly one symbolic reason is returned — the first check to fail under the frozen §7.2 order.
// No numeric raw code is allocated here (Section 10 owns numbers). evaluateSection7Safe is the
// fail-closed wrapper applied LAST: an unexpected throw becomes RAW_VERIFIER_CODES.INTERNAL_ERROR_
// FAIL_CLOSED (29), never one of the eleven Section 7 reasons.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { decodeDigestToken, encodeDigestToken } from "./digestTokenCodec.mjs";
import { hkdfExtract } from "./hkdf.mjs";
import { deriveChallengeIndices } from "./challengeIndexSampler.mjs";
import { isSection6AcceptedContext } from "./section6AcceptedContext.mjs";
import {
  SCHEMA_IDS,
  PROFILE_IDS,
  BEACON_REQUIRED_DESCENDANTS_V1,
  MAX_CHALLENGE_DRAWS_V1,
  MAX_BEACON_SUFFIX_HEADERS_V1,
  RETARGET_INTERVAL,
} from "./constants.mjs";
import {
  requireCanonicalBytes,
  checkBeaconContractArtifactShape,
  checkBeaconSuffixArtifactShape,
  checkOrderedSelectedIndicesArtifactShape,
  checkChallengeRecordShape,
  checkVerifiedClosureBitcoinCheckpointShape,
} from "./challengeArtifactShape.mjs";
import { PROFILE_DESCRIPTORS, SCHEMA_DESCRIPTORS } from "./section7AuthorityDescriptors.mjs";
import { generateAuthorityRegistry } from "../node/measureStage5oAuthorityRegistry.mjs";
import { validateBitcoinMainnetSuffix } from "./bitcoinMainnetSuffixValidator.mjs";
import { RAW_VERIFIER_CODES } from "../../stage4h/exitCodes.mjs";

// ---- Frozen §7.2 first-failure order (the normative source is pair 22's descriptor rule).
const PAIR22 = PROFILE_DESCRIPTORS.challenge_protocol_profile;
const SEED_RULE = PAIR22.rules.find((r) => r.rule_id === "challenge_seed");
const CHECKPOINT_RULE = PAIR22.rules.find((r) => r.rule_id === "checkpoint_instance_digest");
export const SECTION7_FIRST_FAILURE_ORDER = Object.freeze([
  ...PAIR22.rules.find((r) => r.rule_id === "first_failure_order").order,
]);
const SEED_DOMAIN = SEED_RULE.seed_domain;
const DRAW_DOMAIN = SEED_RULE.draw_domain;
const CHECKPOINT_DOMAIN = CHECKPOINT_RULE.domain;
const PAIR18_ID = SCHEMA_DESCRIPTORS.verified_closure_bitcoin_checkpoint.schema_id;
const PAIR22_ID = PAIR22.profile_id;

// The frozen registry + maxima (deterministic build-time data; only the validator is an injected seam).
const { registry: REGISTRY, maxima: MAXIMA } = generateAuthorityRegistry();

const ARTIFACT_ORDER = Object.freeze([
  "beacon_contract",
  "beacon_suffix",
  "ordered_selected_indices",
  "challenge_record",
]);
const PER_ARTIFACT_CEILING = Object.freeze({
  beacon_suffix: MAXIMA.MAX_BEACON_SUFFIX_ARTIFACT_BYTES_V1,
  ordered_selected_indices: MAXIMA.MAX_SELECTED_INDICES_ARTIFACT_BYTES_V1,
  challenge_record: MAXIMA.MAX_CHALLENGE_RECORD_BYTES_V1,
});
// check 4 pins: idField -> { expectedId, digestField } per artifact.
const PIN_TABLE = Object.freeze({
  beacon_contract: [
    { idField: "schema_id", expectedId: SCHEMA_IDS.beacon_contract, digestField: "schema_digest" },
    {
      idField: "profile_id",
      expectedId: PROFILE_IDS.beacon_contract,
      digestField: "profile_digest",
    },
  ],
  beacon_suffix: [
    { idField: "schema_id", expectedId: SCHEMA_IDS.beacon_suffix, digestField: "schema_digest" },
    { idField: "profile_id", expectedId: PROFILE_IDS.beacon_suffix, digestField: "profile_digest" },
  ],
  ordered_selected_indices: [
    {
      idField: "schema_id",
      expectedId: SCHEMA_IDS.ordered_selected_indices,
      digestField: "schema_digest",
    },
    {
      idField: "profile_id",
      expectedId: PROFILE_IDS.ordered_selected_indices,
      digestField: "profile_digest",
    },
  ],
  challenge_record: [
    { idField: "schema_id", expectedId: SCHEMA_IDS.challenge_record, digestField: "schema_digest" },
    {
      idField: "challenge_protocol_profile_id",
      expectedId: PROFILE_IDS.challenge_protocol,
      digestField: "challenge_protocol_profile_digest",
    },
  ],
});

const REASON = Object.freeze({
  oversize: "s7_noncanonical_or_oversize",
  shape: "s7_artifact_shape",
  token: "s7_bytes32_token_grammar",
  pin: "s7_schema_pin_mismatch",
  checkpoint: "s7_checkpoint_not_verifier_derived",
  chain: "s7_chain_invalid",
  descendants: "s7_insufficient_descendants",
  precommit: "s7_precommitment_binding_mismatch",
  index: "s7_index_derivation",
  root: "s7_root_incomplete",
  seed: "s7_seed_binding",
});

const sha256 = (buf) => createHash("sha256").update(buf).digest();
const digestTokenOf = (obj) => encodeDigestToken(sha256(Buffer.from(canonicalJson(obj), "utf8")));

function checkpointInstanceDigestToken(checkpoint) {
  const pre = Buffer.concat([
    Buffer.from(CHECKPOINT_DOMAIN, "utf8"),
    decodeDigestToken(REGISTRY[PAIR18_ID]), // raw 32 bytes
    Buffer.from(canonicalJson(checkpoint), "utf8"),
  ]);
  return encodeDigestToken(sha256(pre));
}

function expectedChallengeSeedToken(context, beaconValueHex) {
  const salt = decodeDigestToken(REGISTRY[PAIR22_ID]); // pair 22 digest, raw 32
  const ikm = Buffer.concat([
    Buffer.from(SEED_DOMAIN, "utf8"),
    decodeDigestToken(context.challenge_subject_digest),
    Buffer.from(beaconValueHex, "hex"),
  ]);
  return encodeDigestToken(hkdfExtract(salt, ikm));
}

/**
 * Construct the eleven-check relation with an injected Bitcoin suffix validator (the sealed seam).
 * @param {object} deps
 * @param {(input: object) => ({ok:true, value:object} | {ok:false, reason?:string})} deps.validateBitcoinSuffix
 */
export function makeSection7Verifier({ validateBitcoinSuffix }) {
  if (typeof validateBitcoinSuffix !== "function") {
    throw new TypeError("makeSection7Verifier_requires_validateBitcoinSuffix");
  }

  return function verifySection7Relation(section6AcceptedContext, producerBundle) {
    // Precondition (not one of the eleven reasons): only an opaque accepted context is admissible.
    if (!isSection6AcceptedContext(section6AcceptedContext)) {
      throw new Error("section7_unaccepted_context");
    }
    const ctx = section6AcceptedContext;

    // ---- check 1: envelope, canonical bytes, per-artifact + package ceilings.
    if (producerBundle === null || typeof producerBundle !== "object") return rej(REASON.oversize);
    const parsed = {};
    let packageBytes = 0;
    for (const name of ARTIFACT_ORDER) {
      const raw = producerBundle[name];
      let obj;
      try {
        obj = requireCanonicalBytes(raw);
      } catch {
        return rej(REASON.oversize);
      }
      const bytes = Buffer.byteLength(raw, "utf8");
      const ceiling = PER_ARTIFACT_CEILING[name];
      if (ceiling !== undefined) {
        if (bytes > ceiling) return rej(REASON.oversize);
        packageBytes += bytes;
      }
      parsed[name] = obj;
    }
    if (Object.keys(producerBundle).length !== ARTIFACT_ORDER.length) return rej(REASON.oversize);
    if (packageBytes > MAXIMA.MAX_CHALLENGE_PACKAGE_BYTES_V1) return rej(REASON.oversize);

    // ---- check 2: exact-key/type/width shape of the four artifacts + the context checkpoint.
    try {
      checkBeaconContractArtifactShape(parsed.beacon_contract);
      checkBeaconSuffixArtifactShape(parsed.beacon_suffix);
      checkOrderedSelectedIndicesArtifactShape(parsed.ordered_selected_indices, ctx.universe_size);
      checkChallengeRecordShape(parsed.challenge_record);
      checkVerifiedClosureBitcoinCheckpointShape(ctx.checkpoint);
    } catch {
      return rej(REASON.shape);
    }

    // ---- check 3: the §7.3.3 token census — every producer *_digest field + challenge_seed decodes.
    try {
      for (const name of ARTIFACT_ORDER) {
        for (const [k, v] of Object.entries(parsed[name])) {
          if (k.endsWith("_digest")) decodeDigestToken(v);
        }
      }
      decodeDigestToken(parsed.challenge_record.challenge_seed);
    } catch {
      return rej(REASON.token);
    }

    // ---- check 4: schema/profile identity pins + authority-registry digest equality.
    for (const name of ARTIFACT_ORDER) {
      for (const { idField, expectedId, digestField } of PIN_TABLE[name]) {
        if (parsed[name][idField] !== expectedId) return rej(REASON.pin);
        if (parsed[name][digestField] !== REGISTRY[expectedId]) return rej(REASON.pin);
      }
    }

    // ---- check 5: recompute checkpoint_instance_digest from the accepted context; the suffix must
    //      commit to it (not to a producer-constructed checkpoint copy).
    const checkpointToken = checkpointInstanceDigestToken(ctx.checkpoint);
    if (parsed.beacon_suffix.verified_closure_bitcoin_checkpoint_digest !== checkpointToken) {
      return rej(REASON.checkpoint);
    }

    // ---- check 6: Bitcoin suffix linkage, PoW, network, period; derive the beacon fact. The seam
    //      returns a typed VerifiedBitcoinSuffix and NEVER decides checks 7-11.
    let verified;
    {
      const result = validateBitcoinSuffix({
        checkpoint: ctx.checkpoint,
        headers: parsed.beacon_suffix.headers,
        precommittedBeaconHeight: ctx.precommitted_beacon_height,
        expectedNetworkProfileId: ctx.network_profile_id,
        resourceLimits: {
          maxHeaders: MAX_BEACON_SUFFIX_HEADERS_V1,
          retargetInterval: RETARGET_INTERVAL,
        },
      });
      if (!result || result.ok !== true) return rej(REASON.chain);
      verified = result.value;
    }

    // ---- check 7: descendant depth from the VERIFIED heights (no +1, never observed tip).
    const beaconHeight = Number(ctx.precommitted_beacon_height);
    if (Number(verified.beaconHeight) !== beaconHeight) return rej(REASON.descendants);
    if (Number(verified.finalSuffixHeight) - beaconHeight < BEACON_REQUIRED_DESCENDANTS_V1) {
      return rej(REASON.descendants);
    }

    // ---- check 8: the presented policy binds the precommitment (contract, k, height).
    if (digestTokenOf(parsed.beacon_contract) !== ctx.beacon_contract_digest) {
      return rej(REASON.precommit);
    }
    if (parsed.ordered_selected_indices.indices.length !== ctx.k) return rej(REASON.precommit);
    if (parsed.beacon_contract.challenge_height !== ctx.precommitted_beacon_height) {
      return rej(REASON.precommit);
    }

    // ---- check 9: replay the index sampler over the PRESENTED seed; the presented indices must match.
    let replay;
    try {
      replay = deriveChallengeIndices({
        seed: decodeDigestToken(parsed.challenge_record.challenge_seed),
        universeSize: ctx.universe_size,
        k: ctx.k,
        drawCeiling: MAX_CHALLENGE_DRAWS_V1,
        drawDomain: DRAW_DOMAIN,
      });
    } catch {
      return rej(REASON.index);
    }
    const presented = parsed.ordered_selected_indices.indices.map(Number);
    if (!sameNumberList(presented, replay.sortedIndices)) return rej(REASON.index);

    // ---- check 10: the five named root-binding equalities (each present once, none cross-wired).
    const r = parsed.challenge_record;
    const rootOk =
      r.challenge_subject_digest === ctx.challenge_subject_digest &&
      r.verified_closure_bitcoin_checkpoint_digest === checkpointToken &&
      r.beacon_contract_digest === digestTokenOf(parsed.beacon_contract) &&
      r.beacon_suffix_digest === digestTokenOf(parsed.beacon_suffix) &&
      r.ordered_selected_indices_digest === digestTokenOf(parsed.ordered_selected_indices);
    if (!rootOk) return rej(REASON.root);

    // ---- check 11: the expected seed derived from the accepted context + beacon_value equals the
    //      presented challenge_seed.
    if (expectedChallengeSeedToken(ctx, verified.beaconValue) !== r.challenge_seed) {
      return rej(REASON.seed);
    }

    return { accept: true };
  };
}

function rej(reason) {
  return { reject: reason };
}

function sameNumberList(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * The fail-closed wrapper applied LAST. accept/reject pass through unchanged; an UNEXPECTED throw
 * (a caller error such as an unaccepted context, or an implementation fault) becomes raw 29 — never
 * one of the eleven Section 7 reasons.
 */
export function makeEvaluateSection7Safe(verifySection7Relation) {
  return function evaluateSection7Safe(section6AcceptedContext, producerBundle) {
    try {
      return verifySection7Relation(section6AcceptedContext, producerBundle);
    } catch {
      return {
        fail_closed: true,
        raw_code: RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED,
      };
    }
  };
}

// ---- The PRODUCTION verifier: permanently wired to the real mainnet validator. Ordinary callers
//      import THIS (two arguments) and can never select a weaker validator. The factory above exists
//      only for the deterministic Lane A unit suite.
export const verifySection7Relation = makeSection7Verifier({
  validateBitcoinSuffix: validateBitcoinMainnetSuffix,
});
export const evaluateSection7Safe = makeEvaluateSection7Safe(verifySection7Relation);
