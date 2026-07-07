// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V VDP two-tier attestation (spec §9). Motto: AnthropicSafe First, then ReviewerSafe.
//
// One signed attestation over four sealed groups (all under content, so the two-stage
// digest applies unchanged): lane_a_fixtures / lane_b_capture / parity_contract /
// honesty_ledger. lane_a_fixtures seals ALL cases — dropping any one changes the root.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest, canonicalJson, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { capsuleAttestationDigest } from "../../stage4t/core/capsuleCore.mjs";
import {
  VDP_ATTESTATION_SCHEMA,
  VDP_NON_CLAIMS,
  VDP_KNOWN_LIMITATIONS,
  VDP_RAILS,
  VDP_RESERVED_SLOTS,
} from "../constants.mjs";
import { corpusDocument } from "./build-stage4v-fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4v/test-keys");
const EVDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4v/attestation");
const LANEB = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4v/laneb/capture.json");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const readPub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

const PARITY_CONTRACT = Object.freeze({
  excluded_fixtures: ["signature-invalid", "subpoena-capsule-tampered"],
  lines: [
    "python_public_core_does_not_verify_ed25519_signatures",
    "node_public_verifier_is_authoritative_for_raw_152",
  ],
});

export function bundleMerkleRoot(attestation) {
  const c = attestation.content;
  return merkleRootSorted(
    [c.lane_a_fixtures, c.lane_b_capture, c.parity_contract, c.honesty_ledger].map(recordDigest)
  );
}

export function computeAttestation({ lanebCapture = null } = {}) {
  let laneb = lanebCapture;
  if (laneb === null) {
    try {
      laneb = JSON.parse(readFileSync(LANEB, "utf8"));
    } catch {
      laneb = null;
    }
  }
  const content = {
    lane_a_fixtures: corpusDocument().cases,
    lane_b_capture: laneb,
    parity_contract: PARITY_CONTRACT,
    honesty_ledger: {
      non_claims: VDP_NON_CLAIMS,
      known_limitations: VDP_KNOWN_LIMITATIONS,
      rails: VDP_RAILS,
      reserved_slots: VDP_RESERVED_SLOTS,
    },
  };
  const attestation = { schema: VDP_ATTESTATION_SCHEMA, content };
  attestation.bundle_merkle_root = bundleMerkleRoot(attestation);
  // Digest the PUBLIC verification key (the verifier only needs the public key).
  attestation.signing_key_digest = keyDigest(readPub("vdp"));
  return attestation;
}

export function signAttestation(attestation) {
  const priv = crypto.createPrivateKey(readKey("vdp"));
  const { signature, attestation_digest, ...body } = attestation;
  attestation.signature = crypto.sign(null, Buffer.from(canonicalJson(body)), priv).toString("hex");
  attestation.attestation_digest = capsuleAttestationDigest(attestation);
  return attestation;
}

export function writeAttestation(outDir = EVDIR) {
  mkdirSync(outDir, { recursive: true });
  const att = signAttestation(computeAttestation());
  writeFileSync(join(outDir, "vdp-attestation.json"), canonicalJson(att) + "\n");
  return att;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const att = writeAttestation();
  console.error(`stage4v attestation: sealed ${att.content.lane_a_fixtures.length} Lane A cases`);
}
