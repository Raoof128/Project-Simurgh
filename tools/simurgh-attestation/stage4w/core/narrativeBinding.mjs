// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W No Strawman binding + lens-not-blender locality + judgment binding (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
//   166 vsn_binding_mismatch            any binding field vs recomputed expectation
//   167 vsn_evidence_locality_violation span cites a digest outside the sealed evidence set
//   168 vsn_judgment_binding_invalid    dup id / missing ref / digest mismatch / bad inner sig / unreferenced
import crypto from "node:crypto";
import { recordDigest, sha256Hex, canonicalJson } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { VIC_CAPSULE_SCHEMA } from "../../stage4t/constants.mjs";

// Spec: digest over canonical UTF-8 BYTES of the body — not canonicalJson(body).
export const narrativeBodyDigest = (body) => `sha256:${sha256Hex(body)}`;
export const spanMapDigest = (spanMap) => recordDigest(spanMap ?? []);

export function buildNarrativeBinding(capsuleBundle, capsulePubKeyPem, body, spanMap) {
  return {
    capsule_root: capsuleBundle.content.capsule_root,
    attestation_digest: capsuleBundle.attestation_digest,
    capsule_schema_version: VIC_CAPSULE_SCHEMA,
    capsule_signing_key_fingerprint: keyDigest(capsulePubKeyPem),
    narrative_body_digest: narrativeBodyDigest(body),
    span_map_digest: spanMapDigest(spanMap),
  };
}

export function verifyNarrativeBinding(narrative, capsuleBundle, capsulePubKeyPem) {
  const expected = buildNarrativeBinding(
    capsuleBundle,
    capsulePubKeyPem,
    narrative.narrative_body,
    narrative.span_map
  );
  const b = narrative.binding ?? {};
  for (const field of Object.keys(expected))
    if (b[field] !== expected[field])
      return { raw: 166, reason: "vsn_binding_mismatch", detail: { field } };
  return null;
}

export const capsuleEvidenceIndex = (capsuleBundle) =>
  Object.fromEntries(
    (capsuleBundle.content.evidence_artifacts ?? []).map((a) => [recordDigest(a), a])
  );

export function checkEvidenceLocality(narrative, capsuleBundle) {
  const sealed = capsuleEvidenceIndex(capsuleBundle);
  for (const s of narrative.span_map ?? []) {
    if (s.type !== "slot_bound") continue;
    if (sealed[s.evidence_digest] === undefined)
      return {
        raw: 167,
        reason: "vsn_evidence_locality_violation",
        detail: { span_id: s.span_id },
      };
  }
  return null;
}

const verifyInnerJudgment = (sj) => {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalJson(sj.content)),
      crypto.createPublicKey(sj.judgment_pub_key_pem),
      Buffer.from(sj.signature, "base64")
    );
  } catch {
    return false;
  }
};

export function checkJudgments(narrative) {
  const bad = (kind, id) => ({
    raw: 168,
    reason: "vsn_judgment_binding_invalid",
    detail: { kind, ...(id ? { judgment_id: id } : {}) },
  });
  const records = narrative.judgments ?? [];
  const byId = new Map();
  for (const r of records) {
    if (byId.has(r.judgment_id)) return bad("duplicate_judgment_id", r.judgment_id);
    byId.set(r.judgment_id, r);
  }
  const referenced = new Set();
  for (const s of narrative.span_map ?? []) {
    if (s.type !== "judgment") continue;
    const rec = byId.get(s.judgment_id);
    if (rec === undefined) return bad("missing_judgment_record", s.judgment_id);
    if (referenced.has(s.judgment_id)) return bad("judgment_referenced_twice", s.judgment_id);
    referenced.add(s.judgment_id);
    if (recordDigest(rec.signed_judgment) !== s.judgment_digest)
      return bad("judgment_digest_mismatch", s.judgment_id);
    if (!verifyInnerJudgment(rec.signed_judgment))
      return bad("judgment_inner_signature_invalid", s.judgment_id);
  }
  for (const r of records)
    if (!referenced.has(r.judgment_id) && r.reserved !== true)
      return bad("unreferenced_judgment_record", r.judgment_id);
  return null;
}
