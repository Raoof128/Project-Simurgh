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

import { readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join as joinPath } from "node:path";
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

/**
 * Run the pinned non-disturbance manifest. Every command's real exit status, no `|| echo`.
 *
 * `cwd` lets the same manifest run against a scratch worktree at the merge-base, which is how a
 * failure gets ATTRIBUTED. Without a baseline, a prior stage that was already broken on this
 * machine reads as "5Q regressed it" — a false attribution, and the reporting analogue of the false
 * findings this stage spent its whole length refusing to publish.
 */
function runManifest(cwd = process.cwd(), label = "HEAD") {
  const results = [];
  const run = (command, argv, treeRelative = false) => {
    const res = spawnSync(argv[0], argv.slice(1), {
      cwd,
      encoding: "utf8",
      timeout: 1_800_000,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, SIMURGH_SKIP_DOTENV: "1" },
    });
    results.push({ command, ok: res.status === 0, exit: res.status, tree_relative: treeRelative });
    process.stdout.write(`      ${res.status === 0 ? "✔" : "✗"} [${label}] ${command}\n`);
  };

  run("scripts/check-e2e.sh", ["bash", "scripts/check-e2e.sh"]);
  for (const stage of UNCOVERED_STAGES) {
    const script = `scripts/reproduce-llm-shield-stage${stage}.sh`;
    run(script, ["bash", script]);
  }
  // TREE-RELATIVE: `HEAD~1..HEAD` names a different commit pair in every tree it runs in, so its
  // result cannot be compared against a baseline. Flagged so attribution says `not_comparable`
  // rather than inventing a comparison.
  run(
    "write surface HEAD~1..HEAD",
    [
      process.execPath,
      "tools/simurgh-attestation/stage5q/node/checkWriteSurface.mjs",
      "--range",
      "HEAD~1..HEAD",
    ],
    true
  );
  return results;
}

/** Run the manifest against a throwaway checkout of `ref`, so nothing it writes survives. */
function runManifestIsolated(ref, label) {
  const scratch = joinPath(process.cwd(), ".git", `5q-manifest-${label}`);
  rmSync(scratch, { recursive: true, force: true });
  const add = spawnSync("git", ["worktree", "add", "--detach", "--quiet", scratch, ref], {
    encoding: "utf8",
  });
  if (add.status !== 0) {
    console.log(`  REFUSING to run the manifest in the primary tree — scratch worktree failed`);
    return [];
  }
  try {
    return runManifest(scratch, label);
  } finally {
    spawnSync("git", ["worktree", "remove", "--force", scratch]);
    rmSync(scratch, { recursive: true, force: true });
  }
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
  const wantBaseline = argv.includes("--baseline");
  if (wantManifest) console.log("  running the pinned non-disturbance manifest:");
  // THE HEAD RUN GOES IN A SCRATCH WORKTREE TOO, and this is not symmetry for its own sake.
  // `check-e2e.sh` runs Stage 4H's digest-fixture builder, which REGENERATES
  // `evidence/stage-4h/exit-map.json` in whatever tree it runs in. Run in the primary worktree, the
  // non-disturbance gate disturbs prior-stage evidence — and it did: two 4H files were regenerated
  // and then swept into a commit by `git add -A`, a real §6.1 violation caused by the check that
  // exists to catch §6.1 violations. Same shape as finding 5Q-F003, one layer up.
  const manifestResults = wantManifest ? runManifestIsolated("HEAD", "HEAD") : null;

  // The baseline run, in a scratch worktree at the merge-base. Opt-in because it doubles a run that
  // already takes tens of minutes — and because "we did not check" is reported as `not_compared`
  // rather than quietly as "not our fault".
  let baselineResults = null;
  if (wantManifest && wantBaseline) {
    const mergeBase = spawnSync("git", ["merge-base", "main", "HEAD"], {
      encoding: "utf8",
    }).stdout.trim();
    const scratch = joinPath(process.cwd(), ".git", "5q-transition-baseline");
    rmSync(scratch, { recursive: true, force: true });
    const add = spawnSync("git", ["worktree", "add", "--detach", "--quiet", scratch, mergeBase], {
      encoding: "utf8",
    });
    if (add.status !== 0) {
      console.log(`  baseline worktree failed; attribution will read not_compared`);
    } else {
      console.log(`  re-running the manifest at the merge-base ${mergeBase.slice(0, 8)}:`);
      try {
        baselineResults = runManifest(scratch, "base");
      } finally {
        spawnSync("git", ["worktree", "remove", "--force", scratch]);
        rmSync(scratch, { recursive: true, force: true });
      }
    }
  }

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
    baselineResults,
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
  } else if (result.manifest_attribution) {
    const a = result.manifest_attribution;
    console.log(
      `\n  DID Q0 DISTURB A PRIOR STAGE : ${result.q0_disturbed_a_prior_stage ? "YES" : "NO"}`
    );
    if (a.pre_existing.length) {
      console.log(`      pre-existing (identical at the merge-base): ${a.pre_existing.join(", ")}`);
    }
    if (a.not_compared.length) {
      console.log(
        `      NOT COMPARED (pass --baseline to attribute): ${a.not_compared.join(", ")}`
      );
    }
  }

  return result.q1_authorised && gaps.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}

export { TRANSITION_CONDITIONS };
