// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPremiseSet } from "../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";
import {
  certificateDigest,
  checkBinding,
  checkLatticeDigest,
  diagnose,
} from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";
import {
  PROOF_TAMPER_DETECTED,
  RAW_VERIFIER_CODES,
  STRUCTURE_REASONS,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function cleanContext() {
  const pack = readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`);
  const certificate = readJson(
    `${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`
  );
  const manifest = readJson(
    `${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`
  );
  return { pack, certificate, manifest, signatureOk: true, merkleOk: true };
}

function withShapeValidDigest(value) {
  const hex = value.replace(/^sha256:/, "");
  const first = hex[0] === "0" ? "1" : "0";
  return `sha256:${first}${hex.slice(1)}`;
}

function repairManifestCertificateDigest(ctx) {
  ctx.manifest.certificate_digest = certificateDigest(ctx.certificate);
  return ctx;
}

test("Stage 4H.3 keeps raw 26 numeric value under proof_structure_invalid", () => {
  assert.equal(RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID, 26);
  assert.equal(PROOF_TAMPER_DETECTED, RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID);
  assert.equal(STRUCTURE_REASONS.includes("lattice_digest_mismatch"), true);
  assert.equal(STRUCTURE_REASONS.includes("proof_step_missing"), true);
});

test("Stage 4H.3 checkLatticeDigest rejects only the pinned lattice digest mismatch", () => {
  const ctx = cleanContext();
  const premises = buildPremiseSet(ctx.pack);
  assert.deepEqual(checkLatticeDigest(ctx.certificate, premises.lattice_digest), {
    ok: true,
    code: 0,
  });
  const tampered = structuredClone(ctx.certificate);
  tampered.lattice_digest = withShapeValidDigest(tampered.lattice_digest);
  assert.deepEqual(checkLatticeDigest(tampered, premises.lattice_digest), {
    ok: false,
    code: 26,
    reason: "lattice_digest_mismatch",
  });
});

test("Stage 4H.3 diagnose accepts a fully clean Q0 certificate", () => {
  const result = diagnose(cleanContext());
  assert.equal(result.code, 0);
  assert.equal(result.ok, true);
});

test("Stage 4H.3 diagnose tie-break reports policy before lattice", () => {
  const ctx = cleanContext();
  ctx.pack.policy_bundle.policy_version = "policy.v1-mutated";
  ctx.certificate.lattice_digest = withShapeValidDigest(ctx.certificate.lattice_digest);
  repairManifestCertificateDigest(ctx);
  const result = diagnose(ctx);
  assert.equal(result.code, 23);
  assert.equal(result.reason, "policy_digest_mismatch");
});

test("Stage 4H.3 checkBinding reports real pack/certificate binding mismatch", () => {
  const ctx = cleanContext();
  ctx.manifest.base_pack_digest = `sha256:${"0".repeat(64)}`;
  const result = checkBinding(ctx);
  assert.equal(result.code, 25);
  assert.equal(result.reason, "pack_binding_mismatch");
});

test("Stage 4H.3 schema owns nested unknown keys before Q7", () => {
  const ctx = cleanContext();
  ctx.certificate.derivation.lattice_steps[0].leak = "raw";
  const result = diagnose(ctx);
  assert.equal(result.code, 20);
  assert.equal(result.reason, "unknown_field");
});

test("Stage 4H.3 no_short_circuit_masking: clean through step 8 reaches step 9 proof missing", () => {
  const ctx = cleanContext();
  ctx.certificate.derivation.lattice_steps.pop();
  repairManifestCertificateDigest(ctx);
  const result = diagnose(ctx);
  assert.equal(result.code, 26);
  assert.equal(result.reason, "proof_step_missing");
});

test("Stage 4H.3 validator distinguishes Q6 proof-step reasons without breaking Q4c", () => {
  const ctx = cleanContext();
  const missing = structuredClone(ctx);
  missing.certificate.derivation.lattice_steps.pop();
  repairManifestCertificateDigest(missing);
  assert.equal(diagnose(missing).reason, "proof_step_missing");

  const unsound = structuredClone(ctx);
  unsound.certificate.derivation.lattice_steps[0].result =
    unsound.certificate.derivation.lattice_steps[0].result === "trusted" ? "untrusted" : "trusted";
  repairManifestCertificateDigest(unsound);
  assert.equal(diagnose(unsound).reason, "proof_step_unsound");

  const dirtyPack = readJson(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`);
  const q4c = readJson(`${fixtureRoot}/q4c-derivation-scope-omission-certificate.json`);
  assert.equal(
    diagnose({ pack: dirtyPack, certificate: q4c, manifest: null }).reason,
    "derivation_scope_incomplete"
  );
});
