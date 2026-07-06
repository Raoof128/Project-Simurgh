// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U attestation builder (4U spec §9). Motto: AnthropicSafe First, then
// ReviewerSafe. Signs (stage-signer Ed25519) a two-tier record over the Lane A
// corpus. PUBLIC tier verifies structure + signatures + 127/128 + ASR-ledger
// WITHOUT running the engine; AUDIT tier additionally re-runs the engine per
// fixture. The bundle Merkle root seals FIVE groups incl. lane_b_capture.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { evaluateChainSafe } from "../../stage4s/core/chainCore.mjs";
import { charterDigest } from "../core/charter.mjs";
import { fixtureDigest } from "../core/attackModel.mjs";
import { classify } from "../core/dualSignal.mjs";
import { DOMAINS, SCHEMAS } from "../constants.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const FIXDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4u/fixtures");
const OUTDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4u/attestation");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4u/test-keys");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const dirOf = (fixturesDir) => (isAbsolute(fixturesDir) ? fixturesDir : join(ROOT, fixturesDir));

function loadBundle(fixturesDir) {
  const dir = dirOf(fixturesDir);
  return {
    bundle: readJson(join(dir, "bundle.json")),
    index: readJson(join(dir, "corpus-index.json")),
  };
}

// Merkle root over the FIVE sealed groups (P0-10 — Lane B is inside the root).
export function bundleMerkleRoot(att) {
  return merkleRootSorted([
    recordDigest({ domain: DOMAINS.ATTESTATION, group: "charter", v: att.charter }),
    recordDigest({ domain: DOMAINS.ATTESTATION, group: "attack_fixtures", v: att.attack_fixtures }),
    recordDigest({ domain: DOMAINS.ATTESTATION, group: "finding_records", v: att.finding_records }),
    recordDigest({ domain: DOMAINS.ATTESTATION, group: "lane_b_capture", v: att.lane_b_capture }),
    recordDigest({ domain: DOMAINS.ATTESTATION, group: "asr_ledger", v: att.asr }),
  ]);
}

// Structural recompute — NO engine run. Public-tier verifiable.
export function computeStructural(fixturesDir = FIXDIR) {
  const { bundle, index } = loadBundle(fixturesDir);
  const per_fixture = bundle.attack_fixtures.map((f) => ({
    attack_id: f.attack_id,
    expected_raw: f.expected_raw,
    fixture_digest: fixtureDigest(f),
  }));
  return {
    epoch: index.epoch,
    charter_digest: charterDigest(bundle.charter),
    attack_manifest_root: bundle.charter.attack_manifest_root,
    corpus_digest: recordDigest(per_fixture),
    per_fixture,
    asr: bundle.asr,
  };
}

// Audit-grade attestation — re-runs the engine per fixture and embeds the full
// bundle so the verifier can recompute both tiers offline.
export function computeAttestation(fixturesDir = FIXDIR, signerKeyDigest = null) {
  const { bundle, index } = loadBundle(fixturesDir);
  const findingById = new Map(bundle.finding_records.map((f) => [f.attack_id, f]));
  const per_fixture = bundle.attack_fixtures.map((f) => {
    const observed_raw = evaluateChainSafe(f.payload.bundle).raw;
    const outcome_class = findingById.get(f.attack_id).outcome_class;
    return {
      attack_id: f.attack_id,
      expected_raw: f.expected_raw,
      observed_raw,
      outcome_class,
      fixture_digest: fixtureDigest(f),
    };
  });
  const att = {
    schema: SCHEMAS.ATTESTATION,
    epoch: index.epoch,
    attestation_key_digest: signerKeyDigest,
    charter: bundle.charter,
    attack_fixtures: bundle.attack_fixtures,
    finding_records: bundle.finding_records,
    lane_b_capture: bundle.lane_b_capture,
    asr: bundle.asr,
    charter_digest: charterDigest(bundle.charter),
    attack_manifest_root: bundle.charter.attack_manifest_root,
    corpus_digest: recordDigest(
      per_fixture.map((p) => ({
        attack_id: p.attack_id,
        expected_raw: p.expected_raw,
        fixture_digest: p.fixture_digest,
      }))
    ),
    per_fixture,
  };
  att.bundle_merkle_root = bundleMerkleRoot(att);
  return att;
}

export function signAttestation(att, privKey) {
  const { signature, ...unsigned } = att;
  const sig = crypto.sign(null, Buffer.from(canonicalJson(unsigned)), privKey).toString("hex");
  return { ...unsigned, signature: sig };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const keyPath = args[args.indexOf("--key") + 1] || join(KEYDIR, "INSECURE_FIXTURE_ONLY_vrta.pem");
  const outPath = args[args.indexOf("--out") + 1] || join(OUTDIR, "vrta-attestation.json");
  const priv = crypto.createPrivateKey(readFileSync(keyPath));
  const pub = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
  const att = signAttestation(computeAttestation(FIXDIR, keyDigest(pub)), priv);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, canonicalJson(att) + "\n");
  console.error(`stage4u attestation: wrote ${outPath} (${att.per_fixture.length} fixtures)`);
}
