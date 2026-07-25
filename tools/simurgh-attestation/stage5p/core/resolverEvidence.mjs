// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §2.11 — the resolver evidence envelope.
//
// The claim is a DISCRIMINATED UNION and the inactive alternative must be ABSENT, not null. A null
// key is a statement ("there is no delegation"); an absent key is silence. Only silence is
// unambiguous, and 5O §9 froze the same rule for its probability basis.
//
// Replay identity deliberately EXCLUDES profile_id and asserted_strength_delta. That exclusion is
// the whole mechanism behind S2.C4: an attacker re-presenting the same evidence under a stronger
// profile produces the SAME replay identity, so the upgrade attempt stays visible. Include the
// profile and the attack renames itself into invisibility.
//
// B11: signature bytes are carried, never verified here — trust decisions are adapter work.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { makeStrength } from "./identityLattice.mjs";
import { makePrincipal, isCanonicalNamespaceId } from "./canonicalPrincipal.mjs";

export const RESOLVER_EVIDENCE_TYPE = "simurgh.vsi.resolver_evidence.v1";
export const REPLAY_DOMAIN = "simurgh.vsi.replay.v1";
export const CLAIM_ALTERNATIVES = Object.freeze(["principal", "delegation"]);

const EVIDENCE_KEYS = Object.freeze([
  "type",
  "profile_id",
  "claim",
  "asserted_strength_delta",
  "evidence_digest",
  "submission_digest_binding",
  "signature",
]);

const HEX64_RE = /^[0-9a-f]{64}$/;
const SIG_RE = /^([0-9a-f]{2})+$/;

const isPlainObject = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

// The delegation alternative is validated structurally here; its full §2.5 grammar is owned by
// delegationEdge.mjs and applied by the verifier, so this module never duplicates that rule.
function validateClaim(claim) {
  if (!isPlainObject(claim)) throw new TypeError("resolver evidence: claim must be an object");
  const keys = Object.keys(claim);
  for (const k of keys) {
    if (!CLAIM_ALTERNATIVES.includes(k))
      throw new TypeError(`resolver evidence: unknown claim alternative "${k}"`);
  }
  // An explicitly-null inactive alternative is a statement, not silence — reject before counting.
  for (const k of keys) {
    if (claim[k] === null) {
      throw new TypeError(
        `resolver evidence: inactive claim alternative "${k}" must be ABSENT, not null — ` +
          "a null key is a statement, an absent key is silence"
      );
    }
  }
  if (keys.length !== 1) {
    throw new TypeError("resolver evidence: claim must carry exactly one alternative");
  }
  if (keys[0] === "principal") return { principal: makePrincipal(claim.principal) };
  if (!isPlainObject(claim.delegation)) {
    throw new TypeError("resolver evidence: delegation claim must be an object");
  }
  return { delegation: claim.delegation };
}

export function makeResolverEvidence(value) {
  if (!isPlainObject(value)) {
    throw new TypeError(
      "resolver evidence: expected a plain object with exactly the seven canonical keys"
    );
  }
  for (const key of Object.keys(value)) {
    if (!EVIDENCE_KEYS.includes(key))
      throw new TypeError(`resolver evidence: unknown key "${key}"`);
  }
  for (const key of EVIDENCE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new TypeError(`resolver evidence: missing key "${key}"`);
    }
  }
  if (value.type !== RESOLVER_EVIDENCE_TYPE) {
    throw new TypeError(`resolver evidence: type must be exactly "${RESOLVER_EVIDENCE_TYPE}"`);
  }
  if (!isCanonicalNamespaceId(value.profile_id)) {
    throw new TypeError(
      "resolver evidence: profile_id must be a lowercase ASCII canonical identifier"
    );
  }
  const claim = validateClaim(value.claim);

  if (!isPlainObject(value.asserted_strength_delta)) {
    throw new TypeError(
      "resolver evidence: asserted_strength_delta must be a complete four-axis vector"
    );
  }
  // A CLAIM, never a grant — the verifier decides what the ceiling actually permits.
  const asserted = makeStrength(value.asserted_strength_delta);

  if (typeof value.evidence_digest !== "string" || !HEX64_RE.test(value.evidence_digest)) {
    throw new TypeError(
      "resolver evidence: evidence_digest must be exactly 64 lowercase hex characters"
    );
  }
  if (
    typeof value.submission_digest_binding !== "string" ||
    !HEX64_RE.test(value.submission_digest_binding)
  ) {
    throw new TypeError(
      "resolver evidence: submission_digest_binding must be exactly 64 lowercase hex characters"
    );
  }
  if (
    typeof value.signature !== "string" ||
    value.signature.length === 0 ||
    !SIG_RE.test(value.signature)
  ) {
    throw new TypeError(
      "resolver evidence: signature must be non-empty lowercase hex of even length"
    );
  }

  return Object.freeze({
    type: value.type,
    profile_id: value.profile_id,
    claim: Object.freeze(claim),
    asserted_strength_delta: asserted,
    evidence_digest: value.evidence_digest,
    submission_digest_binding: value.submission_digest_binding,
    signature: value.signature,
  });
}

/** Canonical bytes of the whole envelope (includes profile_id — this is NOT the replay identity). */
export function evidenceCanonicalBytes(evidence) {
  return Buffer.from(canonicalJson(makeResolverEvidence(evidence)), "utf8");
}

/**
 * replay_identity = SHA256( REPLAY_DOMAIN || 0x00 || evidence_digest || 0x00 ||
 *                           submission_digest_binding || 0x00 || canonical_json(claim) )
 *
 * profile_id and asserted_strength_delta are EXCLUDED on purpose. Two envelopes over the same
 * underlying evidence share this identity even when one is dressed in a stronger profile.
 */
export function evidenceReplayIdentity(evidence) {
  const e = makeResolverEvidence(evidence);
  const NUL = Buffer.from([0x00]);
  return createHash("sha256")
    .update(Buffer.from(REPLAY_DOMAIN, "utf8"))
    .update(NUL)
    .update(Buffer.from(e.evidence_digest, "utf8"))
    .update(NUL)
    .update(Buffer.from(e.submission_digest_binding, "utf8"))
    .update(NUL)
    .update(Buffer.from(canonicalJson(e.claim), "utf8"))
    .digest("hex");
}
