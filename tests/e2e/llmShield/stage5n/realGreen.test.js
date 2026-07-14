// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — the REAL Lane-B ceremony verifies to raw 0 (Task 1B close). No injected facts: this runs the
// production adapter over the frozen pack — real DigiCert RFC-3161 tokens, real Bitcoin-confirmed
// OpenTimestamps proofs (block 957 983), real Rekor entries — and re-runs the full 20,000,000-step chain.
// ~20 s under Node 26 by design: the verifier re-runs the chain (this is not a VDF; there is no fast path).
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  verifyVtcDelay,
  rekorArtifactHash,
} from "../../../../tools/simurgh-attestation/stage5n/node/verify.mjs";
import { verifyOtsOffline } from "../../../../tools/simurgh-attestation/stage5n/node/otsVerify.mjs";
import { STAGE_5N_FLOOR_MS } from "../../../../tools/simurgh-attestation/stage5n/constants.mjs";

const PACK = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5n/real-laneb"
);
const read = (f) => readFileSync(join(PACK, f));
const readJson = (f) => JSON.parse(read(f).toString("utf8"));
const H = (b) => crypto.createHash("sha256").update(b).digest("hex");

const contract = readJson("contract.json");
const manifest = readJson("EVIDENCE_MANIFEST.json");

function config() {
  const submitterPem = read("ceremony_submitter_pub.pem").toString("utf8");
  return {
    expected_final_signer_fpr: contract.keys.finalsigner,
    expected_producer_fpr: contract.keys.producer,
    expected_issuer_fpr: contract.keys.issuer,
    expected_tsa_verifier_fpr: "sha256:" + H(Buffer.from("digicert-tsa-verifier")),
    expected_rekor_submitter_fpr:
      "sha256:" + H(crypto.createPublicKey(submitterPem).export({ type: "spki", format: "der" })),
    trusted_tsa_roots: ["digicert-root-g4"],
    trusted_rekor_log_keys: ["rekor-prod"],
    authority_registry: {
      "digicert-tsa": {
        uncertainty_bound_ms: 1000,
        uncertainty_basis: "second_granularity_unspecified_accuracy",
      },
    },
    hard_resource_limits: {
      max_raw_bytes: 262144,
      max_depth: 32,
      max_keys: 512,
      max_array: 4096,
      max_string: 131072,
      max_checkpoint_count: 16,
    },
    expected_input_source: contract.input_reference.artifact_digest,
    pinned_issuer_pubkey_pem: contract.pubkeys.issuer,
    pinned_producer_pubkey_pem: contract.pubkeys.producer,
    pinned_finalsigner_pubkey_pem: contract.pubkeys.finalsigner,
  };
}

function evidence() {
  const submitterPem = read("ceremony_submitter_pub.pem").toString("utf8");
  const rekorPubPem = read("rekor_prod_pub.pem").toString("utf8");
  const leg = (role) => ({
    tsrPath: join(PACK, `${role}.tsr`),
    otsPath: join(PACK, `${role}.confirmed.ots`),
    rekorEntry: readJson(`${role}_rekor_entry.json`),
    rekorPubPem,
    submitterPem,
  });
  return { start: leg("start"), end: leg("end") };
}

test("Lane B: the frozen pack is byte-stable against its own manifest", () => {
  for (const [name, digest] of Object.entries(manifest.files)) {
    assert.equal(H(read(name)), digest, `${name} does not match the manifest`);
  }
  const onDisk = readdirSync(PACK).filter((f) => f !== "EVIDENCE_MANIFEST.json");
  assert.deepEqual(onDisk.sort(), Object.keys(manifest.files).sort()); // no unlisted extras
});

test("Lane B: no private key material is committed", () => {
  for (const f of Object.keys(manifest.files)) {
    assert.ok(!read(f).toString("latin1").includes("PRIVATE KEY"), `${f} carries a private key`);
  }
});

test("Lane B: both OTS proofs really carry Bitcoin block 957 983 and bind their own subject", () => {
  for (const [role, hexFile] of [
    ["start", "D_start.hex"],
    ["end", "D_end.hex"],
  ]) {
    const leaf = read(hexFile).toString("utf8").trim();
    const r = verifyOtsOffline(read(`${role}.confirmed.ots`), leaf);
    assert.equal(r.leaf_ok, true, `${role}: OTS leaf is not the endpoint subject`);
    assert.equal(r.confirmed, true, `${role}: OTS not Bitcoin-confirmed`);
    assert.ok(
      r.attestations.some((a) => a.height === manifest.bitcoin.both_endpoints_confirmed_in_block),
      `${role}: no attestation at the manifest's block`
    );
  }
});

test("Lane B: the Rekor seat's own body binds sha256(utf8(subject)) for each endpoint", () => {
  for (const [role, hexFile] of [
    ["start", "D_start.hex"],
    ["end", "D_end.hex"],
  ]) {
    const subject = read(hexFile).toString("utf8").trim();
    assert.equal(
      rekorArtifactHash(readJson(`${role}_rekor_entry.json`)),
      H(Buffer.from(subject, "utf8"))
    );
  }
});

// The headline: the real ceremony, through the real production path, with no injected facts.
test("Lane B: the REAL ceremony verifies to raw 0 above the frozen floor", () => {
  const verdict = verifyVtcDelay(read("envelope.json"), config(), {
    endpointEvidence: evidence(),
    census: { prior_seen_keys: [] },
  });
  assert.equal(verdict.raw, 0, JSON.stringify(verdict));
  assert.equal(verdict.elapsed_lower_bound_ms, 90_000);
  assert.ok(verdict.elapsed_lower_bound_ms >= STAGE_5N_FLOOR_MS);
  assert.equal(verdict.D_out, readJson("phase-b.json").D_out);
});

// Law 1 with real evidence: swapping the endpoints' anchors must not still read as green.
test("Lane B: real evidence cross-wired (start<->end) is refused, not silently accepted", () => {
  const ev = evidence();
  const verdict = verifyVtcDelay(read("envelope.json"), config(), {
    endpointEvidence: { start: ev.end, end: ev.start },
    census: { prior_seen_keys: [] },
  });
  assert.notEqual(verdict.raw, 0);
  assert.ok(verdict.raw >= 396 && verdict.raw <= 419, `raw ${verdict.raw} outside the 5N band`);
});
