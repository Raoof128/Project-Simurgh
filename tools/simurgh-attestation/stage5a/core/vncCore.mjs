// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — vncCore: artifact signing, the attestation body/merkle binding, and (Task 9)
// the frozen-order verifier evaluateVnc + fail-closed wrapper (209). Plan Tasks 6/9.
// Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { canonicalJson, recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { VSN_NARRATIVE_SCHEMA } from "../../stage4w/constants.mjs";
import {
  VNC_ATTESTATION_SCHEMA,
  VNC_CLAIM_TABLE_SCHEMA,
  VNC_LEDGER_SCHEMA,
  VNC_REFLECTION_MANIFEST_SCHEMA,
  VNC_PILOT_ADAPTATION_SCHEMA,
} from "../constants.mjs";
import { checkClaimTable } from "./claimCore.mjs";
import { checkClassification, checkVerdicts } from "./verdictCore.mjs";
import { checkCoverage, checkTallies } from "./partitionCore.mjs";
import { checkBindings } from "./bindingCore.mjs";
import { checkManifest } from "./manifestCore.mjs";
import { checkAdaptation } from "./adapterCore.mjs";

// Signed artifact shape {content, signature, author_pub_key_pem} — the 4W narrative pattern.
// The signature covers canonicalJson(content) and verifies against the EMBEDDED public key;
// the DIGEST of record is recordDigest over the WHOLE artifact, so a key-swap re-sign changes
// it and 201 catches it (no key registry needed — reviewer MF5).
export const signArtifact = (content, privPem, pubPem) => ({
  content,
  signature: crypto
    .sign(null, Buffer.from(canonicalJson(content)), crypto.createPrivateKey(privPem))
    .toString("base64"),
  author_pub_key_pem: pubPem,
});

export function verifyArtifactSignature(artifact) {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalJson(artifact.content)),
      crypto.createPublicKey(artifact.author_pub_key_pem),
      Buffer.from(artifact.signature ?? "", "base64")
    );
  } catch {
    return false;
  }
}

// The attestation binds the four (or six) artifact digests under one Ed25519 signature.
export function attestationBody(
  { claimTable, ledger, narrative, mapAttestation, reflectionManifest, pilotAdaptation },
  pubPem
) {
  const claim_table_digest = recordDigest(claimTable);
  const ledger_digest = recordDigest(ledger);
  const narrative_digest = recordDigest(narrative);
  const map_attestation_digest = recordDigest(mapAttestation);
  const body = {
    schema: VNC_ATTESTATION_SCHEMA,
    claim_table_digest,
    ledger_digest,
    narrative_digest,
    map_attestation_digest,
  };
  const digests = [claim_table_digest, ledger_digest, narrative_digest, map_attestation_digest];
  if (reflectionManifest) {
    body.reflection_manifest_digest = recordDigest(reflectionManifest);
    digests.push(body.reflection_manifest_digest);
  }
  if (pilotAdaptation) {
    body.pilot_adaptation_digest = recordDigest(pilotAdaptation);
    digests.push(body.pilot_adaptation_digest);
  }
  body.bundle_merkle_root = merkleRootSorted(digests);
  body.signing_key_digest = keyDigest(pubPem);
  return body;
}

export function signVncAttestation(parts, pubPem, privPem) {
  const body = attestationBody(parts, pubPem);
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(body)), crypto.createPrivateKey(privPem))
    .toString("hex");
  return { ...body, signature };
}

// 199 — schema/shape of every VNC artifact. Structural key allowlisting lives HERE (re-gauntlet
// fix): a claim table carrying a forbidden `map_digest` field is a 199, never a 202.
function checkSchema(bundle) {
  const fail = (detail) => ({ raw: 199, reason: "vnc_schema_invalid", detail });
  const { narrative, vwa, claim_table, ledger, attestation } = bundle;
  if (!narrative?.content || narrative.content.schema !== VSN_NARRATIVE_SCHEMA)
    return fail("narrative_schema");
  if (!vwa?.map || typeof vwa.map !== "object") return fail("vwa_map_missing");
  if (!claim_table?.content || claim_table.content.schema !== VNC_CLAIM_TABLE_SCHEMA)
    return fail("claim_table_schema");
  if (Object.prototype.hasOwnProperty.call(claim_table.content, "map_digest"))
    return fail("claim_table_forbidden_map_digest"); // Law 3 structural (199 owns it)
  if (!Array.isArray(claim_table.content.claims)) return fail("claim_table_claims");
  if (!ledger?.content || ledger.content.schema !== VNC_LEDGER_SCHEMA) return fail("ledger_schema");
  if (!Array.isArray(ledger.content.verdicts) || !Array.isArray(ledger.content.unnarrated_flags))
    return fail("ledger_shape");
  if (!attestation || attestation.schema !== VNC_ATTESTATION_SCHEMA)
    return fail("attestation_schema");
  if (bundle.reflection_manifest) {
    const c = bundle.reflection_manifest.content ?? bundle.reflection_manifest;
    if (c.schema !== VNC_REFLECTION_MANIFEST_SCHEMA) return fail("reflection_manifest_schema");
  }
  if (bundle.pilot_adaptation) {
    const c = bundle.pilot_adaptation.content ?? bundle.pilot_adaptation;
    if (c.schema !== VNC_PILOT_ADAPTATION_SCHEMA) return fail("pilot_adaptation_schema");
  }
  return null;
}

// 200 — the VNC attestation signature + key digest + merkle-root recompute, plus the VNC
// artifact signatures (claim table + ledger). The narrative signature and embedded 4Z verify
// belong to 201 (embedded external artifacts).
function checkSignature(bundle, vncPubKeyPem) {
  const fail = (detail) => ({ raw: 200, reason: "vnc_signature_invalid", detail });
  const { attestation, claim_table, ledger } = bundle;
  if (attestation.signing_key_digest !== keyDigest(vncPubKeyPem)) return fail("key_digest");
  const digestFields = [
    attestation.claim_table_digest,
    attestation.ledger_digest,
    attestation.narrative_digest,
    attestation.map_attestation_digest,
  ];
  if (attestation.reflection_manifest_digest)
    digestFields.push(attestation.reflection_manifest_digest);
  if (attestation.pilot_adaptation_digest) digestFields.push(attestation.pilot_adaptation_digest);
  if (attestation.bundle_merkle_root !== merkleRootSorted(digestFields)) return fail("merkle_root");
  const { signature, ...body } = attestation;
  let ok = false;
  try {
    ok = crypto.verify(
      null,
      Buffer.from(canonicalJson(body)),
      crypto.createPublicKey(vncPubKeyPem),
      Buffer.from(signature ?? "", "hex")
    );
  } catch {
    ok = false;
  }
  if (!ok) return fail("attestation_signature");
  if (!verifyArtifactSignature(claim_table)) return fail("claim_table_signature");
  if (!verifyArtifactSignature(ledger)) return fail("ledger_signature");
  return null;
}

// evaluateVnc — the frozen first-failure verifier over VNC_CHECK_ORDER (199→208). Optional
// artifacts (RCP 206, pilot 207) SKIP when absent — absence is recorded, never silently equal
// to presence. Returns {raw, ...} where raw 0 is a clean pass.
export function evaluateVnc(bundle, { tier = "public", vncPubKeyPem, vwaPubKeyPem } = {}) {
  const { narrative, vwa, claim_table, ledger } = bundle;
  const map = vwa?.map;
  const rcp = bundle.reflection_manifest ? "present" : "absent";
  const pilot = bundle.pilot_adaptation ? "present" : "absent";
  const order = [
    () => checkSchema(bundle),
    () => checkSignature(bundle, vncPubKeyPem),
    () => checkBindings(bundle, { vwaPubKeyPem, tier }),
    () => checkClaimTable(claim_table, narrative),
    () => checkClassification(ledger, claim_table),
    () => checkCoverage(ledger, map),
    () => checkVerdicts(ledger, claim_table, map),
    () => (rcp === "present" ? checkManifest(bundle.reflection_manifest) : null),
    () =>
      pilot === "present"
        ? checkAdaptation(bundle.pilot_adaptation, vwa, {
            vwaPubKeyPem,
            rawExportBytes: tier === "audit" ? (bundle.pilot_raw_bytes ?? null) : null,
          })
        : null,
    () => checkTallies(ledger),
  ];
  for (const step of order) {
    const r = step();
    if (r) return { ...r, rcp, pilot };
  }
  return { raw: 0, rcp, pilot };
}

// evaluateVncSafe — any unexpected throw fails closed to 209, never leaks the exception.
export function evaluateVncSafe(bundle, opts = {}) {
  try {
    return evaluateVnc(bundle, opts);
  } catch (e) {
    return { raw: 209, reason: "internal_fail_closed_vnc", detail: String(e && e.message) };
  }
}
