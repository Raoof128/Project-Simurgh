// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC PORTABLE browser verifier. Recomputes the digest surface + rung predicates via WebCrypto
// and returns an EXPLICITLY INCOMPLETE capability object (raw:null). It NEVER reports a complete
// proven_rung when a Sigstore anchor is present but not evaluated — full trust (signatures, Sigstore
// kernel, policy) stays server/kernel-side.
import { canonicalJson } from "./canonical-json.mjs";

const DOMAIN = {
  capture: "simurgh.vfc.capture.v1\n",
  verifier_identity: "simurgh.vfc.verifier_identity.v1\n",
  producer_identity: "simurgh.vfc.producer_identity.v1\n",
  capture_census: "simurgh.vfc.capture_census.v1\n",
};

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return "sha256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const domainDigest = async (dom, obj) => sha256Hex(dom + canonicalJson(obj));
const artifactDigest = async (obj) => sha256Hex(canonicalJson(obj));
const identityDigest = async (id, role) => domainDigest(DOMAIN[role + "_identity"], id);

export async function verifyPortable(bundle, artifacts) {
  const tc = bundle.producer_transcript.content;
  let ok = true;
  if ((await domainDigest(DOMAIN.capture, bundle.capture)) !== tc.capture_digest) ok = false;
  if ((await identityDigest(bundle.producer_identity, "producer")) !== tc.producer_identity_digest)
    ok = false;
  if (
    (await domainDigest(DOMAIN.capture_census, artifacts?.census ?? {})) !==
      bundle.capture_census_digest &&
    artifacts?.census
  )
    ok = false;
  if (artifacts) {
    if ((await artifactDigest(artifacts.corpus)) !== bundle.corpus_ref.digest) ok = false;
    if ((await artifactDigest(artifacts.panelPlan)) !== bundle.panel_plan_ref.digest) ok = false;
    if ((await artifactDigest(artifacts.detectorSnapshot)) !== bundle.detector_snapshot_ref.digest)
      ok = false;
  }
  const anchorPresent = bundle.anchor_evidence !== undefined;
  const challengeBound = tc.challenge_record_digest !== undefined;
  const proven = challengeBound ? "challenge_bound" : "distinct_key_only"; // never externally_anchored here
  return {
    verification_scope: "portable",
    portable_valid: ok,
    proven_rung_portable: proven,
    rung2_status: anchorPresent ? "not_evaluated" : "not_present",
    full_attestation_status: "not_evaluated",
    raw: null,
  };
}
