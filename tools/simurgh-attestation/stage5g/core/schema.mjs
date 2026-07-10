// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC schema check (raw 283). Recursive exact-key validation + embedded-trust-root rejection
// + anchor-evidence presence rule. The external trusted root is NEVER read from the bundle.
import { CODES } from "../constants.mjs";

const R = CODES.VFC_SCHEMA_INVALID;
const TRUST_ROOT_KEYS = new Set([
  "trusted_root",
  "fulcio_root",
  "rekor_root",
  "trust_root",
  "root_allowlist",
]);

const ALLOWED = {
  top: new Set([
    "schema",
    "challenge_receipt",
    "producer_transcript",
    "verifier_identity",
    "producer_identity",
    "capture",
    "panel_plan_ref",
    "corpus_ref",
    "detector_snapshot_ref",
    "capture_census_digest",
    "anchor_evidence",
    "separation_claim",
    "attestation_signature",
  ]),
  identity: new Set([
    "identity_subject",
    "public_key_pem",
    "key_fingerprint",
    "anchor_type",
    "anchor_subject",
  ]),
  ref: new Set(["path", "digest"]),
  capture: new Set([
    "schema",
    "producer_identity_ref",
    "detector_snapshot_digest",
    "corpus_digest",
    "cells",
  ]),
  challenge_receipt: new Set([
    "schema",
    "content",
    "challenge_record_digest",
    "verifier_signature",
  ]),
  producer_transcript: new Set(["schema", "content", "producer_signature"]),
};

function unknownKey(obj, allowed) {
  if (!obj || typeof obj !== "object") return true;
  return Object.keys(obj).some((k) => !allowed.has(k));
}

// Deep scan: any key that looks like an embedded trusted root is forbidden anywhere in the bundle.
function hasEmbeddedTrustRoot(node) {
  if (Array.isArray(node)) return node.some(hasEmbeddedTrustRoot);
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      if (TRUST_ROOT_KEYS.has(k)) return true;
      if (hasEmbeddedTrustRoot(node[k])) return true;
    }
  }
  return false;
}

export function checkSchema(bundle) {
  if (!bundle || typeof bundle !== "object") return R;
  if (hasEmbeddedTrustRoot(bundle)) return R;
  if (unknownKey(bundle, ALLOWED.top)) return R;

  const required = [
    "schema",
    "producer_transcript",
    "verifier_identity",
    "producer_identity",
    "capture",
    "panel_plan_ref",
    "corpus_ref",
    "detector_snapshot_ref",
    "capture_census_digest",
    "separation_claim",
    "attestation_signature",
  ];
  for (const k of required) if (bundle[k] === undefined) return R;

  for (const id of [bundle.verifier_identity, bundle.producer_identity]) {
    if (unknownKey(id, ALLOWED.identity)) return R;
    for (const k of ALLOWED.identity) if (id[k] === undefined) return R;
  }
  for (const ref of [bundle.panel_plan_ref, bundle.corpus_ref, bundle.detector_snapshot_ref]) {
    if (unknownKey(ref, ALLOWED.ref)) return R;
  }
  if (unknownKey(bundle.capture, ALLOWED.capture)) return R;
  if (!Array.isArray(bundle.capture.cells) || bundle.capture.cells.length === 0) return R;
  if (unknownKey(bundle.producer_transcript, ALLOWED.producer_transcript)) return R;
  if (bundle.challenge_receipt && unknownKey(bundle.challenge_receipt, ALLOWED.challenge_receipt))
    return R;
  if (!bundle.separation_claim || typeof bundle.separation_claim.claimed_rung !== "string")
    return R;

  // Anchor evidence is PRESENCE-driven, not claim-driven: anchor absent ⇒ anchor_evidence_digest absent
  // (never null); anchor present ⇒ digest required.
  const digestPresent = Object.prototype.hasOwnProperty.call(
    bundle.producer_transcript.content ?? {},
    "anchor_evidence_digest"
  );
  if (bundle.anchor_evidence === undefined && digestPresent) return R;
  if (bundle.anchor_evidence !== undefined && !digestPresent) return R;

  return null;
}
