// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { buildEvidencePack } from "../../../../tools/simurgh-attestation/stage4d/packBuilder.mjs";

function baseRunRecord() {
  return {
    run_manifest: {
      run_id: "stage4d-browser-inject-01",
      parent_session: "session_stage4d_browser_inject_01",
      mode: "recorded_fixture",
      fixture_id: "browser_inject_01",
      model_identity_committed: "self-reported-fixture-model",
      model_identity_origin: "self_reported",
    },
    policy_bundle: {
      policy_version: "policy.v1",
      modes: {
        balanced: {
          block_untrusted_to_external_egress: true,
          block_authority_escalation: true,
          block_untrusted_to_secret_export: true,
          block_untrusted_to_destructive_mutation: true,
        },
      },
    },
    sink_registry: {
      registry_version: "sinks.v1",
      sinks: [
        { sink_id: "egress", default_consequence_class: "external_egress" },
        { sink_id: "authority_escalation", default_consequence_class: "internal_mutation" },
      ],
    },
    consequence_lattice: {
      lattice_version: "consequence_lattice.v1",
      order: ["read_only", "internal_mutation", "external_egress"],
    },
    action_observation_log: [
      {
        event_version: "simurgh.stage4d.observation.v1",
        run_id: "stage4d-browser-inject-01",
        parent_session: "session_stage4d_browser_inject_01",
        action_id: "act_000",
        step_index: 0,
        action_type: "tool_call",
        sink_id: "egress",
        consequence_class: "external_egress",
        boundary_id: "gateway_mediator_v1",
      },
    ],
    replay_material: {
      act_000: {
        resolved_args_redacted: {
          tool_name: "send_email",
          recipient_scope: "known_contact",
          body_digest: "0".repeat(64),
          contains_secret_marker: false,
        },
        policy_features_source: {
          sink_id: "egress",
          input_sources: ["user_task"],
          requires_authority: true,
          external_effect: true,
          user_explicitly_authorised: true,
        },
        taint_derivation_inputs: {
          sources: [{ source_id: "user_task", label: "trusted" }],
          authority_sink: true,
        },
        decision_context: {
          prior_decision_count: 0,
          rate_limit_bucket: "fixture_bucket_0",
          policy_mode: "balanced",
        },
      },
    },
    decisions: [
      {
        action_id: "act_000",
        decision: "allow",
        decision_reason_code: "POLICY_ALLOWED",
        input_integrity_summary: "trusted_only",
        decision_input: { policy_mode: "balanced", untrusted_reached_authority: false },
      },
    ],
  };
}

test("buildEvidencePack emits observation hashes, receipts, completeness, non-claims, and pack hash", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pack = buildEvidencePack({ runRecord: baseRunRecord(), privateKey, publicKey });
  assert.equal(pack.pack_version, "simurgh.evidence_pack.v1");
  assert.equal(pack.receipts.length, 1);
  assert.equal(pack.completeness_manifest.observed_action_count, 1);
  assert.equal(pack.completeness_manifest.receipt_count, 1);
  assert.match(pack.pack_hash, /^[0-9a-f]{64}$/);
  assert.equal(pack.non_claims.not_model_safety, true);
  assert.notEqual(
    pack.receipts[0].receipt_payload.decision_input.policy_features_digest,
    pack.receipts[0].receipt_payload.decision_input.resolved_args_digest
  );
});
