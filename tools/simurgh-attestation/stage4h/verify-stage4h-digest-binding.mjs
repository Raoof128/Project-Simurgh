#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyEvidencePack } from "../stage4d/verifyPack.mjs";
import { buildPremiseSet, premiseDigest } from "./canonicalPremises.mjs";
import { certificateDigest, validateDerivation } from "./dfiCertificate.mjs";
import { RAW_VERIFIER_CODES, stage4CodeForRawCode } from "./exitCodes.mjs";
import { verifyPackBinding } from "./packBinding.mjs";
import { validateDfiCertificate, validateSignedPackManifest } from "./schema.mjs";

async function stable(value) {
  const json = JSON.stringify(value, null, 2) + "\n";
  try {
    const prettier = await import("prettier");
    return await prettier.format(json, { parser: "json" });
  } catch {
    return json;
  }
}

function arg(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
}

function codeForBindingReason(reason) {
  if (reason === "schema_invalid") {
    return RAW_VERIFIER_CODES.SCHEMA_INVALID;
  }
  if (reason === "proof_system_unsupported") {
    return RAW_VERIFIER_CODES.PROOF_SYSTEM_UNSUPPORTED;
  }
  if (reason === "premise_digest_mismatch") {
    return RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH;
  }
  if (reason === "policy_or_lattice_digest_mismatch") {
    return RAW_VERIFIER_CODES.POLICY_DIGEST_MISMATCH;
  }
  return RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH;
}

async function writeResult(outPath, result) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, await stable(result));
}

function baseResult({ code, reason, certificate, premises = null }) {
  return {
    ok: code === RAW_VERIFIER_CODES.OK,
    code,
    stage4_code: stage4CodeForRawCode(code),
    gate: "Q0/Q1/Q2/Q4/Q5",
    certificate_digest: certificate ? certificateDigest(certificate) : null,
    premise_digest: certificate?.premise_digest ?? null,
    base_pack_digest: certificate?.base_pack_digest ?? null,
    recomputed_premise_digest: premises ? premiseDigest(premises) : null,
    falsifier: code === RAW_VERIFIER_CODES.OK ? null : reason,
    note:
      code === RAW_VERIFIER_CODES.OK
        ? "explicit-flow derivation, premise digest, manifest digest binding, and Ed25519 signature accepted"
        : reason,
  };
}

async function finish({ outPath, code, reason, certificate, premises = null }) {
  await writeResult(outPath, baseResult({ code, reason, certificate, premises }));
  console.log(
    code === RAW_VERIFIER_CODES.OK
      ? "Stage 4H.2 Q0/Q1/Q2/Q4/Q5 verifier discrimination: PASS"
      : `Stage 4H.2 Q0/Q1/Q2/Q4/Q5 verifier discrimination: FAIL ${reason}`
  );
  if (code !== RAW_VERIFIER_CODES.OK) process.exitCode = code;
  return code;
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const basePackPath = arg(argv, "--base-pack");
  const basePackSigPath = arg(argv, "--base-pack-sig");
  const basePackPubkeyPath = arg(argv, "--base-pack-pubkey");
  const certificatePath = arg(argv, "--certificate");
  const manifestPath = arg(argv, "--manifest");
  const publicKeyPath = arg(argv, "--manifest-pubkey");
  const outPath = arg(argv, "--out");
  if (
    !basePackPath ||
    !basePackSigPath ||
    !basePackPubkeyPath ||
    !certificatePath ||
    !manifestPath ||
    !publicKeyPath ||
    !outPath
  ) {
    throw new Error(
      "usage: verify-stage4h-digest-binding --base-pack <json> --base-pack-sig <sig> --base-pack-pubkey <pem> --certificate <json> --manifest <json> --manifest-pubkey <pem> --out <json>"
    );
  }

  const certificate = JSON.parse(await readFile(certificatePath, "utf8"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  const certificateSchema = validateDfiCertificate(certificate);
  if (!certificateSchema.ok) {
    return finish({
      outPath,
      code: codeForBindingReason(certificateSchema.reason),
      reason: certificateSchema.reason,
      certificate,
    });
  }

  const manifestSchema = validateSignedPackManifest(manifest);
  if (!manifestSchema.ok) {
    return finish({
      outPath,
      code: codeForBindingReason(manifestSchema.reason),
      reason: manifestSchema.reason,
      certificate,
    });
  }

  const basePack = JSON.parse(await readFile(basePackPath, "utf8"));
  const basePackSignature = (await readFile(basePackSigPath, "utf8")).trim();
  const basePackPublicKeyPem = await readFile(basePackPubkeyPath, "utf8");
  const basePackVerification = verifyEvidencePack({
    pack: basePack,
    signature: basePackSignature,
    publicKeyPem: basePackPublicKeyPem,
  });
  if (!basePackVerification.ok) {
    return finish({
      outPath,
      code: RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
      reason: `base_pack_verify_failed:${basePackVerification.first_failure?.reason || "unknown"}`,
      certificate,
    });
  }

  const premises = buildPremiseSet(basePack);
  if (
    certificate.base_pack_digest !== premises.base_pack_digest ||
    certificate.replay_root !== premises.replay_root ||
    certificate.premise_digest !== premiseDigest(premises)
  ) {
    return finish({
      outPath,
      code: RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH,
      reason: "premise_digest_mismatch",
      certificate,
      premises,
    });
  }
  if (
    certificate.policy_digest !== premises.policy_digest ||
    certificate.lattice_digest !== premises.lattice_digest
  ) {
    return finish({
      outPath,
      code: RAW_VERIFIER_CODES.POLICY_DIGEST_MISMATCH,
      reason: "policy_or_lattice_digest_mismatch",
      certificate,
      premises,
    });
  }

  const publicKey = createPublicKey(await readFile(publicKeyPath, "utf8"));
  const binding = verifyPackBinding({ certificate, manifest, publicKey });
  if (!binding.ok) {
    const reason = binding.reason;
    return finish({
      outPath,
      code: codeForBindingReason(reason),
      reason,
      certificate,
      premises,
    });
  }

  const derivation = validateDerivation({ premises, certificate });
  if (!derivation.ok) {
    return finish({
      outPath,
      code: derivation.code,
      reason: derivation.reason,
      certificate,
      premises,
    });
  }

  return finish({
    outPath,
    code: RAW_VERIFIER_CODES.OK,
    reason: null,
    certificate,
    premises,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h verify: ${error.message}`);
    process.exit(29);
  });
}
