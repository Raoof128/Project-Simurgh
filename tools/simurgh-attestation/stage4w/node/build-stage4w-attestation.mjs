// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W VSN two-tier attestation (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
//
// One signed attestation over sealed groups (all under content, so the two-stage digest
// applies unchanged): lane_a_fixtures / lane_b_capture / lane_c_captures / parity_contract /
// honesty_ledger / evidence_density / bridge_subject. Dropping any one changes the root.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest, canonicalJson, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { capsuleAttestationDigest } from "../../stage4t/core/capsuleCore.mjs";
import {
  VSN_ATTESTATION_SCHEMA,
  VSN_NON_CLAIMS,
  VSN_KNOWN_LIMITATIONS,
  VSN_RAILS,
  VSN_RESERVED_SLOTS,
} from "../constants.mjs";
import { narrativeBodyDigest, spanMapDigest } from "../core/narrativeBinding.mjs";
import { computeEvidenceDensity } from "../core/narrativeCore.mjs";
import { corpusDocument } from "./build-stage4w-fixtures.mjs";
import { buildGreenNarrative } from "./greenNarrative.mjs";
import { buildBridgeStatement } from "./build-stage4w-bridge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const EVBASE = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4w");
const EVDIR = join(EVBASE, "attestation");
const LANEB = join(EVBASE, "laneb/capture.json");
const LANEC = join(EVBASE, "lanec");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const readPub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

export const PARITY_CONTRACT = Object.freeze({
  lines: [
    "python_public_core_does_not_verify_ed25519_signatures",
    "browser_verifier_public_tier_only_node_cli_authoritative",
  ],
});

function readLaneB() {
  try {
    return JSON.parse(readFileSync(LANEB, "utf8"));
  } catch {
    return null;
  }
}

function readLaneCCaptures() {
  if (!existsSync(LANEC)) return [];
  return readdirSync(LANEC)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const cap = JSON.parse(readFileSync(join(LANEC, f), "utf8"));
      return { file: f, capture_digest: recordDigest(cap), mode: cap.mode };
    });
}

export function bundleMerkleRoot(attestation) {
  const c = attestation.content;
  return merkleRootSorted(
    [
      c.lane_a_fixtures,
      c.lane_b_capture,
      c.lane_c_captures,
      c.parity_contract,
      c.honesty_ledger,
      c.evidence_density,
      c.bridge_subject,
    ].map(recordDigest)
  );
}

export function computeAttestation() {
  const green = buildGreenNarrative();
  const density = computeEvidenceDensity(green.narrative.content);
  const bridge_subject = {
    narrative_body_digest: narrativeBodyDigest(green.narrative.content.narrative_body),
    span_map_digest: spanMapDigest(green.narrative.content.span_map),
  };
  const content = {
    lane_a_fixtures: corpusDocument().content.cases,
    lane_b_capture: readLaneB(),
    lane_c_captures: readLaneCCaptures(),
    parity_contract: PARITY_CONTRACT,
    honesty_ledger: {
      non_claims: VSN_NON_CLAIMS,
      known_limitations: VSN_KNOWN_LIMITATIONS,
      rails: VSN_RAILS,
      reserved_slots: VSN_RESERVED_SLOTS,
      ledger_note: "narrative_claim_contest_deferred PAID by 4W (4V ledger)",
    },
    evidence_density: density,
    bridge_subject,
  };
  const attestation = { schema: VSN_ATTESTATION_SCHEMA, content };
  attestation.bundle_merkle_root = bundleMerkleRoot(attestation);
  attestation.signing_key_digest = keyDigest(readPub("vsn")); // PUBLIC key, both sides
  return attestation;
}

export function signAttestation(attestation, privKeyPem = readKey("vsn")) {
  const priv = crypto.createPrivateKey(privKeyPem);
  const { signature, attestation_digest, ...body } = attestation;
  attestation.signature = crypto.sign(null, Buffer.from(canonicalJson(body)), priv).toString("hex");
  attestation.attestation_digest = capsuleAttestationDigest(attestation);
  return attestation;
}

// Re-sign after a mutation (the dishonest-producer discrimination test, reviewer P1 #6).
export const resignAttestation = (attestation, privKeyPem) =>
  signAttestation(attestation, privKeyPem);

export const buildAttestation = () => signAttestation(computeAttestation());

export function writeAttestation(outDir = EVDIR) {
  mkdirSync(outDir, { recursive: true });
  const att = buildAttestation();
  writeFileSync(join(outDir, "vsn-attestation.json"), canonicalJson(att) + "\n");
  const bridge = buildBridgeStatement(
    att.content.bridge_subject.narrative_body_digest,
    att.content.bridge_subject.span_map_digest,
    att.attestation_digest
  );
  writeFileSync(join(outDir, "bridge.json"), canonicalJson(bridge) + "\n");
  return att;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const att = writeAttestation();
  console.error(`stage4w attestation: sealed ${att.content.lane_a_fixtures.length} Lane A cases`);
}
