// SPDX-License-Identifier: AGPL-3.0-or-later
// Attestation + manifest for the public heartbeat (spec §5.5). The attestation commits
// the verdict inputs — as_of_window included (Fix 3) — so "overdue" is recomputable on
// any machine on any day. Same crypto discipline as 4M (domain-separated Ed25519).
import { sign, verify } from "node:crypto";
import { canonicalJson, merkleRootSorted, recordDigest } from "../../stage4m/core/canonical.mjs";
import { domainBytes, publicKeyFingerprint } from "../../stage4d/stage4dCrypto.mjs";
import {
  PUBLIC_FORBIDDEN_KEYS,
  SEISMOGRAPH_ATTESTATION_SCHEMA,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_KNOWN_LIMITATIONS,
  SEISMOGRAPH_MANIFEST_DOMAIN,
  SEISMOGRAPH_MANIFEST_SCHEMA,
  SEISMOGRAPH_NON_CLAIMS,
} from "../constants.mjs";

export const seismographAttestationDigest = (a) => recordDigest(a);

export function buildSeismographAttestation({ policy, records, asOfWindow, sourceRoots }) {
  const attestation = {
    schema: SEISMOGRAPH_ATTESTATION_SCHEMA,
    chain_id: SEISMOGRAPH_CHAIN_ID,
    as_of_window: asOfWindow,
    genesis_policy_digest: recordDigest(policy),
    feed_root: merkleRootSorted(records.map(recordDigest)),
    chain_head_digest: recordDigest(records.at(-1)),
    record_counts: {
      heartbeat: records.filter((r) => r.record_type === "heartbeat").length,
      aggregate_reveal: records.filter((r) => r.record_type === "aggregate_reveal").length,
    },
    source_roots: {
      stage4k_exposure_root: sourceRoots.stage4k_exposure_root,
      stage4l_cluster_budget_root: sourceRoots.stage4l_cluster_budget_root,
      stage4m_disclosure_root: sourceRoots.stage4m_disclosure_root,
    },
    known_limitations: [...SEISMOGRAPH_KNOWN_LIMITATIONS],
    non_claims: [...SEISMOGRAPH_NON_CLAIMS],
  };
  // Public-surface guard (mirrors 4M's Tier-P leak guard): the attestation is PUBLIC.
  const flat = canonicalJson(attestation);
  for (const key of PUBLIC_FORBIDDEN_KEYS) {
    if (flat.includes(`"${key}"`)) throw new Error(`public_surface_leak: ${key}`);
  }
  return attestation;
}

export function buildSeismographManifest({ attestation, privateKey, publicKeyPem }) {
  const payload = {
    schema: SEISMOGRAPH_MANIFEST_SCHEMA,
    attestation_digest: seismographAttestationDigest(attestation),
  };
  const signature = `ed25519:${sign(null, domainBytes(SEISMOGRAPH_MANIFEST_DOMAIN, payload), privateKey).toString("base64")}`;
  return {
    ...payload,
    signature,
    public_key_fingerprint: `sha256:${publicKeyFingerprint(publicKeyPem)}`,
  };
}

export function verifySeismographManifest({ manifest, attestation, publicKey }) {
  const { signature, public_key_fingerprint, ...payload } = manifest;
  void public_key_fingerprint;
  if (payload.schema !== SEISMOGRAPH_MANIFEST_SCHEMA) {
    return { ok: false, reason: "manifest_schema_mismatch" };
  }
  if (payload.attestation_digest !== seismographAttestationDigest(attestation)) {
    return { ok: false, reason: "attestation_digest_mismatch" };
  }
  if (typeof signature !== "string" || !signature.startsWith("ed25519:")) {
    return { ok: false, reason: "signature_malformed" };
  }
  try {
    const ok = verify(
      null,
      domainBytes(SEISMOGRAPH_MANIFEST_DOMAIN, payload),
      publicKey,
      Buffer.from(signature.slice("ed25519:".length), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "signature_invalid" };
  } catch {
    return { ok: false, reason: "signature_invalid" };
  }
}

// CLI: build + sign the public evidence dir. --ephemeral for tests; a real key otherwise.
if (process.argv[1] && process.argv[1].endsWith("build-stage4n-attestation.mjs")) {
  const { readFile, writeFile, mkdir, copyFile } = await import("node:fs/promises");
  const { createPrivateKey, generateKeyPairSync } = await import("node:crypto");
  const { join } = await import("node:path");
  const { computeSourceRoots } = await import("./sourceRoots.mjs");
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i === -1 ? null : process.argv[i + 1];
  };
  const outDir = arg("--out-dir") ?? "docs/research/llm-shield/evidence/stage-4n";
  const FIX = "tests/fixtures/llmShield/stage4n";
  await mkdir(outDir, { recursive: true });
  await copyFile(`${FIX}/genesis-policy.json`, join(outDir, "genesis-policy.json"));
  await copyFile(`${FIX}/feed/heartbeat-feed.jsonl`, join(outDir, "heartbeat-feed.jsonl"));
  const policy = JSON.parse(await readFile(join(outDir, "genesis-policy.json"), "utf8"));
  const records = (await readFile(join(outDir, "heartbeat-feed.jsonl"), "utf8"))
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
  const { disclosure_leaves, ...sourceRoots } = await computeSourceRoots(process.cwd());
  void disclosure_leaves;
  let privateKey;
  let publicKeyPem;
  if (process.argv.includes("--ephemeral")) {
    const pair = generateKeyPairSync("ed25519");
    privateKey = pair.privateKey;
    publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" });
  } else {
    const keyPath = arg("--private-key");
    if (!keyPath) {
      console.error("usage: --private-key <pem> [--out-dir <dir>] | --ephemeral");
      process.exit(29);
    }
    privateKey = createPrivateKey(await readFile(keyPath, "utf8"));
    publicKeyPem = JSON.parse(
      await readFile("tests/fixtures/llmShield/stage4n/seismograph-signer.pub", "utf8")
    ).public_key_pem;
  }
  const attestation = buildSeismographAttestation({
    policy,
    records,
    asOfWindow: "synthetic-0006",
    sourceRoots,
  });
  const manifest = buildSeismographManifest({ attestation, privateKey, publicKeyPem });
  await writeFile(
    join(outDir, "stage4n-attestation.json"),
    `${JSON.stringify(attestation, null, 2)}\n`
  );
  await writeFile(
    join(outDir, "heartbeat-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  if (process.argv.includes("--ephemeral")) {
    await writeFile(
      join(outDir, "seismograph-signer.pub"),
      `${JSON.stringify({ key_type: "Ed25519", format: "spki-pem", public_key_pem: publicKeyPem }, null, 2)}\n`
    );
  }
  console.log(`stage4n attestation written to ${outDir}`);
}
