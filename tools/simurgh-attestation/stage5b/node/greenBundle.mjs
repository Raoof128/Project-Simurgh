// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — green bundle + target-verifier drivers (spec §5, §9; plan Task 9).
// The green VAR bundle is grounded on the REAL Llama-3.2-1B Lane C capture (byte-stable). The
// drivers import the FROZEN 4V→5A verifiers read-only and run mutated bundles AT them to
// discover each attack's true target_raw. Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { buildCharter, signCharter } from "../core/charter.mjs";
import { frozenCaptureRoot } from "../core/captureBinding.mjs";
import { tallies } from "../core/asrCore.mjs";
import { signAttestation } from "../core/varCore.mjs";
import { CAMPAIGN_SEED, VAR_SCHEMAS } from "../constants.mjs";
// Frozen target verifiers (READ-ONLY imports — no predecessor is modified).
import {
  buildGreenVncBundle,
  rebuildAttestation,
  VNC_PUB,
  VWA_PUB,
} from "../../stage5a/node/greenBundle.mjs";
import { evaluateVnc, signArtifact } from "../../stage5a/core/vncCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const K = join(ROOT, "tests/fixtures/llmShield/stage5b/test-keys");
const rd = (p) => readFileSync(p, "utf8");
export const VAR_PRIV = rd(join(K, "INSECURE_FIXTURE_ONLY_var.pem"));
export const VAR_PUB = rd(join(K, "INSECURE_FIXTURE_ONLY_var.pub.pem"));
export const VAR_AUTHOR_PRIV = rd(join(K, "INSECURE_FIXTURE_ONLY_var-author.pem"));
export const VAR_AUTHOR_PUB = rd(join(K, "INSECURE_FIXTURE_ONLY_var-author.pub.pem"));

// The REAL Lane C capture (committed byte-stable evidence).
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5b/lanec");
export function loadRealCapture() {
  const frozen = JSON.parse(readFileSync(join(EVID, "frozen_capture.json"), "utf8"));
  const ceremony = JSON.parse(readFileSync(join(EVID, "ceremony.json"), "utf8")).ceremony;
  return { frozen, ceremony };
}

// Build a capture_binding that reconciles the real frozen capture to the charter's declaration.
export function makeCaptureBinding(frozen, ceremony) {
  return {
    schema: VAR_SCHEMAS.CAPTURE_BINDING,
    ceremony,
    tensor_commitment_root: frozenCaptureRoot(frozen),
    capture_key_digest: keyDigest(VAR_PUB),
    declaration_digest: ceremony.declaration_digest,
  };
}

// A green VAR bundle grounded on the real capture. `findings` default: one survived finding per
// scheduled attack id (target caught it). Task 10 replaces target_raw with the DRIVEN values.
export function makeGreenVarBundle({ familyCounts = { conflict_laundering: 2 }, findings } = {}) {
  const { frozen, ceremony } = loadRealCapture();
  const charter = signCharter(
    buildCharter({
      seed: CAMPAIGN_SEED,
      familyCounts,
      caps: { max_attacks: 100 },
      charterKeyDigest: keyDigest(VAR_PUB),
      captureDeclarationDigest: ceremony.declaration_digest,
    }),
    VAR_PRIV
  );
  const scheduled = [];
  for (const [fam, n] of Object.entries(familyCounts))
    for (let i = 0; i < n; i++) scheduled.push({ id: `${CAMPAIGN_SEED}:${fam}#${i}`, fam });
  const fnds =
    findings ??
    scheduled.map(({ id, fam }) => ({
      attack_id: id,
      family: fam,
      target_stage: "5a",
      target_raw: 205, // survived: the target caught it (non-zero)
      outcome: "survived",
    }));
  const attestation = signAttestation(
    { schema: VAR_SCHEMAS.ATTESTATION, aggregates: tallies(fnds) },
    VAR_AUTHOR_PRIV
  );
  return {
    charter,
    charter_pub_key_pem: VAR_PUB,
    capture_binding: makeCaptureBinding(frozen, ceremony),
    frozen_capture: frozen,
    findings: fnds,
    attestation,
    attestation_pub_key_pem: VAR_AUTHOR_PUB,
    floors: {},
  };
}

// ---- Target drivers (READ-ONLY): run a mutated bundle at the frozen verifier → true raw. ----

const VNC_OPTS = { tier: "audit", vncPubKeyPem: VNC_PUB, vwaPubKeyPem: VWA_PUB };

// 5A driver. `mutation` ∈ { none, launder, signature }.
export function driveTarget5A(mutation = "none") {
  if (mutation === "none") return evaluateVnc(buildGreenVncBundle(), VNC_OPTS).raw;
  if (mutation === "signature") {
    const b = buildGreenVncBundle();
    b.ledger.signature = b.ledger.signature.replace(/^./, (c) => (c === "0" ? "1" : "0"));
    return evaluateVnc(b, VNC_OPTS).raw;
  }
  if (mutation === "launder") {
    // conflict_laundering: relabel a real contradiction as corroborated, RE-SIGN the ledger so
    // the signature passes but the verdict recompute (5A raw 205) catches the lie.
    const b = buildGreenVncBundle({ conflict: true });
    const content = structuredClone(b.ledger.content);
    const v = content.verdicts.find((x) => x.verdict === "contradicted");
    if (v) v.verdict = "corroborated";
    b.ledger = signArtifact(content, VNC_PRIV_5A(), VNC_PUB);
    rebuildAttestation(b); // re-bind the attestation to the laundered ledger (else 201 masks 205)
    return evaluateVnc(b, VNC_OPTS).raw;
  }
  throw new Error("unknown mutation " + mutation);
}

// 5A's ledger signing key (read-only import kept lazy to avoid a load-order cycle).
function VNC_PRIV_5A() {
  return readFileSync(
    join(ROOT, "tests/fixtures/llmShield/stage5a/test-keys/INSECURE_FIXTURE_ONLY_vnc.pem"),
    "utf8"
  );
}
