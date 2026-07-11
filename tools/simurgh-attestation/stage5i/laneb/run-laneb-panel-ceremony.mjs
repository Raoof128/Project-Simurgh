// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I Lane B — deterministic multi-process panel ceremony (reproduce-gated, not npm test).
// Topology: this orchestrator (coordinator/issuer/verifier) + one child process PER reviewer. Each
// reviewer child signs only its own receipt (sees only its grant). ≥2 reviewers, ∀r C(r) ⊂ S, ⋃C = S.
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { buildSignedBundle } from "../node/buildSignedBundle.mjs";
import { laneKeys, lanePanelSpec } from "../node/laneKeys.mjs";
import { makeAdapterFacts } from "../node/adapter.mjs";
import { vpcVerify } from "../core/vpcCore.mjs";

const CHILD = join(dirname(fileURLToPath(import.meta.url)), "reviewer-child.mjs");

export function runCeremony() {
  const keys = laneKeys();
  const { sections, panel } = lanePanelSpec(keys);
  const S = new Set(sections.map((s) => s.section_id));

  // Each reviewer's receipt is signed in a SEPARATE child process.
  const signReceipt = (privatePem, _domain, content) => {
    const out = execFileSync(process.execPath, [CHILD], {
      input: JSON.stringify({ content, privatePem }),
      encoding: "utf8",
    });
    return JSON.parse(out).signature;
  };

  const { bundle, external_config } = buildSignedBundle(keys, { sections, panel, signReceipt });
  const res = vpcVerify(bundle, external_config, makeAdapterFacts(bundle, external_config), {
    tier: "audit",
  });

  // Ceremony invariants: real panel, no single reviewer covers all, union = S.
  const reviewers = bundle.coverage_receipts.length;
  const nontrivial = bundle.coverage_receipts.every(
    (c) => c.content.evaluated_sections.length < S.size
  );
  const union = new Set(bundle.coverage_receipts.flatMap((c) => c.content.evaluated_sections));
  const fullCover = [...S].every((s) => union.has(s));

  return { raw: res.raw, reviewers, nontrivial, fullCover, bundle, external_config };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = runCeremony();
  console.log(
    `Lane B ceremony: raw=${r.raw} reviewers=${r.reviewers} nontrivial=${r.nontrivial} fullCover=${r.fullCover}`
  );
  process.exit(r.raw === 0 && r.reviewers >= 2 && r.nontrivial && r.fullCover ? 0 : 1);
}
