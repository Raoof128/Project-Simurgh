import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  derivePartition,
  buildRealStructure,
} from "../../../../tools/simurgh-attestation/stage5i/lanec/build-real-coverage.mjs";
import { laneCGate } from "../../../../tools/simurgh-attestation/stage5i/node/lanec-gate.mjs";
import { runDropletCeremony } from "../../../../tools/simurgh-attestation/stage5i/lanec/run-droplet-ceremony.mjs";

test("Lane C: real Opus 4.6 TOC derives a valid partition structure (public structure only)", () => {
  const pc = derivePartition();
  assert.ok(pc.sections.length >= 30, "real report has many leaf sections");
  const ids = pc.sections.map((s) => s.section_id);
  assert.equal(new Set(ids).size, ids.length, "section ids unique");
  assert.deepEqual(ids, [...ids].sort(), "canonically sorted");
  assert.ok(
    pc.sections.every(
      (s) =>
        typeof s.section_id === "string" &&
        typeof s.canonical_path === "string" &&
        Array.isArray(s.redaction_types) &&
        s.redaction_types.length === 0
    ),
    "well-formed sections, no invented per-section redaction metadata"
  );
  // publisher (Anthropic) is recorded, distinct from any modeled evidence producer (S7)
  assert.equal(pc.source_report.publisher, "Anthropic");
  // Pathway 5 (self-exfiltration) — the kind of section VPC's fragility map surfaces — is present.
  assert.ok(ids.includes("6.5"));
});

test("Lane C: committed campaign is honestly PENDING; gate passes pending", () => {
  const { campaign } = buildRealStructure(mkdtempSync(join(tmpdir(), "vpc-lanec-")));
  assert.equal(campaign.status, "pending");
  assert.equal(campaign.claim, "public_report_structure_coverage");
  assert.match(campaign.non_claim, /NOT rsp_unredacted_report_compliance/);
  assert.equal(laneCGate().ok, true); // committed pending state
});

test("Lane C gate is fail-closed: completed without a pack is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "vpc-lanec-fc-"));
  writeFileSync(join(dir, "campaign-outcome.json"), JSON.stringify({ status: "completed" }));
  assert.equal(laneCGate(dir).ok, false);
  assert.equal(laneCGate(dir).reason, "completed_without_pack");
  // and a missing record fails closed too
  assert.equal(laneCGate(mkdtempSync(join(tmpdir(), "vpc-lanec-empty-"))).ok, false);
});

test("Lane C droplet ceremony runner: full ceremony over the real 37-section structure verifies raw 0", () => {
  const r = runDropletCeremony();
  assert.equal(r.pub.raw, 0, "public");
  assert.equal(r.aud.raw, 0, "audit");
  assert.equal(r.sections, 37, "real Opus 4.6 leaf-section count");
  assert.equal(r.bundle.coverage_receipts.length, 2, "≥2 reviewers");
  assert.equal(r.bundle.attestation.content.coverage_gap.length, 0, "full coverage");
});
