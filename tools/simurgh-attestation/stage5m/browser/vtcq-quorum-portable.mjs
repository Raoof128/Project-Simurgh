// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — browser-portable tier: the SAME pure-core verdict (385-394 over injected facts) as Node/Python,
// plus WebCrypto Ed25519 verification of the PUBLIC adapter attestation. Dependency-free (WebCrypto only).
// Signed non-claim: the browser verifier does NOT execute RFC-3161/OpenTimestamps/Bitcoin-header/Rekor
// inclusion cryptography — it authenticates the adapter attestation over the evidence, not the tokens.
import { canonicalJson } from "./canonical-json.mjs";

export const BROWSER_NON_CLAIM =
  "browser verifies the adapter attestation only; it does not execute RFC-3161/OTS/Bitcoin/Rekor cryptography";

const INCLUSION_DETAILS = new Set([
  "inclusion_path_length_invalid",
  "inclusion_hash_malformed",
  "inclusion_root_mismatch",
  "log_index_out_of_range",
  "tree_size_invalid",
]);
const CHECKPOINT_DETAILS = new Set([
  "checkpoint_root_mismatch",
  "checkpoint_tree_size_mismatch",
  "checkpoint_signature_invalid",
  "checkpoint_note_malformed",
  "checkpoint_log_key_unpinned",
  "checkpoint_log_identity_mismatch",
]);
const SUBMITTER_DETAILS = new Set([
  "submitter_signature_invalid",
  "submitter_public_key_malformed",
  "submitter_key_algorithm_mismatch",
  "submitter_key_fingerprint_mismatch",
  "expected_submitter_key_binding_failed",
]);
const bounded = (s, v) => (s.has(v) ? v : "unknown");

export function extensionVerdict(f) {
  if (f.seat_present !== false) {
    const rk = f.rekor;
    if (!rk || rk.kind !== "hashedrekord") return { raw: 385 };
    if (rk.artifact_hash !== f.anchor_sha256) return { raw: 386 };
    if (f.inclusion_ok === false)
      return { raw: 387, detail: bounded(INCLUSION_DETAILS, f.inclusion_reason) };
    if (f.checkpoint_ok === false)
      return { raw: 388, detail: bounded(CHECKPOINT_DETAILS, f.checkpoint_reason) };
    if (f.set_ok === false) return { raw: 389 };
    if (f.submitter_ok === false)
      return { raw: 390, detail: bounded(SUBMITTER_DETAILS, f.submitter_reason) };
    if (f.entry_submitter_fpr !== f.expected_submitter_fpr)
      return { raw: 390, detail: "submitter_key_fingerprint_mismatch" };
  }
  if (
    f.anchor_decoded !== f.commitment ||
    f.tsa_imprint !== f.commitment ||
    f.ots_leaf !== f.commitment
  )
    return { raw: 391 };
  if (f.seat_present && f.rekor_artifact_hash !== f.anchor_sha256) return { raw: 391 };
  const classes = f.present_valid_ecology_classes || [];
  if (new Set(classes).size < classes.length) return { raw: 392 };
  const confirmed = f.seat_present && new Set(classes).size === 3;
  if (!confirmed)
    return f.declared_externally_anchored
      ? { raw: 394, outcome_class: "false_anchored" }
      : { raw: 393, outcome_class: "ecology_incomplete" };
  return {
    raw: 0,
    outcome_class: "ecology_confirmed",
    ecology_independence_number: new Set(classes).size,
    externally_anchored: true,
  };
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// Verify a public attestation { payload, sig } under a domain, against an SPKI PEM Ed25519 key.
export async function verifyPublicAttestation(payload, sigB64, spkiPem, domain) {
  const subtle = (globalThis.crypto || {}).subtle;
  if (!subtle) throw new Error("WebCrypto unavailable");
  const key = await subtle.importKey("spki", pemToDer(spkiPem), { name: "Ed25519" }, false, [
    "verify",
  ]);
  const message = new TextEncoder().encode(domain + canonicalJson(payload));
  return subtle.verify({ name: "Ed25519" }, key, b64ToBytes(sigB64), message);
}
