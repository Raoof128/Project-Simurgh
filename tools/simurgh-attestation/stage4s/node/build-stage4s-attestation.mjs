// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S attestation builder (4S spec §14). Motto: AnthropicSafe First, then
// ReviewerSafe. Signs (stage-signer Ed25519) a record over the Lane A corpus:
// per-fixture expected + observed raw codes, fixture digests, the honest bundle's
// digest + Merkle root, and the signed non-claims / limitations / rails. The
// PUBLIC tier verifies this record's structural claims + signature WITHOUT running
// the engine; the AUDIT tier additionally re-runs the engine per fixture.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { evaluateChainSafe } from "../core/chainCore.mjs";
import { keyDigest } from "../core/receiptBuilder.mjs";
import { DOMAINS, VDCC_NON_CLAIMS, VDCC_KNOWN_LIMITATIONS, VDCC_RAILS } from "../constants.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const FIXDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4s/fixtures");
const OUTDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4s/attestation");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4s/test-keys");
const SCHEMA = "simurgh.vdcc_attestation.v1";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Structural recompute — NO engine run. Public-tier verifiable.
export function computeStructural(fixturesDir = FIXDIR) {
  const dir = isAbsolute(fixturesDir) ? fixturesDir : join(ROOT, fixturesDir);
  const index = readJson(join(dir, "corpus-index.json"));
  const honest = readJson(join(dir, index.cases.find((c) => c.expected_raw === 0).file));
  const perFixture = index.cases.map((c) => {
    const bundle = readJson(join(dir, c.file));
    return { name: c.name, expected_raw: c.expected_raw, fixture_digest: recordDigest(bundle) };
  });
  const corpus_digest = recordDigest(perFixture);
  return {
    epoch: index.epoch,
    corpus_digest,
    honest_bundle_digest: recordDigest(honest),
    bundle_merkle_root: honest.bundle_merkle_root,
    per_fixture: perFixture,
  };
}

// Full attestation — adds observed_raw (engine run) to each fixture entry.
export function computeAttestation(fixturesDir = FIXDIR, signerKeyDigest = "") {
  const dir = isAbsolute(fixturesDir) ? fixturesDir : join(ROOT, fixturesDir);
  const s = computeStructural(dir);
  const index = readJson(join(dir, "corpus-index.json"));
  const observedByName = new Map();
  for (const c of index.cases) {
    observedByName.set(c.name, evaluateChainSafe(readJson(join(dir, c.file))).raw);
  }
  return {
    schema: SCHEMA,
    epoch: s.epoch,
    corpus_digest: s.corpus_digest,
    honest_bundle_digest: s.honest_bundle_digest,
    bundle_merkle_root: s.bundle_merkle_root,
    per_fixture: s.per_fixture.map((f) => ({ ...f, observed_raw: observedByName.get(f.name) })),
    non_claims: [...VDCC_NON_CLAIMS],
    known_limitations: [...VDCC_KNOWN_LIMITATIONS],
    rails: [...VDCC_RAILS],
    signer_key_digest: signerKeyDigest,
    signature: "",
  };
}

export const attestationDigest = (att) =>
  recordDigest({ domain: DOMAINS.ATTESTATION, attestation: att });

export function signAttestation(att, privKey) {
  const { signature, ...unsigned } = att;
  const sig = crypto.sign(null, Buffer.from(canonicalJson(unsigned)), privKey).toString("hex");
  return { ...att, signature: sig };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const keyArg = args[args.indexOf("--key") + 1];
  const keyPath = args.includes("--key")
    ? keyArg
    : join(KEYDIR, "INSECURE_FIXTURE_ONLY_stage-signer.pem");
  const priv = crypto.createPrivateKey(readFileSync(keyPath));
  const pub = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
  const att = signAttestation(computeAttestation(FIXDIR, keyDigest(pub)), priv);
  const outArg = args[args.indexOf("--out") + 1];
  const outPath = args.includes("--out") ? outArg : join(OUTDIR, "stage4s-attestation.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, canonicalJson(att) + "\n");
  console.error(`stage4s attestation: wrote ${outPath} (${att.per_fixture.length} fixtures)`);
}
