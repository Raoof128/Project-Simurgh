// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4P VOCA offline verifier (4P spec §17 step 4, Task 11). Two-tier, offline primary
// (3M pattern): reconstructs body0/body1 and recomputes BOTH digests in the same two stages
// the builder used (MF5), re-projects the vendor disclosure from the freshly recomputed
// body0_digest and deep-equals it, verifies Ed25519 over canonicalJson({...body1,
// bundle_digest}), checks the 16 non-claims byte-equal in frozen order, checks
// corroborating_commitments is EXACTLY the matchable arms' digests and nothing degraded, and
// re-checks the pincer/contest/bridge invention-layer fields. Any failure -> non-zero raw,
// routed through stage4CodeForRawCode (never a bespoke exit code).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { createPublicKey, verify as edVerify } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { domainDigest } from "../core/digest.mjs";
import { projectVendorDisclosure } from "../core/inventionCore.mjs";
import { DOMAINS, SCHEMAS, VOCA_NON_CLAIMS } from "../constants.mjs";
import { buildBody0 } from "./build-stage4p-attestation.mjs";
import { stage4CodeForRawCode, RAW_VERIFIER_CODES } from "../../stage4h/exitCodes.mjs";

const FAIL_RAW = RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED; // 29 — generic fail-closed;
// the 67-79 VOCA ledger belongs to custodyCore's per-arm verdicts (already replayed inside
// `arms`), not to this bundle-integrity check.

function fail(reason) {
  return { ok: false, raw: FAIL_RAW, reason };
}

// Pure, offline, no file writes. `attestation` is a full bundle object (either freshly
// built in-process or JSON.parse'd from a committed evidence file) — this function never
// trusts anything IN the attestation except the two things a verifier legitimately cannot
// derive itself: the signer's public key and the signature bytes.
export function verifyBundle(attestation) {
  if (!attestation || typeof attestation !== "object") return fail("attestation_absent");
  if (attestation.schema !== SCHEMAS.ATTESTATION) return fail("schema_invalid");

  // Non-claims: frozen list, frozen order, byte-equal — never a set-equality check.
  if (
    !Array.isArray(attestation.non_claims) ||
    attestation.non_claims.length !== VOCA_NON_CLAIMS.length
  ) {
    return fail("non_claims_count_invalid");
  }
  for (let i = 0; i < VOCA_NON_CLAIMS.length; i++) {
    if (attestation.non_claims[i] !== VOCA_NON_CLAIMS[i]) return fail("non_claims_mismatch");
  }

  // MF5 stage 1: rebuild body0 fresh from the committed fixtures — never read off the
  // attestation. Any tamper of arms/cpc_signals/corroborating_commitments/invention
  // layer/metrics/anchors is caught below because this rebuild is wholly independent of
  // whatever the attestation claims.
  let body0;
  try {
    body0 = buildBody0();
  } catch (e) {
    return fail(`body0_rebuild_failed: ${e.message}`);
  }
  const body0_digest = domainDigest(DOMAINS.ATTESTATION_BUNDLE, SCHEMAS.ATTESTATION, body0);

  if (canonicalJson(attestation.arms) !== canonicalJson(body0.arms)) return fail("arms_mismatch");
  if (canonicalJson(attestation.cpc_signals) !== canonicalJson(body0.cpc_signals)) {
    return fail("cpc_signals_mismatch");
  }

  // corroborating_commitments: EXACTLY the matchable arms' digests, nothing degraded, no
  // extras — checked both by set-membership (specific diagnostics) and by full recompute.
  const matchableDigests = new Set(
    body0.cpc_signals
      .filter((e) => "custody_class_digest" in e.signal)
      .map((e) => e.signal.custody_class_digest)
  );
  const degradedWindowAnchors = new Set(
    body0.cpc_signals
      .filter((e) => !("custody_class_digest" in e.signal))
      .map((e) => e.signal.stage4n_window_anchor_digest)
  );
  if (!Array.isArray(attestation.corroborating_commitments))
    return fail("corroborating_commitments_invalid");
  for (const c of attestation.corroborating_commitments) {
    if (degradedWindowAnchors.has(c)) return fail("corroborating_commitment_degraded_leak");
    if (!matchableDigests.has(c)) return fail("corroborating_commitment_not_matchable");
  }
  if (
    canonicalJson([...attestation.corroborating_commitments].sort()) !==
    canonicalJson(body0.corroborating_commitments)
  ) {
    return fail("corroborating_commitments_incomplete");
  }

  // Invention layer re-check: pincer corroboration, the valid contest, the extraction bridge.
  if (attestation.pincer_corroborated !== true) return fail("pincer_not_corroborated");
  if (
    canonicalJson(attestation.enforcement_commitment) !==
    canonicalJson(body0.enforcement_commitment)
  ) {
    return fail("enforcement_commitment_mismatch");
  }
  if (canonicalJson(attestation.relay_contests) !== canonicalJson(body0.relay_contests)) {
    return fail("relay_contests_mismatch");
  }
  if (
    canonicalJson(attestation.custody_extraction_bridge) !==
    canonicalJson(body0.custody_extraction_bridge)
  ) {
    return fail("custody_extraction_bridge_mismatch");
  }
  if (canonicalJson(attestation.metrics) !== canonicalJson(body0.metrics))
    return fail("metrics_mismatch");
  if (attestation.stage4n_window_anchor_digest !== body0.stage4n_window_anchor_digest) {
    return fail("stage4n_window_anchor_mismatch");
  }
  if (attestation.stage4o_surface_commitment_digest !== body0.stage4o_surface_commitment_digest) {
    return fail("stage4o_surface_commitment_mismatch");
  }
  if (attestation.safety_rail !== body0.safety_rail) return fail("safety_rail_mismatch");

  // MF5 stage 2: re-project the vendor disclosure from the freshly recomputed body0_digest
  // (never from whatever the attestation claims its own digest to be) and deep-equal it.
  const expectedDisclosure = projectVendorDisclosure(body0_digest, body0.disclosure_subject);
  if (canonicalJson(expectedDisclosure) !== canonicalJson(attestation.vendor_custody_disclosure)) {
    return fail("vendor_custody_disclosure_mismatch");
  }
  if (attestation.vendor_custody_disclosure?.attestation_digest !== body0_digest) {
    return fail("vendor_custody_disclosure_digest_mismatch");
  }

  const body1 = {
    ...body0,
    vendor_custody_disclosure: expectedDisclosure,
    signer_public_key_pem: attestation.signer_public_key_pem,
  };
  const bundle_digest = domainDigest(DOMAINS.ATTESTATION_BUNDLE, SCHEMAS.ATTESTATION, body1);
  if (bundle_digest !== attestation.bundle_digest) return fail("bundle_digest_mismatch");

  // Full-content safety net: everything except `signature` must equal the independent
  // rebuild byte-for-byte. Catches any field this function did not enumerate above.
  const { signature, ...attestationBody } = attestation;
  const rebuiltBody = { ...body1, bundle_digest };
  if (canonicalJson(rebuiltBody) !== canonicalJson(attestationBody)) {
    return fail("content_rederivation_mismatch");
  }

  // Ed25519 signature over canonicalJson({...body1, bundle_digest}) — the signed payload
  // includes bundle_digest itself, so it is signature-protected, not just digest-protected.
  let sigOk = false;
  try {
    const publicKey = createPublicKey(attestation.signer_public_key_pem);
    const payload = Buffer.from(canonicalJson({ ...body1, bundle_digest }));
    sigOk = edVerify(null, payload, publicKey, Buffer.from(String(signature), "base64"));
  } catch {
    sigOk = false;
  }
  if (!sigOk) return fail("signature_invalid");

  return { ok: true, raw: 0, reason: "accepted" };
}

// --- CLI --------------------------------------------------------------------------------
function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

if (process.argv[1] && process.argv[1].endsWith("verify-stage4p.mjs")) {
  const bundlePath = arg("--offline");
  if (!bundlePath) {
    console.error("usage: verify-stage4p.mjs --offline <bundle-path>");
    process.exit(1);
  }
  const attestation = JSON.parse(readFileSync(bundlePath, "utf8"));
  const out = verifyBundle(attestation);
  console.log(`stage4p verify: ${out.ok ? "PASS" : "FAIL"} raw=${out.raw} reason=${out.reason}`);
  process.exit(stage4CodeForRawCode(out.raw));
}
