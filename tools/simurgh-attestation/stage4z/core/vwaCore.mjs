// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — vwaCore (spec §2, plan Task 7). Motto: AnthropicSafe First, then ReviewerSafe.
// The orchestrator: schema (190), Ed25519 signature over the four-digest merkle root (191),
// then the frozen first-failure order 192→197 with public/audit tier gating and the
// fail-closed 198 wrapper. The attestation root binds declaration + capture + map + audit —
// declaration (NOT lexicon) so the whole precommitted workspace contract is under signature.
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { canonicalJson, recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import {
  VWA_DECLARATION_SCHEMA,
  VWA_CAPTURE_SCHEMA,
  VWA_MAP_SCHEMA,
  VWA_AUDIT_SCHEMA,
  VWA_ATTESTATION_SCHEMA,
} from "../constants.mjs";
import { declarationDigest, checkPrecommit } from "./declarationCore.mjs";
import { checkCaptureBinding, checkCaptureReopen } from "./captureCore.mjs";
import { checkGrid, checkFlags } from "./gridCore.mjs";
import { recomputeReadout, checkSelfReport } from "./mapCore.mjs";

const fail = (raw, reason, detail) => ({ raw, reason, detail });

// Unsigned attestation body binding all four digests via a sorted-leaf merkle root.
export function attestationBody(declaration, capture, map, audit, publicKeyPem) {
  const declaration_digest = declarationDigest(declaration);
  const capture_digest = recordDigest(capture);
  const map_digest = recordDigest(map);
  const audit_digest = recordDigest(audit);
  return {
    schema: VWA_ATTESTATION_SCHEMA,
    declaration_digest,
    capture_digest,
    map_digest,
    audit_digest,
    bundle_merkle_root: merkleRootSorted([
      declaration_digest,
      capture_digest,
      map_digest,
      audit_digest,
    ]),
    signing_key_digest: keyDigest(publicKeyPem),
  };
}

export function signAttestation(declaration, capture, map, audit, publicKeyPem, privateKeyPem) {
  const body = attestationBody(declaration, capture, map, audit, publicKeyPem);
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(body)), crypto.createPrivateKey(privateKeyPem))
    .toString("hex");
  return { ...body, signature };
}

// 190 — schema/field shape. Audit bundle only required at the audit tier.
function checkSchema(bundle, tier) {
  const { declaration, capture, map, attestation, audit } = bundle;
  if (!declaration || declaration.schema !== VWA_DECLARATION_SCHEMA)
    return fail(190, "vwa_schema_invalid", "declaration_schema");
  if (!capture || capture.schema !== VWA_CAPTURE_SCHEMA)
    return fail(190, "vwa_schema_invalid", "capture_schema");
  if (!map || map.schema !== VWA_MAP_SCHEMA) return fail(190, "vwa_schema_invalid", "map_schema");
  if (!Array.isArray(map.cells) || !map.aggregates)
    return fail(190, "vwa_schema_invalid", "map_shape");
  if (!attestation || attestation.schema !== VWA_ATTESTATION_SCHEMA)
    return fail(190, "vwa_schema_invalid", "attestation_schema");
  if (tier === "audit" && (!audit || audit.schema !== VWA_AUDIT_SCHEMA))
    return fail(190, "vwa_schema_invalid", "audit_schema");
  return null;
}

// 191 — Ed25519 over canonicalJson(body) + keyDigest over the public PEM. Binds declaration,
// capture, and map digests to their objects; audit_digest is trusted for the merkle at the
// public tier (tensors withheld) and recomputed at the audit tier.
export function checkSignature(bundle, publicKeyPem, tier = "public") {
  const { declaration, capture, map, audit, attestation } = bundle;
  if (attestation.signing_key_digest !== keyDigest(publicKeyPem))
    return fail(191, "vwa_signature_invalid", "key_digest");
  if (attestation.declaration_digest !== declarationDigest(declaration))
    return fail(191, "vwa_signature_invalid", "declaration_binding");
  if (attestation.capture_digest !== recordDigest(capture))
    return fail(191, "vwa_signature_invalid", "capture_binding");
  if (attestation.map_digest !== recordDigest(map))
    return fail(191, "vwa_signature_invalid", "map_binding");
  if (tier === "audit" && attestation.audit_digest !== recordDigest(audit))
    return fail(191, "vwa_signature_invalid", "audit_binding");
  if (
    attestation.bundle_merkle_root !==
    merkleRootSorted([
      attestation.declaration_digest,
      attestation.capture_digest,
      attestation.map_digest,
      attestation.audit_digest,
    ])
  )
    return fail(191, "vwa_signature_invalid", "merkle_binding");
  const { signature, ...body } = attestation;
  let ok = false;
  try {
    ok = crypto.verify(
      null,
      Buffer.from(canonicalJson(body)),
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(signature ?? "", "hex")
    );
  } catch {
    ok = false;
  }
  return ok ? null : fail(191, "vwa_signature_invalid", "signature");
}

// evaluateVwa(bundle, {tier, publicKeyPem}) → {raw} | {skipped:true}. Frozen order 190→197.
export function evaluateVwa(bundle, { tier = "public", publicKeyPem } = {}) {
  // Withheld tensors: audit tier is intentionally not runnable (mirrors 4Y withheld skip).
  if (tier === "audit" && bundle && bundle.audit == null) return { skipped: true, raw: 0 };

  const { declaration, capture, map, audit } = bundle;
  const decl = { prompts: declaration.corpus_manifest.prompts, layers: declaration.layers };
  const lexicon = { tokens: declaration.tokens };

  const order = [
    () => checkSchema(bundle, tier),
    () => checkSignature(bundle, publicKeyPem, tier),
    () => checkPrecommit(declaration, capture, map),
    () => {
      const pub = checkCaptureBinding(map, capture);
      if (pub) return pub;
      return tier === "audit" ? checkCaptureReopen(capture, audit) : null;
    },
    () => checkGrid(map, decl, lexicon),
    () => (tier === "audit" ? recomputeReadout(map, audit, declaration) : null), // 195 audit-only
    () => checkFlags(map, map.theta_nano),
    () => checkSelfReport(map),
  ];
  for (const step of order) {
    const r = step();
    if (r) return r;
  }
  return { raw: 0 };
}

// evaluateVwaSafe — any unexpected throw fails closed to 198.
export function evaluateVwaSafe(bundle, opts = {}) {
  try {
    return evaluateVwa(bundle, opts);
  } catch (e) {
    return { raw: 198, reason: "internal_fail_closed_vwa", detail: String(e && e.message) };
  }
}
