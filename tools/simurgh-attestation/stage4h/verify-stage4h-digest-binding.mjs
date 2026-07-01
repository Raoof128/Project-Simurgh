#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyEvidencePack } from "../stage4d/verifyPack.mjs";
import { buildPremiseSet, premiseDigest } from "./canonicalPremises.mjs";
import { certificateDigest, diagnose } from "./dfiCertificate.mjs";
import { RAW_VERIFIER_CODES, stage4CodeForRawCode } from "./exitCodes.mjs";
import { runOffline, scanForModelClients } from "./offlineHarness.mjs";
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
  if (reason === "schema_invalid" || reason === "unknown_field" || reason === "duplicate_key") {
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
    gate: code === RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE ? "Q3" : "Q0/Q1/Q2/Q4/Q5",
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

function normalizeVerifierRawCode(code) {
  if (code === "4D_VERIFY_FAILURE") return RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH;
  return Number.isInteger(code) ? code : RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED;
}

async function finish({ outPath, code, reason, certificate, premises = null }) {
  const rawCode = normalizeVerifierRawCode(code);
  await writeResult(outPath, baseResult({ code: rawCode, reason, certificate, premises }));
  console.log(
    rawCode === RAW_VERIFIER_CODES.OK
      ? "Stage 4H.5 verifier: PASS"
      : `Stage 4H.5 verifier: FAIL ${reason}`
  );
  process.exitCode = stage4CodeForRawCode(rawCode);
  return rawCode;
}

export async function runVerifierCore({ argv = process.argv.slice(2) } = {}) {
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
  const publicKey = createPublicKey(await readFile(publicKeyPath, "utf8"));
  const binding = verifyPackBinding({ certificate, manifest, publicKey });
  if (
    !binding.ok &&
    !["base_pack_digest_mismatch", "certificate_digest_mismatch"].includes(binding.reason)
  ) {
    const reason = binding.reason;
    return finish({
      outPath,
      code: codeForBindingReason(reason),
      reason,
      certificate,
      premises,
    });
  }

  const diagnosis = diagnose({ pack: basePack, certificate, manifest });
  if (!diagnosis.ok) {
    return finish({
      outPath,
      code: diagnosis.code,
      reason: diagnosis.reason,
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

export async function main({ argv = process.argv.slice(2) } = {}) {
  const outPath = arg(argv, "--out");
  const scan = await scanForModelClients(new URL(import.meta.url).pathname, {
    allowedPaths: [new URL("./offlineHarness.mjs", import.meta.url).pathname],
  });
  if (!scan.ok && outPath) {
    return finish({
      outPath,
      code: RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE,
      reason: scan.reason,
      certificate: null,
    });
  }
  if (!scan.ok) {
    throw new Error(`Stage 4H checker static offline scan failed: ${scan.reason}`);
  }
  const offline = await runOffline(() => runVerifierCore({ argv }));
  if (!offline.ok && outPath) {
    return finish({
      outPath,
      code: RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE,
      reason: offline.reason,
      certificate: null,
    });
  }
  if (!offline.ok) {
    throw new Error(`Stage 4H checker offline preflight failed: ${offline.reason}`);
  }
  return offline.value;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h verify: ${error.message}`);
    process.exit(stage4CodeForRawCode(RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED));
  });
}
