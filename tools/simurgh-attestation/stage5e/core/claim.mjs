// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — claim integrity (plan Task 7). External-review corrections: load-bearing claims live
// in a closed enum (forbiddenStructuredClaimUnrepresentable); analyst_note is non-load-bearing and the
// denylist is defense-in-depth, not a semantic proof; the equivalence judgement is a SIGNED review
// record, not a boolean; provenance is checked by recipe→digest reproduction, never "digest reproduces
// text" (a digest is one-way).
import { createPublicKey, verify as edVerify } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VDA_STRUCTURED_CLAIM_CODES, VDA_OVERCLAIM_DENYLIST } from "../constants.mjs";

// Free-text screen: any denylist PHRASE (case-insensitive substring). Defense-in-depth only.
export function overclaimScreen(note) {
  if (note == null) return null;
  const lc = String(note).toLowerCase();
  return VDA_OVERCLAIM_DENYLIST.some((p) => lc.includes(p.toLowerCase())) ? 264 : null;
}

// A review record is valid iff its shape is complete, its decision is "equivalent", and its Ed25519
// signature verifies against the externally pinned reviewer key.
export function reviewRecordValid(record, reviewerPubKeyPem) {
  if (!record || typeof record !== "object") return false;
  for (const f of [
    "reviewer_key_id",
    "criteria_version",
    "base_digest",
    "variant_digest",
    "decision",
    "review_signature",
  ])
    if (record[f] == null) return false;
  if (record.decision !== "equivalent") return false;
  try {
    const { review_signature, ...signed } = record;
    return edVerify(
      null,
      Buffer.from(canonicalJson(signed), "utf8"),
      createPublicKey(reviewerPubKeyPem),
      Buffer.from(review_signature, "base64")
    );
  } catch {
    return false;
  }
}

// 264 — forbidden/unrepresentable structured claim, denylist phrase, or an unbacked strong claim.
export function checkClaims(bundle, { reviewerPubKeyPem } = {}) {
  const denied = overclaimScreen(bundle.analyst_note);
  if (denied) return denied;
  // structured claims (if the bundle carries any) must be inside the closed enum.
  for (const c of bundle.structured_claims ?? [])
    if (!VDA_STRUCTURED_CLAIM_CODES.includes(c)) return 264;
  const reviews = new Map((bundle.review_records ?? []).map((r) => [r.digest, r.record ?? r]));
  for (const e of bundle.evasions ?? []) {
    if (e.reviewed_equivalent_inversion === true) {
      if (e.score_inversion !== true) return 264; // strong claim without the mechanical basis
      const rec = reviews.get(e.review_record_digest);
      if (!rec || !reviewRecordValid(rec, reviewerPubKeyPem)) return 264; // a boolean flag is not enough
    }
  }
  return null;
}

// 265 — provenance consistency. score_table + capture-log digests are bound; an optional attester's
// recorded evasion is verified by REPRODUCTION (recipe → generated_text_digest), not by "un-hashing".
export function checkProvenance(bundle) {
  const cp = bundle.capture_provenance;
  if (!cp) return 265;
  if (cp.score_table_digest !== bundle.score_table?.digest) return 265;
  if (typeof cp.capture_log_digest !== "string") return 265;
  const ap = bundle.attester_provenance;
  if (ap) {
    const known = new Set((bundle.evasions ?? []).map((e) => e.generated_text_digest));
    if (!known.has(ap.generated_text_digest)) return 265;
  }
  return null;
}
