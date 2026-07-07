// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V No Strawman binding (spec §5). Motto: AnthropicSafe First, then ReviewerSafe.
//   153 vdp_binding_mismatch                 any of the five tuple fields
//   154 vdp_contested_section_set_mismatch   set digest != contests[] OR duplicate section
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { VIC_CAPSULE_SCHEMA } from "../../stage4t/constants.mjs";
import { ANCHOR_REGIME, ANCHOR_SECTION } from "../constants.mjs";

// Structured contest tuples — filed_at_beat is metadata, NOT in the set (spec §4a Option B).
export const contestTuples = (cc) => [
  ...(cc.contests ?? []).map((c) => ({ regime: c.regime, section_id: c.section_id })),
  ...(cc.anchor_contest ? [{ regime: ANCHOR_REGIME, section_id: ANCHOR_SECTION }] : []),
];

export const keyString = (t) => `${t.regime}/${t.section_id}`;

// Collision-safe: sort by JSON-array key, digest over structured objects.
const sortKey = (t) => JSON.stringify([t.regime, t.section_id]);
export const contestedSectionSetDigest = (tuples) =>
  recordDigest(
    [...tuples].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0))
  );

export function buildBinding(capsuleBundle, capsulePubKeyPem, tuples) {
  return {
    capsule_root: capsuleBundle.content.capsule_root,
    attestation_digest: capsuleBundle.attestation_digest,
    capsule_schema_version: VIC_CAPSULE_SCHEMA,
    capsule_signing_key_fingerprint: keyDigest(capsulePubKeyPem),
    contested_section_set_digest: contestedSectionSetDigest(tuples),
  };
}

export function verifyBinding(cc, capsuleBundle, capsulePubKeyPem) {
  const tuples = contestTuples(cc);
  const expected = buildBinding(capsuleBundle, capsulePubKeyPem, tuples);
  const b = cc.binding ?? {};
  for (const field of [
    "capsule_root",
    "attestation_digest",
    "capsule_schema_version",
    "capsule_signing_key_fingerprint",
  ])
    if (b[field] !== expected[field])
      return { raw: 153, reason: "vdp_binding_mismatch", detail: { field } };
  const seen = new Set(tuples.map(keyString));
  if (seen.size !== tuples.length)
    return { raw: 154, reason: "vdp_contested_section_set_mismatch", detail: { duplicate: true } };
  if (b.contested_section_set_digest !== expected.contested_section_set_digest)
    return { raw: 154, reason: "vdp_contested_section_set_mismatch", detail: {} };
  return null;
}
