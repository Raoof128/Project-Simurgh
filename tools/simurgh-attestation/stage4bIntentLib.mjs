// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure builder + verifier core for the Stage 4B intent-grounding bundle. No I/O.
import crypto from "node:crypto";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

export const STAGE4B_BUNDLE_SCHEMA = "simurgh.stage4b.intent_bundle.v1";

export function buildBundle({ summary, manifest, decisions }) {
  return {
    schema: STAGE4B_BUNDLE_SCHEMA,
    stage: "4B-intent",
    summary,
    manifest,
    decisions_count: decisions.length,
    decisions_sha256: sha256Hex(canonicalJson(decisions)),
    builds_on: manifest.builds_on,
    non_claims: manifest.non_claims,
  };
}

export function verifyIntent({
  bundle,
  sidecar,
  publicKeyPem,
  decisions = null,
  manifest = null,
  reproduce = false,
}) {
  const checks = {};
  try {
    if (!bundle || !sidecar || !publicKeyPem) return { ok: false, reason: "missing input", checks };
    const canonical = Buffer.from(canonicalJson(bundle), "utf8");
    checks.bundle_sha256_matches = sha256Hex(canonical) === sidecar.bundle_sha256;
    checks.fingerprint_matches =
      fingerprintPublicKey(publicKeyPem) === sidecar.public_key_fingerprint;
    const sig = String(sidecar.signature || "").replace(/^base64:/, "");
    checks.signature_valid = crypto.verify(
      null,
      canonical,
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(sig, "base64")
    );
    // Core invariants: no laundering, full containment preserved, some recovery achieved.
    checks.no_laundering = bundle.summary?.laundering_failures === 0;
    checks.full_containment_preserved = bundle.summary?.full_containment_preserved === true;
    checks.recovery_achieved = (bundle.summary?.recovered_overblocks || 0) > 0;
    // Honest non-claim must be present.
    checks.not_live_confirmed_declared = bundle.non_claims?.not_live_confirmed === true;
    if (reproduce) {
      if (!decisions || !manifest)
        return { ok: false, reason: "reproduce needs decisions+manifest", checks };
      checks.decisions_sha256_recomputed =
        sha256Hex(canonicalJson(decisions)) === bundle.decisions_sha256;
      const rebuilt = buildBundle({ summary: bundle.summary, manifest, decisions });
      checks.bundle_rebuild_matches = canonicalJson(rebuilt) === canonicalJson(bundle);
    }
    const ok = Object.values(checks).every(Boolean);
    return { ok, checks };
  } catch (e) {
    return { ok: false, reason: e.message, checks };
  }
}
