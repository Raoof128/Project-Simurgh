// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — browser portable core: digest parity vs the Node core, and it NEVER emits a normative raw 0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { portableCoreVerify } from "../../../../tools/simurgh-attestation/stage5n/browser/vtc-delay-portable.mjs";
import {
  policyDigest,
  decisionDigest,
  outputCommitment,
} from "../../../../tools/simurgh-attestation/stage5n/core/derive.mjs";
import { buildValid } from "./_valid.mjs";

test("portable core reproduces the Node deterministic digests for the valid envelope", () => {
  const { envelope } = buildValid();
  const r = portableCoreVerify(envelope);
  assert.equal(r.core_checks.policy_digest_ok, true);
  assert.equal(r.core_checks.decision_digest_ok, true);
  assert.equal(r.core_checks.seed_ok, true);
  assert.equal(r.core_checks.output_commitment_ok, true);
  assert.equal(r.core_all_ok, true);
  // Cross-check the browser digests equal the Node derivations.
  assert.equal(policyDigest(envelope.delay_policy), envelope.delay_policy_digest);
  assert.equal(decisionDigest(envelope.decision_body), envelope.decision_digest);
});

test("portable core NEVER exposes a normative raw 0 (P0/Task8)", () => {
  const { envelope } = buildValid();
  const r = portableCoreVerify(envelope);
  assert.equal(r.normative_verdict_available, false);
  assert.equal(r.status, "portable_core_verified");
  assert.equal(r.requires_anchor_verifier, "node_or_python");
  assert.ok(!("raw" in r), "must not present a raw code");
});

test("portable core catches a tampered output commitment", () => {
  const { envelope } = buildValid();
  const tampered = {
    ...envelope,
    D_out: outputCommitment({
      ...envelope,
      decision_digest: envelope.decision_digest,
      iteration_count: 1,
      terminal_value: "0".repeat(64),
      delay_policy_digest: envelope.delay_policy_digest,
      start_token_digest: envelope.start_token_digest,
      D_in: envelope.D_in,
      run_id: envelope.run_id,
    }),
  };
  const r = portableCoreVerify(tampered);
  assert.equal(r.core_checks.output_commitment_ok, false);
  assert.equal(r.core_all_ok, false);
});
