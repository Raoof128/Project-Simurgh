// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — byte-stable attestation fixture (spec §5; plan Task 11). Assembles the full
// signed VAR bundle: frozen charter (VAR_FAMILY_COUNTS) + the REAL Lane C capture binding + the
// 46-attack corpus (driven at the frozen verifiers) + a signed attestation, all deterministic →
// byte-stable. Motto: AnthropicSafe First, then ReviewerSafe.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { buildCharter, signCharter, charterDigest } from "../core/charter.mjs";
import { tallies } from "../core/asrCore.mjs";
import { signAttestation, evaluateVar } from "../core/varCore.mjs";
import { CAMPAIGN_SEED, VAR_SCHEMAS, VAR_FAMILY_COUNTS } from "../constants.mjs";
import {
  loadRealCapture,
  makeCaptureBinding,
  VAR_PRIV,
  VAR_PUB,
  VAR_AUTHOR_PRIV,
  VAR_AUTHOR_PUB,
} from "./greenBundle.mjs";
import { buildCorpus, residueSlipTable } from "./build-stage5b-corpus.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5b");

// The full signed VAR attestation bundle (deterministic).
export function buildStage5bAttestation() {
  const { frozen, ceremony } = loadRealCapture();
  const charter = signCharter(
    buildCharter({
      seed: CAMPAIGN_SEED,
      familyCounts: VAR_FAMILY_COUNTS,
      caps: { max_attacks: 100 },
      charterKeyDigest: keyDigest(VAR_PUB),
      captureDeclarationDigest: ceremony.declaration_digest,
    }),
    VAR_PRIV
  );
  const findings = buildCorpus();
  const slip = residueSlipTable(findings);
  const attestation = signAttestation(
    {
      schema: VAR_SCHEMAS.ATTESTATION,
      aggregates: tallies(findings),
      slip_table: slip,
      campaign_digest: charterDigest(charter),
    },
    VAR_AUTHOR_PRIV
  );
  return {
    charter,
    charter_pub_key_pem: VAR_PUB,
    capture_binding: makeCaptureBinding(frozen, ceremony),
    frozen_capture: frozen,
    findings,
    attestation,
    attestation_pub_key_pem: VAR_AUTHOR_PUB,
    floors: slip.floors,
  };
}

export function writeFixtures() {
  mkdirSync(EVID, { recursive: true });
  const bundle = buildStage5bAttestation();
  writeFileSync(join(EVID, "attestation.json"), canonicalJson(bundle));
  return bundle;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const b = writeFixtures();
  const r = evaluateVar(b, { tier: "audit" });
  console.log(
    `stage5b attestation written: ${b.findings.length} attacks, evaluateVar raw=${r.raw}`
  );
}
