#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the Q0→Q1 transition validator (Task 21).
//
//   node .../verifyTransition.mjs                run T1-T6, and T7 only if --manifest is given
//   node .../verifyTransition.mjs --manifest     also run the prior-stage non-disturbance manifest
//                                                (slow: eight reproduce scripts plus check-e2e.sh)
//
// TASK 21 PRODUCES NO EVIDENCE. It validates. Everything it reads was frozen by Task 20, and if
// this file wrote anything it would be producing evidence after the declared endpoint — which is
// the ghost-producer shape the plan's tail reordering removed.
//
// WITHOUT --manifest, T7 IS REPORTED AS NOT RUN, AND NOT RUN IS NOT A PASS. The earlier version of
// this gate used `cmd || echo "REGRESSED"`, which prints the failure and then exits successfully —
// recreating, inside the gate meant to catch regressions, the exact fail-open shell shape this
// stage prohibits everywhere else.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createPublicKey } from "node:crypto";
import {
  evaluateTransition,
  manifestGaps,
  UNCOVERED_STAGES,
  TRANSITION_CONDITIONS,
} from "../core/transition.mjs";
import { verifyAttestation, ROOT_NAMES } from "../core/attestation.mjs";
import { verifyChain } from "../core/findingLedger.mjs";
import { freezeReceipt } from "../core/frozenBlock.mjs";
import { recomputeRoots } from "./attestation.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const A = `${E}/attestation`;
const SPEC = "docs/superpowers/specs/2026-07-26-stage-5q-vsr-stage-wide-red-team-design.md";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** Run the pinned non-disturbance manifest. Every command's real exit status, no `|| echo`. */
function runManifest() {
  const results = [];
  const run = (command, argv) => {
    const res = spawnSync(argv[0], argv.slice(1), {
      encoding: "utf8",
      timeout: 1_800_000,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, SIMURGH_SKIP_DOTENV: "1" },
    });
    results.push({ command, ok: res.status === 0, exit: res.status });
    process.stdout.write(`      ${res.status === 0 ? "✔" : "✗"} ${command}\n`);
  };

  run("scripts/check-e2e.sh", ["bash", "scripts/check-e2e.sh"]);
  for (const stage of UNCOVERED_STAGES) {
    const script = `scripts/reproduce-llm-shield-stage${stage}.sh`;
    run(script, ["bash", script]);
  }
  run("write surface HEAD~1..HEAD", [
    process.execPath,
    "tools/simurgh-attestation/stage5q/node/checkWriteSurface.mjs",
    "--range",
    "HEAD~1..HEAD",
  ]);
  return results;
}

function main(argv) {
  const bundlePath = `${A}/public-structural-bundle.json`;
  const envelopePath = `${A}/signed-audit-envelope.json`;
  if (!existsSync(bundlePath) || !existsSync(envelopePath)) {
    console.log("REFUSING: there is no signed Q0 attestation to transition from (Task 20).");
    return 1;
  }

  const bundle = readJson(bundlePath);
  const envelope = readJson(envelopePath);
  const { roots } = recomputeRoots();
  const publicKey = createPublicKey({
    key: Buffer.from(envelope.signer.public_key_b64, "base64"),
    format: "der",
    type: "spki",
  });
  const attestationResult = verifyAttestation({
    bundle,
    envelope,
    recomputedRoots: roots,
    publicKey,
  });

  const coverageDoc = readJson(`${E}/coverage/discharge-ledger.json`);
  const overlay = coverageDoc.overlay ?? [];
  const ids = overlay.map((o) => o.function_id);
  const coverage = {
    member_count: overlay.length,
    statused: overlay.filter((o) => o.coverage_status !== null).length,
    duplicated: ids.length - new Set(ids).size,
  };

  const ledgerDoc = readJson(`${E}/findings/q0-finding-ledger.json`);
  const chain = verifyChain({ records: ledgerDoc.records, head_digest: ledgerDoc.head_digest });
  const ledger = {
    chain_ok: chain.ok,
    broken_at: chain.brokenAt,
    record_count: ledgerDoc.record_count,
    q1_record_count: ledgerDoc.records.filter((r) => r.record_kind === "q1").length,
  };

  const frozenBlockDigest = freezeReceipt(readFileSync(SPEC, "utf8")).digest;

  const wantManifest = argv.includes("--manifest");
  if (wantManifest) console.log("  running the pinned non-disturbance manifest:");
  const manifestResults = wantManifest ? runManifest() : null;

  const result = evaluateTransition({
    attestation: {
      verified: attestationResult.ok,
      roots_recomputed: attestationResult.steps.some((s) => s.step === "roots_recompute" && s.ok),
      root_count: ROOT_NAMES.length,
      inadmissible_classes: bundle.inadmissible_classes,
    },
    coverage,
    ledger,
    frozenBlockDigest,
    manifestResults,
  });

  // The manifest coverage check: every stage-5 reproduce script must be accounted for by either
  // check-e2e.sh or the pinned list. A script in neither is silently outside the whole gate.
  const allScripts = readdirSync("scripts")
    .filter((f) => /^reproduce-llm-shield-stage5[a-p]\.sh$/.test(f))
    .map((f) => `scripts/${f}`)
    .sort();
  const checkE2e = readFileSync("scripts/check-e2e.sh", "utf8");
  const covered = allScripts.filter((s) => checkE2e.includes(s.replace("scripts/", "")));
  const gaps = manifestGaps({ allStageScripts: allScripts, coveredByCheckE2e: covered });

  console.log("\nStage 5Q — Q0->Q1 transition (Task 21)");
  for (const c of result.conditions) {
    console.log(`  ${c.ok ? "✔" : "✗"} ${c.id}  ${c.detail}`);
  }
  console.log(
    `\n  manifest coverage : ${gaps.length === 0 ? "every stage-5 script accounted for" : `GAPS: ${gaps.join(", ")}`}`
  );
  console.log(`  Q1 AUTHORISED     : ${result.q1_authorised ? "YES" : "NO"}`);
  console.log(
    `  STAGE RELEASE     : ${result.stage_release_blocked ? "BLOCKED" : "not blocked by this gate"}`
  );
  if (result.release_blocked_reason) console.log(`      ${result.release_blocked_reason}`);
  if (!wantManifest) {
    console.log(
      "\n  T7 was NOT RUN. Pass --manifest to execute it. A condition that did not run has not\n" +
        "  passed, which is why it is reported as a failure rather than skipped."
    );
  }

  return result.q1_authorised && gaps.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}

export { TRANSITION_CONDITIONS };
