// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC Anchored-Subject Diversity Index (Invention A). A projection over verified attestations
// that surfaces producer MONOCULTURE. NON-CLAIM: counts distinct ANCHORED subjects (proven_rung ===
// externally_anchored only), never distinct humans/orgs — one operator can hold many anchored identities.
// Diversity is an observation, not an independence score.
export function diversityIndex(attestations) {
  const by_rung = {};
  for (const a of attestations) by_rung[a.proven_rung] = (by_rung[a.proven_rung] ?? 0) + 1;
  const anchored = attestations.filter((a) => a.proven_rung === "externally_anchored");
  const subjects = new Set(anchored.map((a) => a.producer_subject_digest));
  let state;
  if (anchored.length < 2) state = "insufficient_anchored_evidence";
  else state = subjects.size >= 2 ? "diverse" : "monoculture";
  return { by_rung, distinct_anchored_subjects: subjects.size, state };
}
