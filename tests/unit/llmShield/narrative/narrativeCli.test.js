// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildModelSlotsFromGatewayRun,
  buildVerifiedArtifact,
} from "../../../../tools/simurgh-narrative/simurgh-narrative.mjs";
import { buildEvidenceDigest } from "../../../../tools/simurgh-narrative/evidenceDigest.mjs";
import { hashPrompt } from "../../../../src/llmShield/promptNormalise.js";
import { MODEL_SLOTS_SCHEMA } from "../../../../tools/simurgh-narrative/claimChecker.mjs";

const outputText = JSON.stringify({
  type: MODEL_SLOTS_SCHEMA,
  source: {},
  slots: [
    {
      slot_id: "chain",
      evidence_ref: "audit_chain_valid",
      operator: "==",
      expected_value: true,
      severity: "integrity_signal_present",
      wording: "chain_valid",
    },
  ],
});
const digest = buildEvidenceDigest({
  sessionHash: "sha256:s",
  sourceInputs: [],
  audit_chain_valid: true,
  daemon_proof_counts: {},
  gateway: {},
  vca: {},
  privacy: {},
});

test("buildModelSlotsFromGatewayRun binds output hash to the receipt", () => {
  const receipt = { output_hash: hashPrompt(outputText) };
  const r = buildModelSlotsFromGatewayRun({ outputText, receipt });
  assert.equal(r.ok, true);
  assert.equal(r.modelSlots.source.gateway_output_hash, hashPrompt(outputText));
  const bad = buildModelSlotsFromGatewayRun({
    outputText,
    receipt: { output_hash: "sha256:nope" },
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.violation, "receipt_binding_mismatch");
  const dirty = buildModelSlotsFromGatewayRun({
    outputText: "Sure:\n" + outputText,
    receipt: { output_hash: "x" },
  });
  assert.equal(dirty.violation, "narrative_schema_violation");
});

test("buildVerifiedArtifact renders only verified slots, no finding, explicit accounting", () => {
  const receipt = { output_hash: hashPrompt(outputText) };
  const { modelSlots } = buildModelSlotsFromGatewayRun({ outputText, receipt });
  const art = buildVerifiedArtifact({ digest, modelSlots });
  assert.equal(art.type, "simurgh.defensive_narrative.verified_artifact.v1");
  assert.equal(art.claim_check_passed, true);
  assert.equal(art.all_slots_verified, true);
  assert.equal(art.automatic_finding_made, false);
  assert.match(art.rendered_summary, /audit chain/i);
});
