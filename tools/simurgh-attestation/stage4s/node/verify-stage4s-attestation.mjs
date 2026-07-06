// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S two-tier attestation verifier (4S spec §14). Motto: AnthropicSafe
// First, then ReviewerSafe.
//   --tier public : structural recompute (digests, Merkle, per-fixture digests) +
//                   Ed25519 signature over the committed corpus. No engine run.
//   --tier audit  : ALSO re-runs the decision engine per fixture and asserts each
//                   observed_raw == expected_raw == recomputed.
// The verifier reads --pubkey (default the committed stage-signer public key); the
// PRIVATE key is never required for verification (spec §14 key hygiene).
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { evaluateChainSafe } from "../core/chainCore.mjs";
import { computeStructural } from "./build-stage4s-attestation.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const FIXDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4s/fixtures");
const PUBKEY = join(
  ROOT,
  "tests/fixtures/llmShield/stage4s/test-keys/INSECURE_FIXTURE_ONLY_stage-signer.pub.pem"
);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Returns { ok, tier, failures: [] }.
export function verifyAttestation(
  attestation,
  { tier = "public", pubKeyPem, fixturesDir = FIXDIR } = {}
) {
  const failures = [];
  const dir = isAbsolute(fixturesDir) ? fixturesDir : join(ROOT, fixturesDir);

  // 1. Signature over the unsigned canonical form.
  const { signature, ...unsigned } = attestation;
  const pub = crypto.createPublicKey(pubKeyPem || readFileSync(PUBKEY));
  let sigOk = false;
  try {
    sigOk = crypto.verify(
      null,
      Buffer.from(canonicalJson(unsigned)),
      pub,
      Buffer.from(signature, "hex")
    );
  } catch {
    sigOk = false;
  }
  if (!sigOk) failures.push({ code: "signature_invalid" });

  // 2. Structural recompute (public tier).
  const s = computeStructural(dir);
  if (s.corpus_digest !== attestation.corpus_digest)
    failures.push({ code: "corpus_digest_mismatch" });
  if (s.honest_bundle_digest !== attestation.honest_bundle_digest)
    failures.push({ code: "honest_bundle_digest_mismatch" });
  if (s.bundle_merkle_root !== attestation.bundle_merkle_root)
    failures.push({ code: "bundle_merkle_root_mismatch" });
  const byName = new Map(attestation.per_fixture.map((f) => [f.name, f]));
  for (const f of s.per_fixture) {
    const claimed = byName.get(f.name);
    if (
      !claimed ||
      claimed.fixture_digest !== f.fixture_digest ||
      claimed.expected_raw !== f.expected_raw
    ) {
      failures.push({ code: "per_fixture_mismatch", name: f.name });
    }
  }

  // 3. Audit tier: re-run the engine per fixture.
  if (tier === "audit") {
    const index = readJson(join(dir, "corpus-index.json"));
    for (const c of index.cases) {
      const observed = evaluateChainSafe(readJson(join(dir, c.file))).raw;
      const claimed = byName.get(c.name);
      if (observed !== c.expected_raw || !claimed || claimed.observed_raw !== observed) {
        failures.push({ code: "observed_raw_mismatch", name: c.name, observed });
      }
    }
  }

  return { ok: failures.length === 0, tier, failures };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const tier = args.includes("--tier") ? args[args.indexOf("--tier") + 1] : "public";
  const attPath = args.includes("--attestation")
    ? args[args.indexOf("--attestation") + 1]
    : join(ROOT, "docs/research/llm-shield/evidence/stage-4s/attestation/stage4s-attestation.json");
  const pubKeyPem = args.includes("--pubkey")
    ? readFileSync(args[args.indexOf("--pubkey") + 1])
    : undefined;
  const res = verifyAttestation(readJson(attPath), { tier, pubKeyPem });
  if (res.ok) {
    console.error(`stage4s attestation GREEN (tier=${tier})`);
    process.exit(0);
  }
  console.error(`stage4s attestation RED (tier=${tier}):`, JSON.stringify(res.failures));
  process.exit(1);
}
