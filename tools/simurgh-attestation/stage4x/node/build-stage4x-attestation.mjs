// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR — build ledger + two-tier attestation, sign with the vlr key (plan Task 10).
// Signs canonicalJson(body); keyDigest over the PUBLIC PEM on both sides (4W→4X doctrine).
// Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalJson, recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { computeLedgerFromLiveGate } from "../core/residueLedger.mjs";
import { buildAndAssertCorpus } from "./build-stage4x-corpus.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4x");
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4x/test-keys");
const readPriv = () => readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vlr.pem"), "utf8");
const readPub = () => readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vlr.pub.pem"), "utf8");

export function buildAttestation(corpus, ledger) {
  const corpus_digest = recordDigest(corpus);
  const ledger_digest = recordDigest(ledger);
  const body = {
    schema: "simurgh.vlr.attestation.v1",
    corpus_digest,
    ledger_digest,
    bundle_merkle_root: merkleRootSorted([corpus_digest, ledger_digest]),
    metamorphic_table_digest: corpus.metamorphic_table_digest,
    v1_ruleset_digest: corpus.ruleset_binding.v1_ruleset_digest,
    v2_ruleset_digest: corpus.ruleset_binding.v2_ruleset_digest,
    metamorphic_slip_rate_v1: ledger.metamorphic_slip_rate_v1,
    metamorphic_slip_rate_v2: ledger.metamorphic_slip_rate_v2,
    signing_key_digest: keyDigest(readPub()),
    non_claim: "python_and_browser_cores_do_not_verify_ed25519_signatures",
  };
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(body)), crypto.createPrivateKey(readPriv()))
    .toString("hex");
  return { ...body, signature };
}

export function writeAll() {
  const corpus = buildAndAssertCorpus();
  const ledger = computeLedgerFromLiveGate(corpus);
  const attestation = buildAttestation(corpus, ledger);
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(join(OUTDIR, "corpus.json"), canonicalJson(corpus) + "\n");
  writeFileSync(join(OUTDIR, "ledger.json"), canonicalJson(ledger) + "\n");
  writeFileSync(join(OUTDIR, "attestation.json"), canonicalJson(attestation) + "\n");
  return { corpus, ledger, attestation };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { ledger } = writeAll();
  console.log(
    `Stage 4X attestation written. slip v1=${ledger.metamorphic_slip_rate_v1} → v2=${ledger.metamorphic_slip_rate_v2} (floor ${ledger.residue_delta.irreducible.join(",")}).`
  );
}
