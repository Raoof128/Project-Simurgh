// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — browser portable verifier surface (WebCrypto, async). CSP no-egress: pure compute, no fetch.
// It recomputes the frozen H_DS digests and verifies STRUCTURE + the signed tsa_crypto_attestation. Its
// claim is deliberately bounded — it does NOT independently verify the RFC-3161 token in-browser.
import { canonicalJson } from "./canonical-json.mjs";

export const BROWSER_CLAIM = "adapter-attestation and structural binding verified";
// Never this — the browser does not run OpenSSL RFC-3161 verification.
export const BROWSER_NON_CLAIM = "RFC-3161 independently verified in-browser";

const enc = new TextEncoder();

async function sha256Hex(bytes) {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// H_DS(tag, payload) = SHA256( UTF8(tag) || 0x00 || UTF8(canonicalJson(payload)) ), "sha256:" + hex.
export async function hDs(tag, payload) {
  const body = canonicalJson(payload);
  const buf = new Uint8Array([...enc.encode(tag), 0x00, ...enc.encode(body)]);
  return "sha256:" + (await sha256Hex(buf));
}

export async function recomputeCommitmentSessionId(bundle) {
  const cc = bundle.ceremony_contract;
  const payload = {
    ...cc,
    schema_version: bundle.schema_version,
    campaign_id: bundle.campaign_id,
    vuc_root: bundle.vuc.universe_commitment_digest,
  };
  return hDs("simurgh.vtcq.commitment_session.v1", payload);
}
