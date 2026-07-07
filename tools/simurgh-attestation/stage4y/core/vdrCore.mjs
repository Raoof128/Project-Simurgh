// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR core (spec §2, plan Task 8). Motto: AnthropicSafe First, then ReviewerSafe.
// Frozen first-failure order 181→182→183→184→185→186→187→188; wrapper 189 LAST.
// Tier gating: public runs 181/182/184/185 and SKIPS 183/186/187/188; audit runs all.
import crypto from "node:crypto";
import { canonicalJson, recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { VDR_MAP_SCHEMA, VDR_AUDIT_SCHEMA, VDR_ATTESTATION_SCHEMA } from "../constants.mjs";
import { checkDocumentBytes } from "./documentBytes.mjs";
import { checkFrozenBinding } from "./frozenBinding.mjs";
import { checkReconciliation } from "./frozenBinding.mjs";
import { checkPartition } from "./partition.mjs";
import { checkShadowReplay } from "./shadow.mjs";
import { checkMapRecompute } from "./mapCore.mjs";

const DEC = new TextDecoder();
const fail = (raw, reason, detail) => ({ raw, reason, ...(detail ? { detail } : {}) });

// Unsigned attestation body binding the map + audit digests.
export function attestationBody(map, audit, publicKeyPem) {
  const map_digest = recordDigest(map);
  const audit_digest = recordDigest(audit);
  return {
    schema: VDR_ATTESTATION_SCHEMA,
    map_digest,
    audit_digest,
    bundle_merkle_root: merkleRootSorted([map_digest, audit_digest]),
    signing_key_digest: keyDigest(publicKeyPem),
  };
}

export function signAttestation(map, audit, publicKeyPem, privateKeyPem) {
  const body = attestationBody(map, audit, publicKeyPem);
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(body)), crypto.createPrivateKey(privateKeyPem))
    .toString("hex");
  return { ...body, signature };
}

// 181 — schema/field shape of the three artifacts.
function checkSchema(map, audit, attestation, tier) {
  if (!map || map.schema !== VDR_MAP_SCHEMA) return fail(181, "vdr_schema_invalid", "map_schema");
  if (!Array.isArray(map.regions) || !map.aggregates)
    return fail(181, "vdr_schema_invalid", "map_shape");
  if (!attestation || attestation.schema !== VDR_ATTESTATION_SCHEMA)
    return fail(181, "vdr_schema_invalid", "attestation_schema");
  if (tier === "audit" && (!audit || audit.schema !== VDR_AUDIT_SCHEMA))
    return fail(181, "vdr_schema_invalid", "audit_schema");
  return null;
}

// 182 — Ed25519 over canonicalJson(body) + keyDigest over the public PEM. Also binds the
// declared map/audit digests via the Merkle root (public verify reads audit_digest, never
// needs the audit bytes).
export function checkSignature(map, attestation, publicKeyPem) {
  if (attestation.signing_key_digest !== keyDigest(publicKeyPem))
    return fail(182, "vdr_signature_invalid", "key_digest");
  if (attestation.map_digest !== recordDigest(map))
    return fail(182, "vdr_signature_invalid", "map_digest_binding");
  if (
    attestation.bundle_merkle_root !==
    merkleRootSorted([attestation.map_digest, attestation.audit_digest])
  )
    return fail(182, "vdr_signature_invalid", "merkle_binding");
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
  return ok ? null : fail(182, "vdr_signature_invalid", "signature");
}

// Ordered evaluate. tier ∈ {public, audit}. documentBytes/counterpart only used at audit.
export function evaluateVdr(
  bundle,
  { tier = "public", publicKeyPem, documentBytes, counterpart } = {}
) {
  const { map, audit, attestation } = bundle ?? {};

  const schema = checkSchema(map, audit, attestation, tier); // 181
  if (schema) return schema;

  const sig = checkSignature(map, attestation, publicKeyPem); // 182
  if (sig) return sig;

  if (tier === "audit") {
    const bytes = documentBytes ?? null;
    if (bytes) {
      const doc = checkDocumentBytes(bytes, audit?.redaction_manifest ?? []); // 183
      if (doc) return doc;
    }
  }

  const frozen = checkFrozenBinding(map); // 184
  if (frozen) return frozen;

  const part = checkPartition(map); // 185
  if (part) return part;

  if (tier === "audit") {
    const rec = checkReconciliation(map, counterpart); // 186
    if (rec) return rec;
    const sealed = (audit?.shadow_regions ?? []).map((r) => ({
      region_text: documentBytes
        ? DEC.decode(documentBytes.slice(r.offset, r.offset + r.length))
        : "",
      records: r.records,
    }));
    const shadow = checkShadowReplay(sealed); // 187
    if (shadow) return shadow;
    if (documentBytes) {
      const recompute = checkMapRecompute(documentBytes, audit, map); // 188
      if (recompute) return recompute;
    }
  }

  return { raw: 0 };
}

export function evaluateVdrSafe(bundle, opts = {}) {
  try {
    return evaluateVdr(bundle, opts);
  } catch (e) {
    return fail(189, "vdr_internal_fail_closed", String(e?.message ?? e).slice(0, 80));
  }
}
