// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.5 — the pure, total, prefix-ordered opening verifier. Given a Section7AcceptedContext
// (the §7-verified challenge + the §8-authenticated committed universe) and a producer opening
// package, it verifies selective case openings, Merkle membership, the case-link against the public
// execution census, the precommitted resource limits, presented-history validity, and the cumulative
// unique-index disclosure budget ("No Unbudgeted Unzip"). Exactly one symbolic first-failure reason;
// numeric codes are Section 10's. evaluateSection8Safe is the fail-closed wrapper (raw 29).
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { decodeDigestToken, encodeDigestToken } from "./digestTokenCodec.mjs";
import { requireCanonicalBytes } from "./challengeArtifactShape.mjs";
import { caseDigest, leafId, caseLinkCommitment } from "./leafConstruction.mjs";
import { verifyInclusion } from "./merkleTree.mjs";
import { disclosurePolicyDigest } from "./disclosurePolicy.mjs";
import { isSection7AcceptedContext } from "./acceptSection7ForSection8.mjs";
import { RAW_VERIFIER_CODES } from "../../stage4h/exitCodes.mjs";

export const SECTION8_FIRST_FAILURE_ORDER = Object.freeze([
  "s8_opening_package_oversize",
  "s8_noncanonical",
  "s8_resource_limit",
  "s8_opening_shape",
  "s8_bytes32_token_grammar",
  "s8_disclosure_policy_binding",
  "s8_indices_mismatch",
  "s8_case_link_invalid",
  "s8_merkle_inclusion_invalid",
  "s8_presented_history_invalid",
  "s8_budget_exhausted",
]);
export const SECTION8_CHECK_IDS = Object.freeze([
  "opening_transport",
  "opening_canonical",
  "resource_limit",
  "opening_shape",
  "token_grammar",
  "disclosure_policy_binding",
  "indices_match",
  "case_link",
  "merkle_inclusion",
  "history_validity",
  "budget_transition",
]);

const R = SECTION8_FIRST_FAILURE_ORDER;
const rej = (reason) => ({ reject: reason });
const DECIMAL = /^(0|[1-9][0-9]*)$/;

const exactKeys = (o, keys) =>
  o !== null &&
  typeof o === "object" &&
  !Array.isArray(o) &&
  Object.keys(o).length === keys.length &&
  keys.every((k) => Object.prototype.hasOwnProperty.call(o, k));

const OPENING_BUNDLE_KEYS = [
  "schema_id",
  "challenge_record_digest",
  "openings",
  "presented_history",
];
const OPENING_KEYS = ["index", "salt", "case", "auth_path"];
const AUTH_STEP_KEYS = ["sibling", "side"];
const HISTORY_KEYS = ["challenge_record_digest", "disclosed_indices"];

export function verifySection8Relation(section7AcceptedContext, openingPackageRaw) {
  if (!isSection7AcceptedContext(section7AcceptedContext)) {
    throw new Error("section8_unaccepted_context");
  }
  const ctx = section7AcceptedContext;
  const dp = ctx.disclosure_policy;

  // ---- check 1: raw opening-package transport ceiling (before parsing).
  if (typeof openingPackageRaw !== "string") return rej(R[0]);
  if (Buffer.byteLength(openingPackageRaw, "utf8") > dp.max_opening_package_transport_bytes) {
    return rej(R[0]);
  }

  // ---- check 2: lexical parse + canonical-byte equality.
  let pkg;
  try {
    pkg = requireCanonicalBytes(openingPackageRaw);
  } catch {
    return rej(R[1]);
  }

  // ---- check 3: canonical opening-package + presented-history resource ceilings.
  if (Buffer.byteLength(openingPackageRaw, "utf8") > dp.max_opening_package_canonical_bytes) {
    return rej(R[2]);
  }
  if (!Array.isArray(pkg.presented_history)) return rej(R[3]); // shape peek needed for the ceiling
  if (pkg.presented_history.length > dp.max_presented_history_entries) return rej(R[2]);
  if (
    Buffer.byteLength(canonicalJson(pkg.presented_history), "utf8") >
    dp.max_presented_history_canonical_bytes
  ) {
    return rej(R[2]);
  }

  // ---- check 4: exact-key shape of the bundle, each opening, each auth step, each history entry.
  if (!exactKeys(pkg, OPENING_BUNDLE_KEYS)) return rej(R[3]);
  if (pkg.schema_id !== "simurgh.vsc.opening_bundle.v1") return rej(R[3]);
  if (!Array.isArray(pkg.openings) || pkg.openings.length < 1) return rej(R[3]);
  for (const o of pkg.openings) {
    if (!exactKeys(o, OPENING_KEYS)) return rej(R[3]);
    if (typeof o.index !== "string" || !DECIMAL.test(o.index)) return rej(R[3]);
    if (typeof o.salt !== "string" || o.salt.length !== 64) return rej(R[3]);
    if (o.case === null || typeof o.case !== "object") return rej(R[3]);
    if (!Array.isArray(o.auth_path)) return rej(R[3]);
    for (const s of o.auth_path) {
      if (!exactKeys(s, AUTH_STEP_KEYS)) return rej(R[3]);
      if (typeof s.sibling !== "string" || s.sibling.length !== 64) return rej(R[3]);
      if (s.side !== "left" && s.side !== "right") return rej(R[3]);
    }
  }
  for (const h of pkg.presented_history) {
    if (!exactKeys(h, HISTORY_KEYS)) return rej(R[3]);
    if (typeof h.challenge_record_digest !== "string" || h.challenge_record_digest.length !== 64) {
      return rej(R[3]);
    }
    if (!Array.isArray(h.disclosed_indices)) return rej(R[3]);
  }

  // ---- check 5: 32-byte token grammar over every token.
  try {
    decodeDigestToken(pkg.challenge_record_digest);
    for (const o of pkg.openings) {
      decodeDigestToken(o.salt);
      for (const s of o.auth_path) decodeDigestToken(s.sibling);
    }
    for (const h of pkg.presented_history) decodeDigestToken(h.challenge_record_digest);
  } catch {
    return rej(R[4]);
  }

  // ---- check 6: disclosure-policy authority + precommitment binding + challenge binding.
  if (disclosurePolicyDigest(dp) !== ctx.precommitted_disclosure_policy_digest) return rej(R[5]);
  if (pkg.challenge_record_digest !== ctx.challenge_record_digest) return rej(R[5]);

  // ---- check 7: opening indices exactly equal the §7 selection.
  const openedIndices = pkg.openings.map((o) => Number(o.index));
  for (const i of openedIndices) if (!(i >= 0 && i < ctx.N)) return rej(R[6]);
  const openedSet = new Set(openedIndices);
  if (openedSet.size !== openedIndices.length) return rej(R[6]); // duplicate index
  const selected = new Set(ctx.ordered_selected_indices);
  if (openedSet.size !== selected.size || [...openedSet].some((i) => !selected.has(i))) {
    return rej(R[6]);
  }

  // ---- check 8: case/leaf preimage + case-link against the public census; §3.6 salt no-duplicate.
  const epochRaw = decodeDigestToken(ctx.epoch_digest);
  const seenSalts = new Set();
  const leaves = new Map(); // index -> leaf_id Buffer, for check 9
  for (const o of pkg.openings) {
    const i = Number(o.index);
    const E = ctx.execution_census[o.index];
    if (!E) return rej(R[7]); // no census row for an opened index
    if (seenSalts.has(o.salt)) return rej(R[7]); // duplicate salt among openings (§3.6)
    seenSalts.add(o.salt);
    const cd = caseDigest(Buffer.from(canonicalJson(o.case), "utf8"));
    const link = encodeDigestToken(
      caseLinkCommitment(cd, decodeDigestToken(E.execution_record_digest))
    );
    if (link !== E.case_link_commitment) return rej(R[7]);
    leaves.set(i, leafId(epochRaw, i, decodeDigestToken(o.salt), cd));
  }

  // ---- check 9: Merkle inclusion at the verifier-known position and root.
  const rootRaw = decodeDigestToken(ctx.merkle_root);
  for (const o of pkg.openings) {
    const i = Number(o.index);
    const path = o.auth_path.map((s) => ({ sibling: decodeDigestToken(s.sibling), side: s.side }));
    if (!verifyInclusion(leaves.get(i), path, rootRaw)) return rej(R[8]);
  }

  // ---- check 10: presented-history validity + one-challenge-per-epoch (no re-audit of this challenge).
  const seenChallenges = new Set();
  for (const h of pkg.presented_history) {
    if (h.challenge_record_digest === ctx.challenge_record_digest) return rej(R[9]); // re-audit (T6.4)
    if (seenChallenges.has(h.challenge_record_digest)) return rej(R[9]); // duplicate history entry
    seenChallenges.add(h.challenge_record_digest);
    for (const s of h.disclosed_indices) {
      if (typeof s !== "string" || !DECIMAL.test(s)) return rej(R[9]);
      const v = Number(s);
      if (!(v >= 0 && v < ctx.N)) return rej(R[9]);
    }
  }

  // ---- check 11: cumulative unique-index budget transition ( |D_prior ∪ current| <= B ).
  const D = new Set();
  for (const h of pkg.presented_history) for (const s of h.disclosed_indices) D.add(Number(s));
  for (const i of openedIndices) D.add(i);
  if (D.size > dp.max_cumulative_disclosed_indices) return rej(R[10]);

  return { accept: true };
}

export function makeEvaluateSection8Safe(verify) {
  return function evaluateSection8Safe(section7AcceptedContext, openingPackageRaw) {
    try {
      return verify(section7AcceptedContext, openingPackageRaw);
    } catch {
      return { fail_closed: true, raw_code: RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED };
    }
  };
}
export const evaluateSection8Safe = makeEvaluateSection8Safe(verifySection8Relation);
