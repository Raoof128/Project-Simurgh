// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.1 — the opaque Section6AcceptedContext capability.
//
// Section 7 trusts a context because it descends from a successful Section 6 acceptance, not because
// it has a particular shape. Opacity is enforced by a MODULE-PRIVATE WeakSet: only objects minted
// here are members, so a raw object, a JSON round-trip, a spread copy, or a hand-built lookalike is
// rejected by isSection6AcceptedContext even if every field matches. The mint validates and deep-
// freezes the bound values; the eventual Section 6 verifier calls it, and tests call it to obtain a
// real context, but a producer never can.
import { decodeDigestToken } from "./digestTokenCodec.mjs";

const MINTED = new WeakSet();

const BITCOIN_MAINNET_PROFILE_ID = "simurgh.bitcoin.mainnet.header_validation.v1";
const CANONICAL_DECIMAL_RE = /^(0|[1-9][0-9]*)$/;

// The exact bound fields (§7.1). Every *_digest is a codec token; k is a positive integer; the
// height is a canonical decimal; the checkpoint is stored opaquely (its shape/digest are re-checked
// by Section 7 checks 2 and 5, never trusted from the context alone).
const CONTEXT_KEYS = Object.freeze([
  "challenge_subject_digest",
  "anchor_schedule_profile_digest",
  "network_profile_id",
  "precommitted_beacon_height",
  "beacon_contract_digest",
  "challenge_policy_digest",
  "k",
  "checkpoint",
]);

const TOKEN_FIELDS = Object.freeze([
  "challenge_subject_digest",
  "anchor_schedule_profile_digest",
  "beacon_contract_digest",
  "challenge_policy_digest",
]);

function requireExactKeys(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    throw new TypeError("accepted_context_not_an_object");
  }
  const got = Object.keys(obj).sort();
  const want = [...CONTEXT_KEYS].sort();
  if (got.length !== want.length || got.some((k, i) => k !== want[i])) {
    throw new Error("accepted_context_exact_key_schema");
  }
}

/**
 * Mint a branded, frozen Section6AcceptedContext from validated fields. The ONLY constructor; the
 * WeakSet membership it confers cannot be reproduced by copying or reshaping the object.
 */
export function mintSection6AcceptedContext(fields) {
  requireExactKeys(fields);
  for (const f of TOKEN_FIELDS) decodeDigestToken(fields[f]); // throws on a malformed token
  if (fields.network_profile_id !== BITCOIN_MAINNET_PROFILE_ID) {
    throw new Error("accepted_context_network_profile_id");
  }
  if (
    typeof fields.precommitted_beacon_height !== "string" ||
    !CANONICAL_DECIMAL_RE.test(fields.precommitted_beacon_height) ||
    !Number.isSafeInteger(Number(fields.precommitted_beacon_height))
  ) {
    throw new Error("accepted_context_beacon_height");
  }
  if (!Number.isSafeInteger(fields.k) || fields.k < 1) {
    throw new Error("accepted_context_k");
  }
  if (fields.checkpoint === null || typeof fields.checkpoint !== "object") {
    throw new TypeError("accepted_context_checkpoint_not_an_object");
  }
  const ctx = Object.freeze({
    challenge_subject_digest: fields.challenge_subject_digest,
    anchor_schedule_profile_digest: fields.anchor_schedule_profile_digest,
    network_profile_id: fields.network_profile_id,
    precommitted_beacon_height: fields.precommitted_beacon_height,
    beacon_contract_digest: fields.beacon_contract_digest,
    challenge_policy_digest: fields.challenge_policy_digest,
    k: fields.k,
    checkpoint: Object.freeze({ ...fields.checkpoint }),
  });
  MINTED.add(ctx);
  return ctx;
}

/** True only for objects produced by mintSection6AcceptedContext in THIS module instance. */
export function isSection6AcceptedContext(x) {
  return x !== null && typeof x === "object" && MINTED.has(x);
}
