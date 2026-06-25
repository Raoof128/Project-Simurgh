// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier verifier for the Stage 4A-lite authority bundle. Pure (callers pass loaded data).
// Portable: signature + fingerprint + bundle_sha256 + invariants. Reproduce: re-derive
// decisions_sha256 and rebuild the bundle from decisions+manifest.
import crypto from "node:crypto";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";
import { buildBundle } from "./stage4aAuthorityLib.mjs";

const INHERITANCE_MUST_INCLUDE = "not through replay of the live model";

export function verifyAuthority({
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

    // Invariant: no confirmation-flow evidence is claimed in this stage.
    checks.no_confirmation_claimed =
      (bundle.summary && bundle.summary.requires_confirmation_count) === 0;
    // The verbatim inheritance non-claim must be present.
    checks.inheritance_statement_present =
      typeof bundle.inheritance_statement === "string" &&
      bundle.inheritance_statement.includes(INHERITANCE_MUST_INCLUDE);
    checks.non_claim_no_live_replay = bundle.non_claims?.not_a_live_per_action_replay === true;

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
