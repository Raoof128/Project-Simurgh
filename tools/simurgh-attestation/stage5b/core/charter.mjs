// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — signed red-team charter + precommitted attack manifest (spec §3, plan Task 3A).
// Verifier logic ONLY — the concrete FAMILY_COUNTS + attack_manifest_root are frozen in Task 10B
// from the integrity-validated corpus (reviewer blocker 3/4). The charter proves DECLARED SCOPE,
// not inner intent, and binds the capture DECLARATION digest, never the readings (No Post-Hoc
// Attack). Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { canonicalJson, recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import {
  VAR_SCHEMAS,
  VAR_DOMAINS,
  VAR_ATTACK_FAMILIES,
  CAMPAIGN_SEED,
  VAR_NON_CLAIMS,
  VAR_KNOWN_LIMITATIONS,
  VAR_RAILS,
} from "../constants.mjs";

const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
// Fields whose presence in a charter proves the author saw the readings (219, No Post-Hoc Attack).
const FORBIDDEN_PRECOMMIT_FIELDS = ["tensor_commitment_root", "map_digest"];

// Deterministic, stable attack ids: "<seed>:<family>#<n>" for n in [0, count), sorted.
export function deriveAttackIds(seed, familyCounts) {
  const ids = [];
  for (const fam of VAR_ATTACK_FAMILIES) {
    const n = familyCounts[fam] || 0;
    for (let i = 0; i < n; i++) ids.push(`${seed}:${fam}#${i}`);
  }
  return ids.sort();
}

export function attackManifestRoot(seed, familyCounts) {
  const leaves = deriveAttackIds(seed, familyCounts).map((id) =>
    recordDigest({ domain: VAR_DOMAINS.MANIFEST_LEAF, id })
  );
  return merkleRootSorted(leaves);
}

export function buildCharter({
  seed,
  familyCounts,
  caps,
  charterKeyDigest,
  captureDeclarationDigest,
}) {
  return {
    schema: VAR_SCHEMAS.CHARTER,
    campaign_seed: seed,
    attack_family_counts: { ...familyCounts },
    attack_manifest_root: attackManifestRoot(seed, familyCounts),
    declared_attack_count: deriveAttackIds(seed, familyCounts).length,
    caps: { ...caps },
    charter_key_digest: charterKeyDigest,
    // No Author's Map: bind the DECLARATION (the instrument), never a tensor-commitment root.
    capture_declaration_digest: captureDeclarationDigest,
    non_claims: [...VAR_NON_CLAIMS],
    known_limitations: [...VAR_KNOWN_LIMITATIONS],
    rails: [...VAR_RAILS],
  };
}

const unsignedBody = (charter) => {
  const { signature, ...body } = charter;
  return body;
};

export function charterDigest(charter) {
  return recordDigest({ domain: VAR_DOMAINS.CHARTER, charter: unsignedBody(charter) });
}

export function signCharter(charter, privKey) {
  const body = unsignedBody(charter);
  const signature = crypto.sign(null, Buffer.from(canonicalJson(body)), privKey).toString("hex");
  return { ...body, signature };
}

// 212 — campaign integrity: a re-signed charter cannot silently declare a different seed /
// non-claims / limitations / rails, or an inconsistent manifest root / key digest. When
// `canonicalFamilyCounts` is supplied (Task 10B), the counts must match it exactly.
export function checkCharterCampaign(charter, { pubKeyPem, canonicalFamilyCounts } = {}) {
  const bad = (detail) => ({ raw: 212, reason: "var_charter_campaign_mismatch", detail });
  if (!charter || typeof charter !== "object") return bad({ shape: true });
  if (charter.schema !== VAR_SCHEMAS.CHARTER) return bad({ schema: charter.schema });
  if (charter.campaign_seed !== CAMPAIGN_SEED) return bad({ campaign_seed: charter.campaign_seed });
  if (canonicalJson(charter.non_claims) !== canonicalJson(VAR_NON_CLAIMS))
    return bad({ non_claims: true });
  if (canonicalJson(charter.known_limitations) !== canonicalJson(VAR_KNOWN_LIMITATIONS))
    return bad({ known_limitations: true });
  if (canonicalJson(charter.rails) !== canonicalJson(VAR_RAILS)) return bad({ rails: true });
  if (
    canonicalFamilyCounts &&
    canonicalJson(charter.attack_family_counts) !== canonicalJson(canonicalFamilyCounts)
  )
    return bad({ attack_family_counts: true });
  // Manifest root + count must recompute from the declared family counts (self-consistency).
  const recomputed = attackManifestRoot(charter.campaign_seed, charter.attack_family_counts);
  if (recomputed !== charter.attack_manifest_root) return bad({ attack_manifest_root: true });
  if (
    charter.declared_attack_count !==
    deriveAttackIds(charter.campaign_seed, charter.attack_family_counts).length
  )
    return bad({ declared_attack_count: true });
  if (!DIGEST_RE.test(charter.charter_key_digest)) return bad({ charter_key_digest: true });
  // Bind the claimed key digest to the ACTUAL verifying key (else it is decorative).
  if (pubKeyPem && charter.charter_key_digest !== keyDigest(pubKeyPem))
    return bad({ key_digest_mismatch: true });
  return { raw: 0, reason: "green" };
}

// 219 — No Post-Hoc Attack (STRUCTURAL, not a spoofable timestamp): the charter must bind the
// capture DECLARATION and must NOT carry any tensor-commitment root / map digest.
export function checkPrecommitStructural(charter) {
  const bad = (detail) => ({ raw: 219, reason: "var_precommit_structural_invalid", detail });
  if (!charter || typeof charter !== "object") return bad({ shape: true });
  for (const f of FORBIDDEN_PRECOMMIT_FIELDS) if (f in charter) return bad({ bound_readings: f });
  if (!DIGEST_RE.test(charter.capture_declaration_digest || ""))
    return bad({ capture_declaration_digest: true });
  return { raw: 0, reason: "green" };
}

// 213 — an attack scored must be under the signed manifest root (a member of the derived id set).
export function verifyAttackScheduled(attackId, charter) {
  const scheduled = new Set(deriveAttackIds(charter.campaign_seed, charter.attack_family_counts));
  if (!scheduled.has(attackId))
    return { raw: 213, reason: "var_attack_unscheduled", detail: { attackId } };
  return { raw: 0, reason: "green" };
}
