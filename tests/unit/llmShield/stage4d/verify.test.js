// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { buildEvidencePack, signPack } from "../../../../tools/simurgh-attestation/stage4d/packBuilder.mjs";
import {
  corruptDecision,
  dropOneReceipt,
  injectRawSecret,
  signedLyingDecision,
  swapEmbeddedKey,
} from "../../../../tools/simurgh-attestation/stage4d/tamper.mjs";
import { verifyEvidencePack } from "../../../../tools/simurgh-attestation/stage4d/verifyPack.mjs";

function oneActionRecord(overrides = {}) {
  const record = {
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
      sinks: [{ sink_id: "egress", default_consequence_class: "external_egress" }],
    },
    consequence_lattice: {
      lattice_version: "consequence_lattice.v1",
      order: ["read_only", "external_egress"],
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
  return Object.assign(record, overrides);
}

test("verifyEvidencePack accepts a green pack and writes success layers", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pack = buildEvidencePack({ runRecord: oneActionRecord(), privateKey, publicKey });
  const signature = signPack(pack, privateKey);
  const result = verifyEvidencePack({
    pack,
    signature,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.layers.decision_replay, true);
});

test("verifyEvidencePack rejects post-sign decision tamper with stable reason", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pack = buildEvidencePack({ runRecord: oneActionRecord(), privateKey, publicKey });
  const signature = signPack(pack, privateKey);
  pack.receipts[0].receipt_payload.decision = "block";
  const result = verifyEvidencePack({
    pack,
    signature,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.first_failure.reason, "pack_hash_mismatch");
});

test("verifyEvidencePack rejects validly signed raw-content evidence at privacy layer", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const record = oneActionRecord();
  record.replay_material.act_000.raw_secret = "secret-value";
  const pack = buildEvidencePack({ runRecord: record, privateKey, publicKey });
  const signature = signPack(pack, privateKey);
  const result = verifyEvidencePack({
    pack,
    signature,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.first_failure.reason, "privacy_leak_detected");
});

test("required falsifiers fail with stable reasons", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const pack = buildEvidencePack({ runRecord: oneActionRecord(), privateKey, publicKey });
  const signature = signPack(pack, privateKey);

  assert.equal(
    verifyEvidencePack({ pack: dropOneReceipt(pack), signature, publicKeyPem }).first_failure.reason,
    "pack_hash_mismatch"
  );
  assert.equal(
    verifyEvidencePack({ pack: corruptDecision(pack), signature, publicKeyPem }).first_failure.reason,
    "pack_hash_mismatch"
  );
  assert.equal(
    verifyEvidencePack({ pack: swapEmbeddedKey(pack), signature, publicKeyPem }).first_failure.reason,
    "pack_hash_mismatch"
  );
  assert.equal(
    verifyEvidencePack({ pack: injectRawSecret(pack), signature, publicKeyPem }).first_failure.reason,
    "pack_hash_mismatch"
  );

  const lying = signedLyingDecision({ pack, privateKey });
  assert.equal(
    verifyEvidencePack({
      pack: lying.pack,
      signature: lying.signature,
      publicKeyPem,
    }).first_failure.reason,
    "replayed_decision_mismatch"
  );
});
