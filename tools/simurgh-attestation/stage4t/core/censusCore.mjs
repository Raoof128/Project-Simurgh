// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC closed epoch census (spec §4). Motto: AnthropicSafe First, then ReviewerSafe.
//
// The evidence_manifest seals the capsule's entire evidence universe for one
// declared incident epoch. Completeness is relative to declared epoch boundaries
// and guarded evidence sources — detectability at a sealed boundary, never omniscience.
//   138 evidence_census_missing_item   manifest lists an item the bundle lacks
//   139 evidence_census_smuggled_item  bundle carries an artifact the manifest omits
//   140 census_merkle_mismatch         recomputed census root != census_root
//   145 incident_epoch_mismatch        census item bound to a different epoch
import { recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";

export function buildEvidenceManifest({ epoch, items }) {
  const sorted = [...items].sort((a, b) =>
    a.digest < b.digest ? -1 : a.digest > b.digest ? 1 : 0
  );
  return { epoch, items: sorted, census_root: merkleRootSorted(sorted.map(recordDigest)) };
}

export function verifyCensus(capsule, artifactsByDigest) {
  const manifest = capsule.evidence_manifest;
  // 138: every listed item must have a matching artifact (keyed by, and hashing to, item.digest).
  for (const item of manifest.items) {
    const artifact = artifactsByDigest[item.digest];
    if (artifact === undefined || recordDigest(artifact) !== item.digest)
      return {
        raw: 138,
        reason: "evidence_census_missing_item",
        detail: { kind: item.kind, digest: item.digest },
      };
  }
  // 139: no artifact may be present that the manifest does not list.
  const listed = new Set(manifest.items.map((i) => i.digest));
  for (const digest of Object.keys(artifactsByDigest))
    if (!listed.has(digest))
      return { raw: 139, reason: "evidence_census_smuggled_item", detail: { digest } };
  // 140: the sealed root must recompute exactly.
  if (merkleRootSorted(manifest.items.map(recordDigest)) !== manifest.census_root)
    return { raw: 140, reason: "census_merkle_mismatch", detail: {} };
  // 145: every census item must belong to the capsule's declared epoch.
  for (const item of manifest.items)
    if (item.epoch !== capsule.epoch)
      return {
        raw: 145,
        reason: "incident_epoch_mismatch",
        detail: { kind: item.kind, item_epoch: item.epoch, capsule_epoch: capsule.epoch },
      };
  return null;
}
