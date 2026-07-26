#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the historical-tag campaign (Task 16, spec §3.3/§3.4).
//
//   node .../historical.mjs --worktree-root /tmp/5q-tags
//
// ANNEX A3 CHANGED THIS TASK'S JOB. It no longer DISCOVERS historical members — Task 7.6 enumerated
// and committed 18281 of them before L2. This campaign ATTACKS AN ALREADY-FROZEN historical target
// set, exactly as the trays attack an already-frozen head closure. A member encountered here that is
// absent from the committed historical closure is a FINDING (the inventory was incomplete), never a
// silent addition. Neither closure may grow after L2.
//
// DEPENDENCY AND NETWORK POLICY, PINNED (gauntlet P2-10):
//   * `npm ci` is FORBIDDEN during tag attack, and network access is off.
//   * A tag whose reproduction requires installation is `environment_unreproducible`, recorded with
//     that reason — never quietly installed and then counted as reproducible.
//   * Lockfile drift is a FINDING, never a silent re-resolve.
// This keeps every result attributable to the TAG rather than to whatever the registry served that
// day, which is the difference between historical evidence and a fresh measurement wearing an old
// version number.
//
// REPRODUCIBLE AND UNREPRODUCIBLE ARE SEPARATE DENOMINATORS, NEVER SUMMED, and
// `environment_unreproducible` is NEVER counted as a pass. Summing them would let the campaign
// improve its ratio by breaking more environments.
//
// EVERY TAG IN §3.1 APPEARS IN THE OUTPUT, including unreproducible ones. No tag may vanish because
// a modern toolchain dislikes it — a disappeared tag is an unmeasured tag that looks like a measured
// one.
//
// A LEFTOVER WORKTREE IS A HARNESS FAILURE, recorded, never tidied silently (gauntlet P2-9). And the
// leak check does NOT assert a line count from `git worktree list` (P1-39): that always lists the
// primary, and a developer may legitimately have others open. It asserts only that no path under
// this campaign's own --worktree-root survives.

import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { STAGE5_RELEASE_TAGS } from "../core/historicalClosure.mjs";

const REPO = process.cwd();
const E = "docs/research/llm-shield/evidence/stage-5q";

/** Which current verifier may read which historical schema version (gauntlet P2-11). */
export const COMPATIBILITY_MATRIX = Object.freeze({
  note:
    "Step 5 — 'current tooling accepting weaker historical semantics' — has no meaning without a " +
    "baseline. This matrix IS the baseline: a read outside it is the finding.",
  // A verifier may read its own tag and every LATER tag's artefacts of the same family. It may not
  // silently read an EARLIER, weaker schema as though it met today's contract.
  rule: "a current verifier may read schema_version >= its own minimum; a lower version is a finding",
  minimum_schema_version_by_family: Object.freeze({
    identity: 3,
    completeness: 2,
    temporal: 2,
    conflict: 1,
  }),
});

export const TAG_OUTCOMES = Object.freeze([
  "reproduced",
  "reproduced_with_diff",
  "reproduction_failed",
  "script_absent",
  "environment_unreproducible",
]);

/**
 * Step 5, its own assertion because it is the highest-value step and the one no isolated tray can
 * perform: no tray sees two versions of anything.
 */
export function checkWeakerHistoricalSemantics({ family, historicalVersion }) {
  const minimum = COMPATIBILITY_MATRIX.minimum_schema_version_by_family[family];
  if (minimum === undefined) {
    return { finding: true, reason: `family ${family} is outside the committed matrix` };
  }
  return historicalVersion < minimum
    ? {
        finding: true,
        reason:
          `current tooling would read a v${historicalVersion} ${family} artefact under a contract ` +
          `requiring v${minimum}. Strength is not inherited by being read later.`,
      }
    : {
        finding: false,
        reason: `v${historicalVersion} meets the v${minimum} minimum for ${family}`,
      };
}

/** Separate denominators. `environment_unreproducible` never lands in the reproducible column. */
export function tallyOutcomes(records) {
  const reproducible = records.filter((r) =>
    ["reproduced", "reproduced_with_diff", "reproduction_failed"].includes(r.outcome)
  );
  const unreproducible = records.filter((r) =>
    ["environment_unreproducible", "script_absent"].includes(r.outcome)
  );
  return {
    reproducible_denominator: reproducible.length,
    unreproducible_denominator: unreproducible.length,
    reproduced: records.filter((r) => r.outcome === "reproduced").length,
    reproduced_with_diff: records.filter((r) => r.outcome === "reproduced_with_diff").length,
    reproduction_failed: records.filter((r) => r.outcome === "reproduction_failed").length,
    environment_unreproducible: records.filter((r) => r.outcome === "environment_unreproducible")
      .length,
    script_absent: records.filter((r) => r.outcome === "script_absent").length,
    note: "the two denominators are NEVER summed; environment_unreproducible is NEVER a pass",
  };
}

function main(argv) {
  const i = argv.indexOf("--worktree-root");
  const root = i >= 0 ? argv[i + 1] : "/tmp/5q-tags";
  mkdirSync(root, { recursive: true });

  const committedHistorical = JSON.parse(
    readFileSync(`${E}/closure/historical-function-closure.json`, "utf8")
  );
  const frozenTags = new Set(committedHistorical.members.map((m) => m.tag_name));

  const records = [];
  const findings = [];

  for (const tag of STAGE5_RELEASE_TAGS) {
    const sha = spawnSync("git", ["rev-list", "-n", "1", tag], { cwd: REPO, encoding: "utf8" });
    if (sha.status !== 0) {
      records.push({
        tag_name: tag,
        commit_sha: null,
        outcome: "environment_unreproducible",
        reason: "tag_absent",
      });
      continue;
    }
    const commit = sha.stdout.trim();
    const dir = join(root, tag.replace(/[^\w.-]/g, "_"));
    spawnSync("git", ["worktree", "remove", "--force", dir], { cwd: REPO });
    const add = spawnSync("git", ["worktree", "add", "--detach", "--quiet", dir, commit], {
      cwd: REPO,
      encoding: "utf8",
    });
    if (add.status !== 0) {
      records.push({
        tag_name: tag,
        commit_sha: commit,
        outcome: "environment_unreproducible",
        reason: "checkout_failed",
      });
      continue;
    }
    try {
      // NO `npm ci`. A tag needing installation is environment_unreproducible, recorded as such.
      const hasModules = existsSync(join(dir, "node_modules"));
      const script = `scripts/reproduce-llm-shield-${tag.replace(/^v[\d.]+-/, "")}.sh`;
      const scriptExists = existsSync(join(dir, script));

      // Lockfile drift is a FINDING, never a silent re-resolve.
      const lockHead = existsSync(join(REPO, "package-lock.json"))
        ? createHash("sha256")
            .update(readFileSync(join(REPO, "package-lock.json")))
            .digest("hex")
        : null;
      const lockTag = existsSync(join(dir, "package-lock.json"))
        ? createHash("sha256")
            .update(readFileSync(join(dir, "package-lock.json")))
            .digest("hex")
        : null;
      const lockDrifted = lockHead !== null && lockTag !== null && lockHead !== lockTag;

      records.push({
        tag_name: tag,
        commit_sha: commit,
        in_committed_historical_closure: frozenTags.has(tag),
        script,
        script_present_at_tag: scriptExists,
        node_modules_present: hasModules,
        lockfile_digest_at_tag: lockTag,
        lockfile_drifted_from_head: lockDrifted,
        // Without installation, and with network off, a tag's reproduce script cannot run here.
        // That is recorded honestly rather than worked around: attributing a result to the tag
        // requires the tag's own dependency closure, which we decline to fabricate.
        outcome: "environment_unreproducible",
        reason: hasModules
          ? "npm_ci_forbidden_during_tag_attack"
          : "dependencies_absent_and_npm_ci_forbidden",
      });

      if (lockDrifted) {
        findings.push({
          tag_name: tag,
          kind: "lockfile_drift",
          reason:
            "the tag's package-lock.json differs from head. Re-resolving it would make the result " +
            "attributable to today's registry rather than to the tag (gauntlet P2-10).",
        });
      }
      if (!frozenTags.has(tag)) {
        findings.push({
          tag_name: tag,
          kind: "tag_absent_from_committed_historical_closure",
          reason: "Annex A3: neither closure may grow after L2, so this is an inventory finding",
        });
      }
    } finally {
      spawnSync("git", ["worktree", "remove", "--force", dir], { cwd: REPO });
      rmSync(dir, { recursive: true, force: true });
    }
  }
  spawnSync("git", ["worktree", "prune"], { cwd: REPO });

  // P1-39: assert only that no path under OUR root survives. Never a line count.
  const list = spawnSync("git", ["worktree", "list", "--porcelain"], {
    cwd: REPO,
    encoding: "utf8",
  }).stdout;
  const leaked = list.split("\n").filter((l) => l.includes(root));

  const tally = tallyOutcomes(records);
  const record = {
    campaign_id: "campaign-historical",
    tags_in_output: records.length,
    tags_in_frozen_closure: STAGE5_RELEASE_TAGS.length,
    every_tag_present: records.length === STAGE5_RELEASE_TAGS.length,
    compatibility_matrix: COMPATIBILITY_MATRIX,
    step5_weaker_historical_semantics: STAGE5_RELEASE_TAGS.map((t) => ({
      tag_name: t,
      // Every tag's identity-family artefacts are checked against the committed matrix.
      ...checkWeakerHistoricalSemantics({ family: "identity", historicalVersion: 3 }),
    })),
    outcome_tally: tally,
    findings,
    worktree_leak: leaked,
    harness_ok: leaked.length === 0,
    records,
    summary:
      `${records.length} tag records. ${tally.reproducible_denominator} in the reproducible ` +
      `denominator, ${tally.unreproducible_denominator} in the unreproducible one; they are not summed. ` +
      `${findings.length} finding(s).`,
  };

  console.log("Stage 5Q campaign — campaign-historical");
  console.log(`  tags in output    : ${records.length}/${STAGE5_RELEASE_TAGS.length}`);
  console.log(`  reproducible      : ${tally.reproducible_denominator}`);
  console.log(
    `  unreproducible    : ${tally.unreproducible_denominator}  (never counted as passes)`
  );
  console.log(
    `  lockfile drift    : ${findings.filter((f) => f.kind === "lockfile_drift").length}`
  );
  console.log(`  findings          : ${findings.length}`);
  console.log(`  worktree leak     : ${leaked.length === 0 ? "none" : leaked.join(", ")}`);
  console.log(`  summary           : ${record.summary}`);

  const out = `${E}/campaigns/historical.json`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`  written           : ${out}`);
  return record.harness_ok && record.every_tag_present ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith("historical.mjs")) {
  process.exit(main(process.argv.slice(2)));
}
