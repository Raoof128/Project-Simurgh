// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — the frozen cross-stage projection simurgh.vuc.vpc_section_projection.v1. Both U_vpc and
// U_vrc resolve through THIS one projection over the same verified 5I partition (no producer-supplied
// mapping table). Set equality is over the canonical triple (leaf_id, leaf_type, subject_digest).
import { domainDigest, artifactDigest } from "./digests.mjs";
import { DOMAINS } from "../constants.mjs";

// subject_digest = H("simurgh.vuc.section_subject.v1",
//   { partition_digest, section_id, canonical_path, redaction_types })
// section_id is IN the subject, so two sections with an equal canonical_path are NOT aliases.
export function sectionSubjectDigest({
  partition_digest,
  section_id,
  canonical_path,
  redaction_types,
}) {
  return domainDigest(DOMAINS.section_subject, {
    partition_digest,
    section_id,
    canonical_path,
    redaction_types,
  });
}

// project a verified 5I partition section into a universe leaf triple.
export function projectSection(section, partition_digest) {
  return {
    leaf_id: section.section_id,
    leaf_type: "vpc_section",
    subject_digest: sectionSubjectDigest({
      partition_digest,
      section_id: section.section_id,
      canonical_path: section.canonical_path,
      redaction_types: section.redaction_types ?? [],
    }),
  };
}

// Canonical set digest over triples — the parity-comparable form of a universe. Sorted by leaf_id
// (byte order via canonicalJson's key sort is irrelevant here; we sort the triple list explicitly).
export function universeSetDigest(leaves) {
  const triples = leaves
    .map((l) => ({ leaf_id: l.leaf_id, leaf_type: l.leaf_type, subject_digest: l.subject_digest }))
    .sort((a, b) => (a.leaf_id < b.leaf_id ? -1 : a.leaf_id > b.leaf_id ? 1 : 0));
  return artifactDigest({ universe_triples: triples });
}
