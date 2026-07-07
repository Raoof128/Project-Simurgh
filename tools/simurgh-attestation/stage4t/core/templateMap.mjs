// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC template pinning (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
//
// Two pinned Commission template snapshots (GPAI Art-55 flagship + Art-73 draft),
// each carrying a normative, EXHAUSTIVE three-way partition. Codes:
//   135 template_digest_mismatch      binding digest != pinned digest (per regime)
//   136 template_partition_incomplete partition key set != snapshot section set (missing OR extra)
//   137 template_section_unmapped     capsule projects a section absent from the pinned snapshot
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import {
  TEMPLATE_REGIMES,
  TEMPLATE_SNAPSHOT_DIGESTS,
  PARTITIONS,
  PARTITION_CLASSES,
} from "../constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILES = {
  gpai_art55: "gpai-art55-template.snapshot.json",
  art73_high_risk_draft: "art73-draft-template.snapshot.json",
};

export const setEqual = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

export function loadTemplates() {
  const out = {};
  for (const regime of TEMPLATE_REGIMES)
    out[regime] = JSON.parse(readFileSync(join(HERE, "..", "template", FILES[regime]), "utf8"));
  return out;
}

export function verifyTemplateBindings(capsule, templates, opts = {}) {
  const partitions = opts.partitions ?? PARTITIONS;
  for (const regime of TEMPLATE_REGIMES) {
    const binding = (capsule.template_bindings ?? []).find((b) => b.regime === regime);
    const snapshot = templates[regime];
    if (
      !binding ||
      binding.template_snapshot_digest !== recordDigest(snapshot) ||
      binding.template_snapshot_digest !== TEMPLATE_SNAPSHOT_DIGESTS[regime] ||
      binding.partition_digest !== recordDigest(partitions[regime])
    )
      return { raw: 135, reason: "template_digest_mismatch", detail: { regime } };

    // 136: partition key set must EXACTLY equal the snapshot section set — a missing
    // section OR an extra partition entry both break exhaustiveness.
    const snapshotIds = new Set(snapshot.sections.map((s) => s.section_id));
    const partitionIds = new Set(Object.keys(partitions[regime]));
    if (!setEqual(snapshotIds, partitionIds))
      return { raw: 136, reason: "template_partition_incomplete", detail: { regime } };
    for (const s of snapshot.sections)
      if (!PARTITION_CLASSES.includes(partitions[regime][s.section_id]))
        return {
          raw: 136,
          reason: "template_partition_incomplete",
          detail: { regime, section_id: s.section_id },
        };

    // 137: capsule may only project sections present in the pinned snapshot.
    for (const p of capsule.projected_sections ?? [])
      if (p.regime === regime && !snapshotIds.has(p.section_id))
        return {
          raw: 137,
          reason: "template_section_unmapped",
          detail: { regime, section_id: p.section_id },
        };
  }
  return null;
}
