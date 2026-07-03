#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { publicKeyFingerprint } from "../../stage4d/stage4dCrypto.mjs";
import { stage4CodeForRawCode } from "../../stage4h/exitCodes.mjs";
import { runOffline, scanForModelClients } from "../../stage4h/offlineHarness.mjs";
import { implicationReport } from "../core/respondentCore.mjs";
import { verifyBundleCore } from "../core/verdictCore.mjs";
import { loadBundle } from "./fs-bundle-loader.mjs";
import { nodeVerifyEd25519 } from "./signing-node.mjs";
import { verifyVxdManifest } from "./build-stage4m-attestation.mjs";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Verify the manifest signature under the PINNED key (adapter responsibility, spec §4.6).
function manifestCheckFor(bundle, pinnedPubkeyPath) {
  if (!bundle.manifest || !bundle.attestation) return { ok: false, reason: "manifest_absent" };
  let pinnedPem;
  try {
    pinnedPem = readFileSync(pinnedPubkeyPath, "utf8");
  } catch {
    return { ok: false, reason: "pinned_pubkey_unreadable" };
  }
  if (bundle.manifest.public_key_fingerprint !== `sha256:${publicKeyFingerprint(pinnedPem)}`) {
    return { ok: false, reason: "unpinned_signer" };
  }
  return verifyVxdManifest({
    manifest: bundle.manifest,
    attestation: bundle.attestation,
    publicKey: createPublicKey(pinnedPem),
  });
}

export async function runVxdCore({
  bundleDir,
  pinnedPubkeyPath,
  tier = "a",
  respondentClustersPath = null,
  verifySigOverride = null,
}) {
  let bundle;
  try {
    bundle = loadBundle(bundleDir);
  } catch {
    return { rawCode: 29, reason: "bundle_unreadable", verdict: null };
  }
  const verifySig = verifySigOverride ?? nodeVerifyEd25519;
  const manifestCheck = manifestCheckFor(bundle, pinnedPubkeyPath);
  // an acknowledgement verifies against the provider key carried inline in the ack itself.
  const ackKey = bundle.acks[0]?.respondent_public_key?.slice("ed25519:".length);
  const verdict = await verifyBundleCore({
    bundle,
    tier,
    verifySig,
    providerPublicKeySpkiB64: ackKey,
    manifestCheck,
  });
  const out = { rawCode: verdict.rawCode, reason: verdict.reason, verdict };
  if (respondentClustersPath) {
    const respondentClusters = readJson(respondentClustersPath);
    out.implicationReport = implicationReport({
      records: [...bundle.windows, ...bundle.rescoreRecords, ...bundle.mergeEvents],
      respondentClusters,
    });
  }
  return out;
}

const ALLOWED = [
  "canonical",
  "mergeLatticeCore",
  "retroScoreCore",
  "disclosureCore",
  "respondentCore",
  "verdictCore",
].map((m) => new URL(`../core/${m}.mjs`, import.meta.url).pathname);

export async function main({ argv = process.argv.slice(2) } = {}) {
  const get = (n) => {
    const i = argv.indexOf(n);
    return i === -1 ? null : argv[i + 1];
  };
  const bundleDir = get("--bundle");
  const pinnedPubkeyPath = get("--pinned-pubkey");
  const tier = get("--tier") || "a";
  const respondentClustersPath = argv.includes("--as-respondent")
    ? get("--respondent-clusters")
    : null;
  const outPath = get("--out");
  const scan = await scanForModelClients(new URL(import.meta.url).pathname, {
    allowedPaths: [
      ...ALLOWED,
      new URL("../constants.mjs", import.meta.url).pathname,
      new URL("./fs-bundle-loader.mjs", import.meta.url).pathname,
      new URL("./signing-node.mjs", import.meta.url).pathname,
      new URL("./build-stage4m-attestation.mjs", import.meta.url).pathname,
      new URL("../../stage4d/stage4dCrypto.mjs", import.meta.url).pathname,
      new URL("../../stage4h/exitCodes.mjs", import.meta.url).pathname,
      new URL("../../stage4h/offlineHarness.mjs", import.meta.url).pathname,
    ],
  });
  if (!scan.ok) {
    const r = { rawCode: 28, reason: scan.reason, verdict: null };
    if (outPath) emit(outPath, r);
    process.exitCode = stage4CodeForRawCode(28);
    return r;
  }
  const offline = await runOffline(() =>
    runVxdCore({ bundleDir, pinnedPubkeyPath, tier, respondentClustersPath })
  );
  const r = offline.ok ? offline.value : { rawCode: 28, reason: offline.reason, verdict: null };
  if (outPath) emit(outPath, r);
  process.exitCode = stage4CodeForRawCode(r.rawCode);
  return r;
}

function emit(outPath, r) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ ...r, ok: r.rawCode === 0 }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`stage4m vxd: ${e.message}`);
    process.exit(3);
  });
}
