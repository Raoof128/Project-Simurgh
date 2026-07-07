// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC capsule assembly + frozen check order (spec §6, §8). Motto: AnthropicSafe First, then ReviewerSafe.
//
// Bundle vs capsule boundary:
//   capsule  = flat body { schema, epoch, template_bindings, evidence_manifest, evidence_artifacts,
//                          projected_sections, section_commitments, capsule_root,
//                          evidence_anchored_at_beat?, non_claims, known_limitations,
//                          honesty_rails, capsule_key_digest, signature }
//   bundle   = two-stage wrapper { schema: VIC_CAPSULE_BUNDLE_SCHEMA, content: <capsule>, attestation_digest }
// Inner capsule.signature = Ed25519 over unsignedCapsule (code 134); outer attestation_digest
// = content-binding digest (code 147). Those are the two stages.
import crypto from "node:crypto";
import { recordDigest, canonicalJson, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import {
  VIC_CAPSULE_SCHEMA,
  VIC_CAPSULE_BUNDLE_SCHEMA,
  TEMPLATE_REGIMES,
  RECOMPUTE_KINDS,
  VIC_NON_CLAIMS,
  VIC_KNOWN_LIMITATIONS,
  VIC_RAILS,
} from "../constants.mjs";
import { verifyTemplateBindings, loadTemplates } from "./templateMap.mjs";
import { verifyCensus } from "./censusCore.mjs";
import { verifyProjection, verifySuppression } from "./projectionCore.mjs";
import { deriveCommitments, verifyViewAgainstCommitments } from "./viewCore.mjs";

const eqArray = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);

export const unsignedCapsule = (capsule) => {
  const { signature, ...body } = capsule;
  return body;
};

// Two-stage digest — always over body.content (the 4P re-canonicalise round-trip).
export function capsuleAttestationDigest(bundle) {
  const { attestation_digest, signature, ...body } = bundle;
  return recordDigest({ schema: body.schema, content: JSON.parse(canonicalJson(body.content)) });
}

export function verifySeal(bundle) {
  return bundle.attestation_digest === capsuleAttestationDigest(bundle)
    ? null
    : { raw: 147, reason: "attestation_digest_mismatch" };
}

export function artifactsIndex(capsule) {
  return Object.fromEntries((capsule.evidence_artifacts ?? []).map((a) => [recordDigest(a), a]));
}

// 146: a referenced stage artifact must reproduce its RECORDED verdict under its own verifier.
export function verifyCrossStageRefs(capsule, artifactsByDigest, stageVerifiers) {
  for (const artifact of Object.values(artifactsByDigest)) {
    const verifier = stageVerifiers?.[artifact.kind];
    if (!verifier) continue;
    const recomputed = verifier(artifact);
    if (recomputed !== artifact.recorded_verdict)
      return {
        raw: 146,
        reason: "cross_stage_reference_invalid",
        detail: {
          ref_kind: artifact.kind,
          recorded: artifact.recorded_verdict,
          recomputed,
        },
      };
  }
  return null;
}

export function buildCapsule({
  epoch,
  templateBindings,
  manifest,
  evidenceArtifacts,
  projectedSections,
  anchoredField,
  salts,
  privKeyPem,
  pubKeyPem,
}) {
  const base = {
    schema: VIC_CAPSULE_SCHEMA,
    epoch,
    template_bindings: templateBindings,
    evidence_manifest: manifest,
    evidence_artifacts: evidenceArtifacts,
    projected_sections: projectedSections,
  };
  const section_commitments = deriveCommitments(base, salts);
  const capsule = {
    ...base,
    section_commitments,
    capsule_root: merkleRootSorted(section_commitments.map((c) => c.commitment)),
    ...(anchoredField ? { evidence_anchored_at_beat: anchoredField } : {}),
    non_claims: [...VIC_NON_CLAIMS],
    known_limitations: [...VIC_KNOWN_LIMITATIONS],
    honesty_rails: [...VIC_RAILS],
    capsule_key_digest: keyDigest(pubKeyPem),
  };
  const priv = crypto.createPrivateKey(privKeyPem);
  capsule.signature = crypto
    .sign(null, Buffer.from(canonicalJson(unsignedCapsule(capsule))), priv)
    .toString("hex");
  const bundle = { schema: VIC_CAPSULE_BUNDLE_SCHEMA, content: capsule };
  bundle.attestation_digest = capsuleAttestationDigest(bundle);
  return bundle;
}

// Re-sign an edited capsule (fixture authorship): a fixture targeting a code other
// than 134 is legitimately re-signed, so the OTHER defect is what the verifier catches.
export function resignBundle(bundle, privKeyPem) {
  const priv = crypto.createPrivateKey(privKeyPem);
  const capsule = bundle.content;
  capsule.signature = crypto
    .sign(null, Buffer.from(canonicalJson(unsignedCapsule(capsule))), priv)
    .toString("hex");
  bundle.attestation_digest = capsuleAttestationDigest(bundle);
  return bundle;
}

function schemaCheck(bundle) {
  if (!bundle || bundle.schema !== VIC_CAPSULE_BUNDLE_SCHEMA || typeof bundle.content !== "object")
    return { raw: 133, reason: "vic_capsule_schema_invalid", detail: { part: "bundle" } };
  const c = bundle.content;
  if (c.schema !== VIC_CAPSULE_SCHEMA)
    return { raw: 133, reason: "vic_capsule_schema_invalid", detail: { part: "capsule" } };
  const bindings = c.template_bindings ?? [];
  if (bindings.length !== TEMPLATE_REGIMES.length)
    return {
      raw: 133,
      reason: "vic_capsule_schema_invalid",
      detail: { binding_count: bindings.length },
    };
  const regimeSet = new Set(bindings.map((b) => b.regime));
  if (regimeSet.size !== TEMPLATE_REGIMES.length)
    return { raw: 133, reason: "vic_capsule_schema_invalid", detail: { duplicate_regime: true } };
  for (const b of bindings)
    if (!TEMPLATE_REGIMES.includes(b.regime))
      return { raw: 133, reason: "vic_capsule_schema_invalid", detail: { regime: b.regime } };
  for (const s of c.projected_sections ?? []) {
    if (!TEMPLATE_REGIMES.includes(s.regime))
      return { raw: 133, reason: "projected_section_schema_invalid", detail: { regime: s.regime } };
    if (s.class === "evidence_backed" && !RECOMPUTE_KINDS.includes(s.recompute_kind))
      return { raw: 133, reason: "unknown_recompute_kind", detail: { section_id: s.section_id } };
  }
  if (!Array.isArray(c.evidence_manifest?.items))
    return { raw: 133, reason: "evidence_manifest_schema_invalid", detail: {} };
  if (
    !eqArray(c.non_claims, VIC_NON_CLAIMS) ||
    !eqArray(c.known_limitations, VIC_KNOWN_LIMITATIONS) ||
    !eqArray(c.honesty_rails, VIC_RAILS)
  )
    return { raw: 133, reason: "vic_capsule_schema_invalid", detail: { part: "signed_lists" } };
  return null;
}

function signatureCheck(capsule, capsulePubKeyPem) {
  if (!capsulePubKeyPem || capsule.capsule_key_digest !== keyDigest(capsulePubKeyPem))
    return { raw: 134, reason: "capsule_signature_invalid", detail: { part: "key_digest" } };
  let ok = false;
  try {
    ok = crypto.verify(
      null,
      Buffer.from(canonicalJson(unsignedCapsule(capsule))),
      crypto.createPublicKey(capsulePubKeyPem),
      Buffer.from(capsule.signature ?? "", "hex")
    );
  } catch {
    ok = false;
  }
  return ok
    ? null
    : { raw: 134, reason: "capsule_signature_invalid", detail: { part: "signature" } };
}

// Frozen check order (spec §8): 133 → 134 → 135/136/137 → 138/139/140/145 → 146 →
// 141/142 → 143/144 → 147 → 148/149.
export function evaluateCapsule(bundle, opts = {}) {
  const s = schemaCheck(bundle);
  if (s) return s;
  const capsule = bundle.content;

  const sig = signatureCheck(capsule, opts.capsulePubKeyPem);
  if (sig) return sig;

  const templates = opts.templates ?? loadTemplates();
  const tpl = verifyTemplateBindings(capsule, templates, { partitions: opts.partitions });
  if (tpl) return tpl;

  const artifactsByDigest = artifactsIndex(capsule);
  const cen = verifyCensus(capsule, artifactsByDigest);
  if (cen) return cen;

  const stageVerifiers = opts.stageVerifiers ?? {};
  const xref = verifyCrossStageRefs(capsule, artifactsByDigest, stageVerifiers);
  if (xref) return xref;

  const ctx = {
    chainVerdict: (a) =>
      stageVerifiers.stage4s_chain_bundle
        ? stageVerifiers.stage4s_chain_bundle(a)
        : a.recorded_verdict,
  };
  const proj = verifyProjection(capsule, artifactsByDigest, ctx);
  if (proj) return proj;

  const sup = verifySuppression(capsule, opts.partitions, opts.kindOf);
  if (sup) return sup;

  const seal = verifySeal(bundle);
  if (seal) return seal;

  for (const view of opts.views ?? []) {
    const v = verifyViewAgainstCommitments(view, capsule.section_commitments);
    if (v) return v;
  }
  return { raw: 0 };
}

export function evaluateCapsuleSafe(bundle, opts = {}) {
  try {
    return evaluateCapsule(bundle, opts);
  } catch {
    return { raw: 150, reason: "internal_fail_closed" };
  }
}
