#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPrivateKey, createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { STAGE4D_EVIDENCE_DIR, STAGE4H_EVIDENCE_DIR } from "./constants.mjs";
import { certificateDigest, buildDfiCertificate } from "./dfiCertificate.mjs";
import { RAW_VERIFIER_CODES, stage4CodeForRawCode } from "./exitCodes.mjs";
import { buildSignedPackManifest, verifyPackBinding } from "./packBinding.mjs";

const stable = (value) => JSON.stringify(value, null, 2) + "\n";
const WRONG_BASE_PACK_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAuqH7hI0ASnLLnjkeMnVAi6IeKvwhxC7+cif/RoiTa/8=
-----END PUBLIC KEY-----
`;

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stable(value));
}

export async function main({ root = process.cwd() } = {}) {
  const pack = JSON.parse(
    await readFile(join(root, STAGE4D_EVIDENCE_DIR, "evidence-pack.json"), "utf8")
  );
  const signature = await readFile(join(root, STAGE4D_EVIDENCE_DIR, "evidence-pack.sig"), "utf8");
  const signerPub = await readFile(join(root, STAGE4D_EVIDENCE_DIR, "signer.pub"), "utf8");
  const manifestPrivateKeyPem = await readFile(
    join(root, "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"),
    "utf8"
  );
  const manifestPublicKeyPem = await readFile(
    join(root, "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-public.pem"),
    "utf8"
  );
  const manifestPrivateKey = createPrivateKey(manifestPrivateKeyPem);
  const manifestPublicKey = createPublicKey(manifestPublicKeyPem);
  const certificate = buildDfiCertificate({ pack });
  const forgedPremiseDigestCertificate = {
    ...certificate,
    premise_digest: `sha256:${"0".repeat(64)}`,
  };
  const malformedCertificate = { ...certificate, unexpected: true };
  const tamperedBasePack = {
    ...pack,
    run_manifest: { ...pack.run_manifest, stage4h_tamper: true },
  };
  const manifest = buildSignedPackManifest({ certificate, privateKey: manifestPrivateKey });
  const binding = verifyPackBinding({ certificate, manifest, publicKey: manifestPublicKey });
  const verifierResults = {
    ok: binding.ok,
    code: binding.ok ? RAW_VERIFIER_CODES.OK : RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
    stage4_code: stage4CodeForRawCode(binding.ok ? 0 : RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH),
    gate: "Q2/Q5",
    certificate_digest: certificateDigest(certificate),
    premise_digest: certificate.premise_digest,
    base_pack_digest: certificate.base_pack_digest,
  };
  const qGateResults = {
    stage: "4H.0",
    status: "digest_binding_foundation_only",
    gates: {
      Q0: { status: "not_in_scope" },
      Q1: { status: "not_in_scope" },
      Q2: { status: "pass", raw_verifier_code: 0 },
      Q3: { status: "not_in_scope" },
      Q4: { status: "not_in_scope" },
      Q5: { status: "pass", raw_verifier_code: 0 },
      Q6: { status: "not_in_scope" },
      Q7: { status: "not_in_scope" },
    },
    non_claims: ["dfi_soundness", "derivation_validity", "implicit_flow_security"],
  };
  const fixtureRoot = join(root, "tests/fixtures/llmShield/stage4h");
  await writeJson(join(fixtureRoot, "clean-base-pack.json"), pack);
  await writeJson(join(fixtureRoot, "tampered-base-pack.json"), tamperedBasePack);
  await writeFile(join(fixtureRoot, "clean-base-pack.sig"), signature);
  await writeFile(join(fixtureRoot, "wrong-base-pack.sig"), "base64:ZmFrZQ==\n");
  await writeFile(join(fixtureRoot, "clean-signer.pub"), signerPub);
  await writeFile(join(fixtureRoot, "wrong-base-pack.pub"), WRONG_BASE_PACK_PUBLIC_KEY_PEM);
  await writeJson(join(fixtureRoot, "clean-dfi-certificate.json"), certificate);
  await writeJson(join(fixtureRoot, "malformed-certificate.json"), malformedCertificate);
  await writeJson(join(fixtureRoot, "clean-signed-pack-manifest.json"), manifest);
  await writeFile(join(fixtureRoot, "manifest-verifier.pub"), manifestPublicKeyPem);
  await writeJson(
    join(fixtureRoot, "forged-premise-digest-certificate.json"),
    forgedPremiseDigestCertificate
  );
  await writeJson(join(fixtureRoot, "expected-results/q2-q5-results.json"), verifierResults);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "certificate.json"), certificate);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "signed-pack-manifest.json"), manifest);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "verifier-results.json"), verifierResults);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "q-gate-results.json"), qGateResults);
  await writeFile(
    join(root, STAGE4H_EVIDENCE_DIR, "README.md"),
    "# Stage 4H Evidence\n\nStage 4H.0 evidence covers digest and binding foundation only. Q1, Q3, Q4, Q6, and Q7 remain not in scope until later milestones.\n"
  );
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h fixture build: ${error.message}`);
    process.exit(29);
  });
}
