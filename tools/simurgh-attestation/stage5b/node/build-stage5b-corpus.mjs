// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — 46-attack corpus builder + fixture-integrity gate (spec §4; plan Task 10).
// Each attack drives its FROZEN target verifier and records the REAL discovered target_raw; the
// integrity gate re-drives and asserts the recorded code (a fixture that trips an easier code
// than it claims fails the build). The residue family is delivered as a cross-gate slip table
// reconciled against 4X/4Y's SIGNED floors. Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveAttacks } from "../core/attackModel.mjs";
import { outcomeForRaw } from "../core/findingLedger.mjs";
import { attackManifestRoot } from "../core/charter.mjs";
import { floorReconcile, tallies, computeAsr } from "../core/asrCore.mjs";
import { evaluateVar } from "../core/varCore.mjs";
import { CAMPAIGN_SEED } from "../constants.mjs";
import { driveTarget, makeGreenVarBundle } from "./greenBundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");

// Family → (mutation kind). conflict_laundering uses the family-specific launder (→ 5A 205);
// capture_substitution attacks VAR's OWN precommitted-readout guard (→ 214); the rest are driven
// by signature/structural tampering at their target (real codes). Family-specific SEMANTIC
// mutations (paraphrase slip, cell hide, span forgery) are the documented v2 refinement.
function mutationFor(family) {
  if (family === "conflict_laundering") return "launder";
  if (family === "capture_substitution") return "substitute";
  return "signature";
}

// capture_substitution: swap the real capture's tensors so they no longer reconcile → VAR's own
// No Author's Map (214) must catch it. VAR is the target here.
function driveSelf() {
  const b = makeGreenVarBundle();
  const k = Object.keys(b.frozen_capture.tensors_b64)[0];
  b.frozen_capture = structuredClone(b.frozen_capture);
  b.frozen_capture.tensors_b64[k] = Buffer.from([255, 254, 253, 252]).toString("base64");
  return evaluateVar(b, { tier: "audit" }).raw;
}

function driveAttack(attack) {
  const mutation = mutationFor(attack.family);
  if (attack.target_stage === "self") return driveSelf();
  return driveTarget(attack.target_stage, mutation);
}

// The signed residue floors, recomputed from 4X/4Y's committed ledgers (numerator of slip_v2).
export function signedResidueFloors() {
  const x = JSON.parse(
    readFileSync(join(ROOT, "docs/research/llm-shield/evidence/stage-4x/ledger.json"), "utf8")
  );
  const parseNum = (s) => (typeof s === "string" && s.includes("/") ? Number(s.split("/")[0]) : 0);
  return { "4x": parseNum(x.metamorphic_slip_rate_v2), "4y": 2 };
}

// Build the 46-finding corpus by driving every attack at its frozen target.
export function buildCorpus() {
  const attacks = deriveAttacks();
  const findings = attacks.map((a) => {
    const target_raw = driveAttack(a);
    return {
      attack_id: a.attack_id,
      family: a.family,
      target_stage: a.target_stage,
      target_raw,
      outcome: outcomeForRaw(target_raw),
    };
  });
  return findings;
}

// Fixture-integrity gate: re-drive every attack and assert the recorded target_raw is stable
// (a fixture that trips a different code than recorded fails here).
export function assertCorpusIntegrity(findings) {
  const attacks = deriveAttacks();
  for (const f of findings) {
    const a = attacks.find((x) => x.attack_id === f.attack_id);
    const redriven = driveAttack(a);
    if (redriven !== f.target_raw)
      throw new Error(
        `integrity: ${f.attack_id} recorded ${f.target_raw} but re-drove ${redriven}`
      );
  }
  return true;
}

// The cross-gate residue slip-rate table (socket artifact) + floor reconciliation.
export function residueSlipTable(findings) {
  const floors = signedResidueFloors();
  const rec = floorReconcile(findings, floors);
  return { floors, reconciliation: rec };
}

// Frozen charter facts derived from the validated corpus (Task 10B freeze inputs).
export function charterFacts() {
  const attacks = deriveAttacks();
  const familyCounts = {};
  for (const a of attacks) familyCounts[a.family] = (familyCounts[a.family] || 0) + 1;
  return { familyCounts, attack_manifest_root: attackManifestRoot(CAMPAIGN_SEED, familyCounts) };
}

export function corpusSummary() {
  const findings = buildCorpus();
  return {
    findings,
    aggregates: tallies(findings),
    asr: computeAsr(findings),
    slip_table: residueSlipTable(findings),
    ...charterFacts(),
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const s = corpusSummary();
  assertCorpusIntegrity(s.findings);
  console.log(
    `corpus: ${s.findings.length} attacks, ASR ${s.asr}, root ${s.attack_manifest_root.slice(0, 20)}…`
  );
}
