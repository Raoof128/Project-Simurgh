// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC two-tier attestation (spec §9). Motto: AnthropicSafe First, then ReviewerSafe.
//
// One signed attestation over four sealed groups (all under content, so the two-stage
// digest applies unchanged):
//   template_snapshots / lane_a_fixtures / census_artifacts / lane_b_capture
// lane_a_fixtures seals ALL 18 Lane A entries — dropping any one changes the root.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest, canonicalJson, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { capsuleAttestationDigest, evaluateCapsuleSafe } from "../core/capsuleCore.mjs";
import { VIC_ATTESTATION_SCHEMA } from "../constants.mjs";
import { corpusDocument } from "./build-stage4t-fixtures.mjs";
import { loadTemplates } from "../core/templateMap.mjs";
import { buildGreenBundle, STAGE_VERIFIERS } from "./greenCapsule.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4t/test-keys");
const EVDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4t/attestation");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");

// Merkle root over the four content-group digests (stable order via merkleRootSorted).
export function bundleMerkleRoot(attestation) {
  const c = attestation.content;
  return merkleRootSorted(
    [c.template_snapshots, c.lane_a_fixtures, c.census_artifacts, c.lane_b_capture].map(
      recordDigest
    )
  );
}

export function computeAttestation({ lanebCapture = null } = {}) {
  const templates = loadTemplates();
  const corpus = corpusDocument();
  const honest = buildGreenBundle().bundle;
  const content = {
    template_snapshots: [templates.gpai_art55, templates.art73_high_risk_draft],
    lane_a_fixtures: corpus.cases,
    census_artifacts: honest.content.evidence_artifacts,
    lane_b_capture: lanebCapture,
  };
  const attestation = { schema: VIC_ATTESTATION_SCHEMA, content };
  attestation.bundle_merkle_root = bundleMerkleRoot(attestation);
  attestation.signing_key_digest = keyDigest(readKey("vic"));
  return attestation;
}

export function signAttestation(attestation) {
  const priv = crypto.createPrivateKey(readKey("vic"));
  const { signature, attestation_digest, ...body } = attestation;
  attestation.signature = crypto.sign(null, Buffer.from(canonicalJson(body)), priv).toString("hex");
  attestation.attestation_digest = capsuleAttestationDigest(attestation);
  return attestation;
}

export function writeAttestation(outDir = EVDIR) {
  mkdirSync(outDir, { recursive: true });
  const att = signAttestation(computeAttestation());
  writeFileSync(join(outDir, "vic-attestation.json"), canonicalJson(att) + "\n");
  return att;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const att = writeAttestation();
  console.error(`stage4t attestation: sealed ${att.content.lane_a_fixtures.length} Lane A cases`);
}

export { STAGE_VERIFIERS };
