// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import { certificateDigest, diagnose } from "./dfiCertificate.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function bumpDigest(value) {
  const hex = value.replace(/^sha256:/, "");
  const first = hex[0] === "0" ? "1" : "0";
  return `sha256:${first}${hex.slice(1)}`;
}

export function buildCleanTamperContext() {
  return {
    pack: readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`),
    certificate: readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`),
    manifest: readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`),
    signatureOk: true,
    merkleOk: true,
  };
}

export function mutationFamily() {
  return [
    {
      arm: "sig-byte",
      layer: "A",
      expected_code: "4D_VERIFY_FAILURE",
      expected_reason: "signature_invalid",
    },
    {
      arm: "merkle-node",
      layer: "A",
      expected_code: "4D_VERIFY_FAILURE",
      expected_reason: "merkle_root_mismatch",
    },
    { arm: "binding", layer: "B", expected_code: 25, expected_reason: "pack_binding_mismatch" },
    { arm: "policy", layer: "B", expected_code: 23, expected_reason: "policy_digest_mismatch" },
    { arm: "premise", layer: "B", expected_code: 22, expected_reason: "premise_digest_mismatch" },
    {
      arm: "lattice-digest",
      layer: "B",
      expected_code: 26,
      expected_reason: "lattice_digest_mismatch",
    },
    { arm: "lattice-step", layer: "B", expected_code: 26, expected_reason: "proof_step_unsound" },
    { arm: "proof-step", layer: "B", expected_code: 26, expected_reason: "proof_step_missing" },
  ];
}

function mutateContext(ctx, arm) {
  const next = structuredClone(ctx);
  if (arm.arm === "sig-byte") next.signatureOk = false;
  if (arm.arm === "merkle-node") next.merkleOk = false;
  if (arm.arm === "binding") {
    next.certificate.base_pack_digest = bumpDigest(next.certificate.base_pack_digest);
  }
  if (arm.arm === "policy") {
    next.pack.policy_bundle.policy_version = `${next.pack.policy_bundle.policy_version}-tampered`;
  }
  if (arm.arm === "premise") {
    next.pack.replay_material.act_000.taint_derivation_inputs.sources[0].label = "trusted";
  }
  if (arm.arm === "lattice-digest") {
    next.certificate.lattice_digest = bumpDigest(next.certificate.lattice_digest);
  }
  if (arm.arm === "lattice-step") {
    const step = next.certificate.derivation.lattice_steps[0];
    step.result = step.result === "trusted" ? "untrusted" : "trusted";
  }
  if (arm.arm === "proof-step") next.certificate.derivation.lattice_steps.pop();
  return next;
}

function repairEarlierBindings(ctx, arm) {
  if (arm.layer !== "B" || arm.arm === "binding") return ctx;
  if (ctx.manifest?.certificate_digest) {
    ctx.manifest.certificate_digest = certificateDigest(ctx.certificate);
  }
  if (ctx.manifest?.base_pack_digest) {
    ctx.manifest.base_pack_digest = ctx.certificate.base_pack_digest;
  }
  return ctx;
}

export function applyMutation(ctx, arm) {
  const mutated = repairEarlierBindings(mutateContext(ctx, arm), arm);
  const diagnosis = diagnose(mutated);
  return {
    ...mutated,
    diagnosis,
    passed_steps: diagnosis.code === 26 ? [1, 2, 3, 4, 5, 6, 7] : [],
  };
}

export function buildTamperMatrix(ctx = buildCleanTamperContext()) {
  const clean = diagnose(ctx);
  const results = mutationFamily().map((arm) => {
    const mutated = applyMutation(ctx, arm);
    return {
      arm: arm.arm,
      layer: arm.layer,
      expected_code: arm.expected_code,
      expected_reason: arm.expected_reason,
      code: mutated.diagnosis.code,
      reason: mutated.diagnosis.reason,
      accepted: mutated.diagnosis.code === 0,
    };
  });
  return {
    clean,
    results,
    tampered_accepted_count: results.filter((result) => result.accepted).length,
  };
}
