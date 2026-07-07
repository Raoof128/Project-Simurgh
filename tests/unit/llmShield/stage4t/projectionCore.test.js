// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC projection + suppression (141/142/143/144). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifyProjection,
  verifySuppression,
} from "../../../../tools/simurgh-attestation/stage4t/core/projectionCore.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

// Census artifacts: one chain bundle (backs epoch_range) and one kernel record set.
const chainArtifact = {
  kind: "stage4s_chain_bundle",
  epoch: "ep1",
  range: "2026-07-01/2026-07-02",
};
const kernelArtifact = {
  kind: "kernel_decision_records",
  epoch: "ep1",
  decisions: [{ decision: "blocked" }, { decision: "allowed" }, { decision: "blocked" }],
};
const chainDigest = recordDigest(chainArtifact);
const kernelDigest = recordDigest(kernelArtifact);
const artifactsByDigest = { [chainDigest]: chainArtifact, [kernelDigest]: kernelArtifact };
const ctx = { chainVerdict: () => 0 };

const greenCapsule = () => ({
  epoch: "ep1",
  evidence_manifest: {
    items: [
      { kind: "stage4s_chain_bundle", digest: chainDigest, epoch: "ep1" },
      { kind: "kernel_decision_records", digest: kernelDigest, epoch: "ep1" },
    ],
  },
  projected_sections: [
    {
      regime: "gpai_art55",
      section_id: "incident_dates",
      class: "evidence_backed",
      value: "2026-07-01/2026-07-02",
      evidence_digest: chainDigest,
      recompute_kind: "epoch_range",
    },
    {
      regime: "gpai_art55",
      section_id: "serious_incident_response",
      class: "evidence_backed",
      value: 2,
      evidence_digest: kernelDigest,
      recompute_kind: "kernel_block_record",
    },
  ],
});

test("green projection passes", () => {
  assert.equal(verifyProjection(greenCapsule(), artifactsByDigest, ctx), null);
});

test("141 when the cited artifact is absent", () => {
  const c = greenCapsule();
  c.projected_sections[0].evidence_digest = "sha256:" + "0".repeat(64);
  assert.equal(verifyProjection(c, artifactsByDigest, ctx).raw, 141);
});

test("142 when the projected value is corrupted", () => {
  const c = greenCapsule();
  c.projected_sections[1].value = 99;
  assert.equal(verifyProjection(c, artifactsByDigest, ctx).raw, 142);
});

test("143 suppression: derivable section marked not_derivable while evidence sealed", () => {
  const c = greenCapsule();
  c.projected_sections[0] = {
    regime: "gpai_art55",
    section_id: "incident_dates",
    class: "not_derivable",
  };
  assert.equal(verifySuppression(c).raw, 143);
});

test("144 suppression: derivable section laundered behind requires_human_input", () => {
  const c = greenCapsule();
  c.projected_sections[0] = {
    regime: "gpai_art55",
    section_id: "incident_dates",
    class: "requires_human_input",
  };
  assert.equal(verifySuppression(c).raw, 144);
});

test("honest absence: not_derivable is legal when the source kind is not in the census", () => {
  const c = greenCapsule();
  // Remove the chain bundle from the census entirely, then mark dates not_derivable.
  c.evidence_manifest.items = c.evidence_manifest.items.filter(
    (i) => i.kind !== "stage4s_chain_bundle"
  );
  c.projected_sections[0] = {
    regime: "gpai_art55",
    section_id: "incident_dates",
    class: "not_derivable",
  };
  assert.equal(verifySuppression(c), null);
});

test("green capsule has no suppression finding", () => {
  assert.equal(verifySuppression(greenCapsule()), null);
});
