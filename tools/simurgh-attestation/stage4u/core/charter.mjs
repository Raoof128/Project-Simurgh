// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U signed Red-Team Charter + precommitted attack manifest (4U spec §3).
// Motto: AnthropicSafe First, then ReviewerSafe. The charter proves DECLARED
// SCOPE, not inner intent (rail non_malice_charter_proves_declared_scope_not_inner_intent).
import crypto from "node:crypto";
import { canonicalJson, recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import {
  SCHEMAS,
  DOMAINS,
  ATTACK_FAMILIES,
  CAMPAIGN_SEED,
  FAMILY_COUNTS,
  VRTA_NON_CLAIMS,
  VRTA_KNOWN_LIMITATIONS,
  VRTA_RAILS,
} from "../constants.mjs";

const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

// Deterministic, stable attack ids: "<seed>:<family>#<n>" for n in [0, count).
export function deriveAttackIds(seed, familyCounts) {
  const ids = [];
  for (const fam of ATTACK_FAMILIES) {
    const n = familyCounts[fam] || 0;
    for (let i = 0; i < n; i++) ids.push(`${seed}:${fam}#${i}`);
  }
  return ids.sort();
}

export function attackManifestRoot(seed, familyCounts) {
  const leaves = deriveAttackIds(seed, familyCounts).map((id) =>
    recordDigest({ domain: DOMAINS.MANIFEST_LEAF, id })
  );
  return merkleRootSorted(leaves);
}

export function buildCharter({ seed, familyCounts, caps, charterKeyDigest }) {
  const declared = deriveAttackIds(seed, familyCounts).length;
  return {
    schema: SCHEMAS.CHARTER,
    campaign_seed: seed,
    attack_family_counts: { ...familyCounts },
    attack_manifest_root: attackManifestRoot(seed, familyCounts),
    declared_attack_count: declared,
    caps: { ...caps },
    charter_key_digest: charterKeyDigest,
    non_claims: [...VRTA_NON_CLAIMS],
    known_limitations: [...VRTA_KNOWN_LIMITATIONS],
    rails: [...VRTA_RAILS],
  };
}

const unsignedBody = (charter) => {
  const { signature, ...body } = charter;
  return body;
};

export function charterDigest(charter) {
  return recordDigest({ domain: DOMAINS.CHARTER, charter: unsignedBody(charter) });
}

export function signCharter(charter, privKey) {
  const body = unsignedBody(charter);
  const signature = crypto.sign(null, Buffer.from(canonicalJson(body)), privKey).toString("hex");
  return { ...body, signature };
}

const REQUIRED = [
  "schema",
  "campaign_seed",
  "attack_family_counts",
  "attack_manifest_root",
  "declared_attack_count",
  "caps",
  "charter_key_digest",
  "non_claims",
  "known_limitations",
  "rails",
  "signature",
];

// L1 — schema (119) + signature (120). Returns NOTHING later than 120 (frozen
// order). Enforces the CANONICAL campaign constants: a re-signed charter cannot
// silently declare a different seed / family counts / non-claims / limitations /
// rails and still pass on a self-consistent manifest root.
export function verifyCharterShapeAndSignature(charter, { pubKeyPem }) {
  const bad = (detail) => ({ raw: 119, reason: "charter_schema_invalid", detail });
  if (!charter || typeof charter !== "object") return bad({ shape: true });
  for (const k of REQUIRED) if (!(k in charter)) return bad({ missing: k });
  if (charter.schema !== SCHEMAS.CHARTER) return bad({ schema: charter.schema });
  if (charter.campaign_seed !== CAMPAIGN_SEED) return bad({ campaign_seed: charter.campaign_seed });
  if (canonicalJson(charter.attack_family_counts) !== canonicalJson(FAMILY_COUNTS))
    return bad({ attack_family_counts: true });
  if (canonicalJson(charter.non_claims) !== canonicalJson(VRTA_NON_CLAIMS))
    return bad({ non_claims: true });
  if (canonicalJson(charter.known_limitations) !== canonicalJson(VRTA_KNOWN_LIMITATIONS))
    return bad({ known_limitations: true });
  if (canonicalJson(charter.rails) !== canonicalJson(VRTA_RAILS)) return bad({ rails: true });
  if (!DIGEST_RE.test(charter.charter_key_digest)) return bad({ charter_key_digest: true });
  let sigOk = false;
  try {
    sigOk = crypto.verify(
      null,
      Buffer.from(canonicalJson(unsignedBody(charter))),
      crypto.createPublicKey(pubKeyPem),
      Buffer.from(charter.signature, "hex")
    );
  } catch {
    sigOk = false;
  }
  if (!sigOk) return { raw: 120, reason: "charter_signature_invalid" };
  // Bind the claimed key digest to the ACTUAL verifying key — otherwise
  // charter_key_digest is decorative.
  if (charter.charter_key_digest !== keyDigest(pubKeyPem))
    return { raw: 120, reason: "charter_signature_invalid", detail: { key_digest_mismatch: true } };
  return { raw: 0, reason: "green" };
}

// L2 — manifest root (124) ONLY. Called AFTER 121/122/123 in vrtaCore.
export function verifyManifestRoot(charter) {
  const recomputed = attackManifestRoot(charter.campaign_seed, charter.attack_family_counts);
  if (recomputed !== charter.attack_manifest_root) {
    return { raw: 124, reason: "attack_manifest_root_mismatch", detail: { recomputed } };
  }
  if (
    charter.declared_attack_count !==
    deriveAttackIds(charter.campaign_seed, charter.attack_family_counts).length
  ) {
    return { raw: 124, reason: "attack_manifest_root_mismatch", detail: { count: true } };
  }
  return { raw: 0, reason: "green" };
}
