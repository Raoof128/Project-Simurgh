#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, publicKeyFingerprint } from "../stage4d/stage4dCrypto.mjs";
import { verifyEvidencePack } from "../stage4d/verifyPack.mjs";
import { certificateDigest, diagnose } from "../stage4h/dfiCertificate.mjs";
import { RAW_VERIFIER_CODES, stage4CodeForRawCode } from "../stage4h/exitCodes.mjs";
import { runOffline, scanForModelClients } from "../stage4h/offlineHarness.mjs";
import { checkBudgets } from "./extractionBudgetGate.mjs";
import { EbaSchemaError, buildLedger, ledgerDigest } from "./extractionLedger.mjs";
import { attestationDigest, budgetPolicyDigest, verifyEbaManifest } from "./ebaManifest.mjs";

const H = "tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const finish = (bundleDir, rawCode, reason) => ({
  rawCode,
  reason,
  typed: stage4CodeForRawCode(rawCode),
  bundleDir,
});

export async function runEbaCore({ bundleDir, pinnedPubkeyPath } = {}) {
  // 1. Bundle + substrate readable; anything unreadable is 29 -> 3 (fail closed).
  let events, policy, committedLedger, committedAttestation, manifest, pinnedPem, substrate;
  try {
    events = readJson(`${bundleDir}/events.json`);
    policy = readJson(`${bundleDir}/budget-policy.json`);
    committedLedger = readJson(`${bundleDir}/extraction-ledger.json`);
    committedAttestation = readJson(`${bundleDir}/extraction-attestation.json`);
    manifest = readJson(`${bundleDir}/eba-manifest.json`);
    pinnedPem = readFileSync(pinnedPubkeyPath, "utf8");
    substrate = {
      pack: readJson(`${H}-base-pack.json`),
      sig: readFileSync(`${H}-base-pack.sig`, "utf8").trim(),
      signerPub: readFileSync(`${H}-signer.pub`, "utf8"),
      cert: readJson(`${H}-dfi-certificate.json`),
      manifest: readJson(`${H}-signed-pack-manifest.json`),
    };
  } catch {
    return finish(bundleDir, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED, "bundle_unreadable");
  }

  // 2. Mandatory 4H substrate re-verify (containment record still verifies).
  const packOk = verifyEvidencePack({
    pack: substrate.pack,
    signature: substrate.sig,
    publicKeyPem: substrate.signerPub,
  });
  if (!packOk.ok) {
    return finish(bundleDir, RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH, "base_pack_verify_failed");
  }
  const dfi = diagnose({
    pack: substrate.pack,
    certificate: substrate.cert,
    manifest: substrate.manifest,
  });
  if (!dfi.ok) {
    const raw = Number.isInteger(dfi.code)
      ? dfi.code
      : RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED;
    return finish(bundleDir, raw, `dfi_reverify_failed:${dfi.reason}`);
  }
  const dfiDigest = certificateDigest(substrate.cert);

  // 3. Manifest signature under the PINNED key (fingerprint must match the manifest's claim).
  const pinnedKey = createPublicKey(pinnedPem);
  if (manifest.public_key_fingerprint !== `sha256:${publicKeyFingerprint(pinnedPem)}`) {
    return finish(bundleDir, RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH, "unpinned_signer");
  }

  // 4. Rebuild the ledger from events (recompute-before-trust; schema violations fail closed).
  let rebuiltLedger;
  try {
    rebuiltLedger = buildLedger(events);
  } catch (err) {
    const reason = err instanceof EbaSchemaError ? err.reason : "ledger_rebuild_failed";
    return finish(bundleDir, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED, reason);
  }
  if (canonicalJson(rebuiltLedger) !== canonicalJson(committedLedger)) {
    return finish(
      bundleDir,
      RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH,
      "ledger_recompute_mismatch"
    );
  }

  // 5-7. Digest chain: manifest binds ledger, policy, attestation, and the DFI certificate.
  const sigOk = verifyEbaManifest({
    manifest,
    ledger: rebuiltLedger,
    attestation: committedAttestation,
    policy,
    dfiCertificateDigest: dfiDigest,
    publicKey: pinnedKey,
  });
  if (!sigOk.ok) {
    const raw =
      sigOk.reason === "signature_invalid" || sigOk.reason === "signature_malformed"
        ? RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH
        : RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH;
    return finish(bundleDir, raw, sigOk.reason);
  }
  if (
    committedAttestation.ledger_digest !== ledgerDigest(rebuiltLedger) ||
    committedAttestation.budget_policy_digest !== budgetPolicyDigest(policy) ||
    committedAttestation.dfi_certificate_digest !== dfiDigest ||
    manifest.attestation_digest !== attestationDigest(committedAttestation)
  ) {
    return finish(
      bundleDir,
      RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH,
      "attestation_chain_mismatch"
    );
  }

  // 8. Q8 — the extraction-budget gate. Raw 30 means exactly over-budget.
  const gate = checkBudgets(rebuiltLedger, policy);
  if (!gate.ok) return finish(bundleDir, gate.rawCode, gate.reason);
  return finish(bundleDir, RAW_VERIFIER_CODES.OK, null);
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const get = (n) => {
    const i = argv.indexOf(n);
    return i === -1 ? null : argv[i + 1];
  };
  const bundleDir = get("--bundle");
  const pinnedPubkeyPath = get("--pinned-pubkey");
  const outPath = get("--out");
  const scan = await scanForModelClients(new URL(import.meta.url).pathname, {
    allowedPaths: [
      new URL("./constants.mjs", import.meta.url).pathname,
      new URL("./extractionLedger.mjs", import.meta.url).pathname,
      new URL("./extractionBudgetGate.mjs", import.meta.url).pathname,
      new URL("./ebaManifest.mjs", import.meta.url).pathname,
    ],
  });
  if (!scan.ok) {
    const r = finish(bundleDir, RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, scan.reason);
    if (outPath) emit(outPath, r);
    process.exitCode = stage4CodeForRawCode(r.rawCode);
    return r;
  }
  const offline = await runOffline(() => runEbaCore({ bundleDir, pinnedPubkeyPath }));
  const r = offline.ok
    ? offline.value
    : finish(bundleDir, RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, offline.reason);
  if (outPath) emit(outPath, r);
  process.exitCode = stage4CodeForRawCode(r.rawCode);
  return r;
}

function emit(outPath, r) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ ...r, ok: r.rawCode === 0 }, null, 2)}\n`);
}

// argv[1] is undefined under `node -e` importers — guard so importing never crashes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`stage4k eba: ${e.message}`);
    process.exit(3);
  });
}
