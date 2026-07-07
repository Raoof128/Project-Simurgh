// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR — verify the two-tier attestation (plan Task 10). --tier public|audit.
// Public = arithmetic + structure (no gate call); audit = live v1/v2 re-run (177). Both check
// the bundle Merkle root binds corpus+ledger. Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { evaluateVlr } from "../core/vlrCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4x");
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4x/test-keys");
const readPub = () => readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vlr.pub.pem"), "utf8");
const readJson = (dir, f) => JSON.parse(readFileSync(join(dir, f), "utf8"));

export function verify({ dir = EVID, tier = "public", publicKeyPem = readPub() } = {}) {
  const corpus = readJson(dir, "corpus.json");
  const ledger = readJson(dir, "ledger.json");
  const attestation = readJson(dir, "attestation.json");

  // Merkle binding: attestation must commit to THESE corpus+ledger bytes.
  const corpus_digest = recordDigest(corpus);
  const ledger_digest = recordDigest(ledger);
  if (
    attestation.corpus_digest !== corpus_digest ||
    attestation.ledger_digest !== ledger_digest ||
    attestation.bundle_merkle_root !== merkleRootSorted([corpus_digest, ledger_digest])
  )
    return { raw: 178, reason: "vlr_ledger_mismatch", detail: "merkle_binding" };

  return evaluateVlr({ corpus, ledger, attestation }, { tier, publicKeyPem });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tier = process.argv.includes("--tier")
    ? process.argv[process.argv.indexOf("--tier") + 1]
    : "public";
  const r = verify({ tier });
  console.log(`Stage 4X verify (${tier}): raw ${r.raw}${r.reason ? " " + r.reason : ""}`);
  process.exit(r.raw === 0 ? 0 : 1);
}
