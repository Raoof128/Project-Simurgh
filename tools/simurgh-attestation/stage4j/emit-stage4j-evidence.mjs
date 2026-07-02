#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Emits the Stage 4J evidence set from the COMMITTED fixtures: p-gate-results.json (observed
// per-gate verdicts — the file the positioning brief's §10 Measured column is read from),
// offline-report.json (CLI run under the offline pre-flight), authorization-proof.json and
// pcta-manifest.json (the clean fixture's reviewable artifacts). Fails closed: if ANY observed
// verdict disagrees with the expected matrix, this script exits non-zero — evidence is never
// written that contradicts the contract.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stage4CodeForRawCode } from "../stage4h/exitCodes.mjs";
import { runPctaCore } from "./verify-stage4j-pcta.mjs";

const FX = "tests/fixtures/llmShield/stage4j";
const EV = "docs/research/llm-shield/evidence/stage-4j";
const GATE_BY_FIXTURE = Object.freeze({
  "clean-authorized": "P0",
  "missing-proof": "P1",
  "forged-sig": "P2",
  "stale-proof": "P3",
  "dirty-cert-reverify": "P4-pre",
  "untrusted-authority": "P4",
  "action-mismatch": "P5",
  "enforcement-gap": "P6",
  "digest-mismatch": "P7",
  "sink-underdeclared": "P8",
});

mkdirSync(EV, { recursive: true });
const matrix = JSON.parse(readFileSync(`${FX}/expected-results/pcta-matrix.json`, "utf8"));

const gates = [];
for (const [fixture, expected] of Object.entries(matrix)) {
  const r = await runPctaCore({
    fixture: `${FX}/${fixture}.json`,
    pinnedPubkeyPath: `${FX}/pcta-signer.pub`,
  });
  const typedCode = stage4CodeForRawCode(r.rawCode);
  if (r.rawCode !== expected.raw || typedCode !== expected.typed) {
    console.error(
      `EVIDENCE REFUSED: ${fixture} observed ${r.rawCode}->${typedCode}, expected ${expected.raw}->${expected.typed}`
    );
    process.exit(1);
  }
  gates.push({
    gate: GATE_BY_FIXTURE[fixture] ?? "unmapped",
    fixture: `${fixture}.json`,
    rawCode: r.rawCode,
    typedCode,
    reason: r.reason,
  });
}
writeFileSync(
  `${EV}/p-gate-results.json`,
  `${JSON.stringify(
    {
      schema: "simurgh.pcta.p-gate-results.v1",
      source: "observed by re-running the committed fixture matrix; never hand-written",
      gates,
    },
    null,
    2
  )}\n`
);

// CLI run of the clean fixture under the offline pre-flight -> offline-report.json.
execFileSync(process.execPath, [
  "tools/simurgh-attestation/stage4j/verify-stage4j-pcta.mjs",
  "--fixture",
  `${FX}/clean-authorized.json`,
  "--pinned-pubkey",
  `${FX}/pcta-signer.pub`,
  "--out",
  `${EV}/offline-report.json`,
]);

// Reviewable artifacts from the clean fixture.
const clean = JSON.parse(readFileSync(`${FX}/clean-authorized.json`, "utf8"));
writeFileSync(`${EV}/authorization-proof.json`, `${JSON.stringify(clean.proof, null, 2)}\n`);
writeFileSync(`${EV}/pcta-manifest.json`, `${JSON.stringify(clean.pcta_manifest, null, 2)}\n`);
console.log(`stage4j evidence written to ${EV}`);
