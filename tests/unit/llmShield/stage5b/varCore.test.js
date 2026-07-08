// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — evaluateVar frozen order + wrapper (plan Task 8). Motto: AnthropicSafe First,
// then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { keyDigest } from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";
import {
  buildCharter,
  signCharter,
} from "../../../../tools/simurgh-attestation/stage5b/core/charter.mjs";
import {
  tensorCommitment,
  tensorCommitmentRoot,
} from "../../../../tools/simurgh-attestation/stage5b/lanec/ceremonyCore.mjs";
import { tallies } from "../../../../tools/simurgh-attestation/stage5b/core/asrCore.mjs";
import {
  checkSchema,
  signAttestation,
  evaluateVar,
  evaluateVarSafe,
} from "../../../../tools/simurgh-attestation/stage5b/core/varCore.mjs";
import { VAR_SCHEMAS } from "../../../../tools/simurgh-attestation/stage5b/constants.mjs";

const kp = crypto.generateKeyPairSync("ed25519");
const pubPem = kp.publicKey.export({ type: "spki", format: "pem" });
const DECL = "sha256:" + "a".repeat(64);
const SEED = "stage5b-var-seed-v1";
const counts = { conflict_laundering: 2 };

function frozenCapture() {
  const tensors_b64 = { "act:p0:0:5": Buffer.from([1, 2]).toString("base64") };
  const salts = { "act:p0:0:5": "s0" };
  const commitments = { "act:p0:0:5": tensorCommitment("s0", tensors_b64["act:p0:0:5"]) };
  return {
    declaration_digest: DECL,
    commitments,
    salts,
    tensors_b64,
    prompt_token_counts: { p0: 2 },
  };
}

function greenBundle() {
  const charter = signCharter(
    buildCharter({
      seed: SEED,
      familyCounts: counts,
      caps: {},
      charterKeyDigest: keyDigest(pubPem),
      captureDeclarationDigest: DECL,
    }),
    kp.privateKey
  );
  const fc = frozenCapture();
  const capture_binding = {
    schema: VAR_SCHEMAS.CAPTURE_BINDING,
    ceremony: {
      outcome: "captured",
      timestamp: "2026-07-08T00:00:00Z",
      model_id: "m",
      revision_digest: "sha256:r",
      lens_digest: "sha256:l",
      position_rule_id: "all_positions",
      declaration_digest: DECL,
    },
    tensor_commitment_root: tensorCommitmentRoot([
      tensorCommitment("s0", fc.tensors_b64["act:p0:0:5"]),
    ]),
    capture_key_digest: "sha256:" + "c".repeat(64),
    declaration_digest: DECL,
  };
  const findings = [
    {
      attack_id: `${SEED}:conflict_laundering#0`,
      family: "conflict_laundering",
      target_stage: "5a",
      target_raw: 205,
      outcome: "survived",
    },
    {
      attack_id: `${SEED}:conflict_laundering#1`,
      family: "conflict_laundering",
      target_stage: "5a",
      target_raw: 205,
      outcome: "survived",
    },
  ];
  const attestation = signAttestation(
    { schema: VAR_SCHEMAS.ATTESTATION, aggregates: tallies(findings) },
    kp.privateKey
  );
  return {
    charter,
    charter_pub_key_pem: pubPem,
    capture_binding,
    frozen_capture: fc,
    findings,
    attestation,
    attestation_pub_key_pem: pubPem,
    floors: {},
  };
}

test("a clean bundle evaluates GREEN at both tiers", () => {
  assert.equal(evaluateVar(greenBundle(), { tier: "public" }).raw, 0);
  assert.equal(evaluateVar(greenBundle(), { tier: "audit" }).raw, 0);
});

test("210: a charter with a tensor_commitment_root is well-formed → routed to 219, NOT 210", () => {
  const b = greenBundle();
  b.charter.tensor_commitment_root = "sha256:" + "b".repeat(64);
  // schema check passes (extra field ignored)...
  assert.equal(checkSchema(b).raw, 0);
  // ...but re-signing so the campaign check passes, the precommit-structural check trips 219.
  b.charter = signCharter({ ...b.charter }, kp.privateKey);
  assert.equal(evaluateVar(b).raw, 219);
});

test("211: a tampered attestation aggregate breaks the signature", () => {
  const b = greenBundle();
  b.attestation.aggregates.bypass = 9; // mutate signed body
  assert.equal(evaluateVar(b).raw, 211);
});

test("214: a non-reconciling capture is caught (No Author's Map)", () => {
  const b = greenBundle();
  b.frozen_capture.tensors_b64["act:p0:0:5"] = Buffer.from([9, 9]).toString("base64");
  assert.equal(evaluateVar(b).raw, 214);
});

test("222: a hand-edited ASR is caught", () => {
  const b = greenBundle();
  b.attestation = signAttestation(
    { schema: VAR_SCHEMAS.ATTESTATION, aggregates: { ...tallies(b.findings), asr: "9/9" } },
    kp.privateKey
  );
  // add asr to aggregates so 222 fires (tallies has no asr; add via re-sign)
  const r = evaluateVar(b);
  assert.ok(r.raw === 222 || r.raw === 223, `got ${r.raw}`);
});

test("224: evaluateVarSafe wraps an internal exception (never reached by normal order)", () => {
  // pass a bundle that throws inside a check (findings not iterable after schema passes is
  // impossible; force via a getter that throws)
  const b = greenBundle();
  Object.defineProperty(b, "findings", {
    get() {
      throw new Error("boom");
    },
  });
  assert.equal(evaluateVarSafe(b).raw, 224);
});
