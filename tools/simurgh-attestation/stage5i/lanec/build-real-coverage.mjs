// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I Lane C — derive a section partition from the REAL Opus 4.6 public TOC snapshot (offline,
// S1-reproducible). producer_principal is MODELED and honestly labeled; per-section redaction_types
// stay [] (report-level taxonomy only). The real independent-party ceremony is PENDING (droplet team);
// this ships the real-structure partition + a fail-closed campaign record, never masquerading as done.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../core/digests.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
export const REAL_DIR = join(ROOT, "docs/research/llm-shield/evidence/stage-5i/real-structure");
const TOC = join(HERE, "opus-4-6-sabotage-risk-report.toc.json");

// The frozen toc-leaf-partition procedure: NFC-normalise + canonical-sort leaf sections; per-section
// redaction_types = [] (we do NOT invent section-level redaction metadata — S7/§4.1).
export function derivePartition(tocPath = TOC) {
  const toc = JSON.parse(readFileSync(tocPath, "utf8"));
  const sections = toc.leaf_sections
    .map((s) => ({
      section_id: s.section_id.normalize("NFC"),
      canonical_path: s.canonical_path.normalize("NFC"),
      redaction_types: [],
    }))
    .sort((a, b) => (a.section_id < b.section_id ? -1 : a.section_id > b.section_id ? 1 : 0));
  return {
    source_report: {
      title: toc.report_reference.title,
      published: toc.report_reference.published,
      publisher: toc.report_reference.publisher, // NOTE: publisher (Anthropic) ≠ modeled evidence producer (S7)
      redaction_taxonomy: ["misuse_risk", "commercial_proprietary"],
    },
    partition_procedure: toc.partition_procedure,
    sections,
  };
}

export function buildRealStructure(outDir = REAL_DIR) {
  const partition = derivePartition();
  const campaign = {
    status: "pending",
    campaign_id: "vpc-lanec-opus46-2026-07-11",
    reason:
      "awaiting real independent-party (droplet-team) split-review ceremony over the public structure",
    claim: "public_report_structure_coverage",
    non_claim:
      "NOT rsp_unredacted_report_compliance; does not observe Anthropic's confidential report or actual review panel; affiliation axis modeled",
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "partition.json"), canonicalJson(partition) + "\n");
  writeFileSync(join(outDir, "campaign-outcome.json"), canonicalJson(campaign) + "\n");
  return { partition, campaign, outDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { partition, outDir } = buildRealStructure();
  console.log(
    `Lane C real-structure (${partition.sections.length} leaf sections, status=pending) → ${outDir}`
  );
}
