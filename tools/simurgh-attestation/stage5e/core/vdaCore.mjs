// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — core evaluator (plan Task 8). Runs checks in frozen first-failure order 255→266;
// 267 wraps any throw fail-closed. External-review correction: the signature is NOT self-authenticating
// — 256 fails unless the embedded key's fingerprint equals an externally pinned fingerprint (a
// swap-and-re-sign is caught here, not by the bare check). bundleJointlyBindsRevisionAndTable holds
// because the signature covers both the detector revision and the score-table digest.
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  verify as edVerify,
} from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VDA_DETECTOR } from "../constants.mjs";
import { checkDetectorPinned, checkScoreTableBinding } from "./detector.mjs";
import { checkVariantSafety } from "./corpus.mjs";
import { checkSlips } from "./slip.mjs";
import { checkCurve, checkFp } from "./curve.mjs";
import { checkClaims, checkProvenance } from "./claim.mjs";

const sha256 = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

export const BUNDLE_KEYS = new Set([
  "schema",
  "ruleset_id",
  "detector",
  "score_table",
  "base_corpus",
  "evasions",
  "evasion_threshold_curve",
  "benign_probe",
  "benign_fp_curve",
  "capture_provenance",
  "baseline_census",
  "review_records",
  "structured_claims",
  "byo_target",
  "attester_provenance",
  "analyst_note",
  "curve_scope",
  "public_tier_does_not_prove_capture_completeness",
  "attestation_pub_key_pem",
  "signature",
]);

export const contentOf = (bundle) => {
  const { signature, ...content } = bundle;
  return content;
};

// Fingerprint of the SPKI DER — the externally pinned trust anchor.
export function keyFingerprint(pem) {
  const der = createPublicKey(pem).export({ type: "spki", format: "der" });
  return "sha256:" + createHash("sha256").update(der).digest("hex");
}

export function signBundle(content, privatePem) {
  return edSign(
    null,
    Buffer.from(canonicalJson(content), "utf8"),
    createPrivateKey(privatePem)
  ).toString("base64");
}

function checkSchema(bundle) {
  if (!bundle || bundle.schema !== "simurgh.vda.detector_attestation.v1") return 255;
  for (const k of Object.keys(bundle)) if (!BUNDLE_KEYS.has(k)) return 255;
  return null;
}

function checkSignature(bundle, pinnedKeyFingerprint) {
  try {
    const pem = bundle.attestation_pub_key_pem;
    if (typeof pem !== "string" || typeof bundle.signature !== "string") return 256;
    // External pin FIRST: a swapped key has a different fingerprint (not self-authenticating).
    if (!pinnedKeyFingerprint || keyFingerprint(pem) !== pinnedKeyFingerprint) return 256;
    const ok = edVerify(
      null,
      Buffer.from(canonicalJson(contentOf(bundle)), "utf8"),
      createPublicKey(pem),
      Buffer.from(bundle.signature, "base64")
    );
    return ok ? null : 256;
  } catch {
    return 256;
  }
}

// 266 (audit only) — the census is bound and complete: its digest matches the signed capture_log_digest,
// and every census slip appears in the public evasions.
function checkCaptureOmission(bundle, auditPrivate) {
  if (!auditPrivate) return 266;
  if (sha256(canonicalJson(auditPrivate)) !== bundle.capture_provenance?.capture_log_digest)
    return 266;
  const known = new Set((bundle.evasions ?? []).map((e) => e.generated_text_digest));
  for (const row of auditPrivate.entries ?? [])
    if (row.disposition === "evasion_slip" && !known.has(row.generated_text_digest)) return 266;
  return null;
}

export function evaluateVda(bundle, opts = {}) {
  const { tier = "public", auditPrivate, pinnedKeyFingerprint, reviewerPubKeyPem } = opts;
  const theta = bundle?.detector?.reference_threshold ?? VDA_DETECTOR.REFERENCE_THRESHOLD;
  const steps = [
    () => checkSchema(bundle),
    () => checkSignature(bundle, pinnedKeyFingerprint),
    () => checkDetectorPinned(bundle),
    () => checkVariantSafety(bundle),
    () => checkScoreTableBinding(bundle),
    () => checkSlips(bundle, theta), // 260 / 261
    () => checkCurve(bundle), // 262
    () => checkFp(bundle), // 263
    () => checkClaims(bundle, { reviewerPubKeyPem }), // 264
    () => checkProvenance(bundle), // 265
  ];
  for (const step of steps) {
    const code = step();
    if (code) return { raw: code, tier };
  }
  if (tier === "audit") {
    const code = checkCaptureOmission(bundle, auditPrivate);
    if (code) return { raw: code, tier };
  }
  return { raw: 0, tier };
}

export function evaluateVdaSafe(bundle, opts = {}) {
  try {
    return evaluateVda(bundle, opts);
  } catch {
    return { raw: 267, tier: opts.tier ?? "public" };
  }
}
