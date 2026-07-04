// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildSeismographAttestation,
  buildSeismographManifest,
  verifySeismographManifest,
} from "../../../../tools/simurgh-attestation/stage4n/node/build-stage4n-attestation.mjs";
import { computeSourceRoots } from "../../../../tools/simurgh-attestation/stage4n/node/sourceRoots.mjs";

const FIX = "tests/fixtures/llmShield/stage4n";
const policy = JSON.parse(await readFile(`${FIX}/genesis-policy.json`, "utf8"));
const records = (await readFile(`${FIX}/feed/heartbeat-feed.jsonl`, "utf8"))
  .split("\n")
  .filter((l) => l.trim() !== "")
  .map((l) => JSON.parse(l));
const { disclosure_leaves, ...sourceRoots } = await computeSourceRoots(process.cwd());
void disclosure_leaves;

test("attestation binds as_of_window, policy digest, feed root, and head digest", () => {
  const a = buildSeismographAttestation({
    policy,
    records,
    asOfWindow: "synthetic-0006",
    sourceRoots,
  });
  assert.equal(a.schema, "simurgh.seismograph.attestation.v1");
  assert.equal(a.as_of_window, "synthetic-0006");
  assert.equal(a.genesis_policy_digest, recordDigest(policy));
  assert.equal(a.chain_head_digest, recordDigest(records.at(-1)));
  assert.deepEqual(a.record_counts, { heartbeat: 7, aggregate_reveal: 5 });
  assert.deepEqual(a.source_roots, sourceRoots);
  assert.ok(a.non_claims.includes("equivocation_detection_requires_two_artifacts"));
  assert.ok(a.known_limitations.includes("reveal_commitment_binding_not_hiding_low_entropy_v0"));
});

test("manifest signs and verifies; key substitution and digest tamper fail", () => {
  const a = buildSeismographAttestation({
    policy,
    records,
    asOfWindow: "synthetic-0006",
    sourceRoots,
  });
  const signer = generateKeyPairSync("ed25519");
  const stranger = generateKeyPairSync("ed25519");
  const publicKeyPem = signer.publicKey.export({ type: "spki", format: "pem" });
  const manifest = buildSeismographManifest({
    attestation: a,
    privateKey: signer.privateKey,
    publicKeyPem,
  });
  assert.deepEqual(
    verifySeismographManifest({ manifest, attestation: a, publicKey: signer.publicKey }),
    { ok: true }
  );
  assert.deepEqual(
    verifySeismographManifest({ manifest, attestation: a, publicKey: stranger.publicKey }),
    { ok: false, reason: "signature_invalid" }
  );
  const tampered = { ...a, as_of_window: "synthetic-0009" };
  assert.deepEqual(
    verifySeismographManifest({ manifest, attestation: tampered, publicKey: signer.publicKey }),
    { ok: false, reason: "attestation_digest_mismatch" }
  );
});
