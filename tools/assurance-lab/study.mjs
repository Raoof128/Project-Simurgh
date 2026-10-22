// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { canonical, createPolicy, evaluate, MODES, snapshotAuthority } from "./core.mjs";
import { startSink } from "./sink.mjs";
import { scenarios, mutateTrace } from "./corpus.mjs";

const sourceFiles = [
  "core.mjs",
  "sink.mjs",
  "sink-worker.mjs",
  "corpus.mjs",
  "study.mjs",
  "cli.mjs",
];

async function sourceManifest() {
  return Object.fromEntries(
    await Promise.all(
      sourceFiles.map(async (file) => [
        `tools/assurance-lab/${file}`,
        createHash("sha256")
          .update(await readFile(new URL(file, import.meta.url)))
          .digest("hex"),
      ])
    )
  );
}

export async function runCase(scenario, mode) {
  const authority = snapshotAuthority(scenario.authority);
  const mutableAuthority = structuredClone(authority);
  const policy = createPolicy(mutableAuthority, mode);
  // This mutation is deliberately too late to become authority for the current run.
  if (scenario.lateApproval) mutableAuthority.actions.push(scenario.lateApproval);
  const sink = await startSink();
  const originalTrace = [];
  const decisions = [];
  let observation;
  try {
    if (scenario.id === "sink-failure") {
      await sink.crashForTest();
      try {
        await sink.snapshot();
        throw new Error("fault_not_applied");
      } catch (error) {
        if (error.message !== "sink_closed") throw error;
      }
      observation = { available: false, reason: "sink_failure" };
    } else {
      for (const action of scenario.proposals) {
        const allowed = policy.allows(action);
        decisions.push({ id: action.id, allowed });
        if (allowed) originalTrace.push(await sink.execute(action));
      }
      observation = await sink.snapshot();
      if (scenario.id === "observer-unavailable")
        observation = { available: false, reason: "observer_unavailable" };
    }
    const trace = mutateTrace(scenario, originalTrace);
    const attackApplied =
      scenario.kind === "authorization"
        ? canonical(scenario.baseProposals) !== canonical(scenario.proposals)
        : ["evidence", "invalid-mutation"].includes(scenario.kind)
          ? canonical(originalTrace) !== canonical(trace)
          : null;
    const verdict = evaluate(authority, trace, observation);
    const benignCompleted =
      scenario.kind === "benign" &&
      verdict.forbiddenEffects === 0 &&
      scenario.required.every((action) =>
        observation.effects.some((effect) => canonical(effect.action) === canonical(action))
      );
    return {
      id: scenario.id,
      kind: scenario.kind,
      mode,
      authority,
      proposals: scenario.proposals,
      decisions,
      trace,
      observation,
      attackApplied,
      benignCompleted,
      verdict,
    };
  } finally {
    await sink.close();
  }
}

export async function runStudy() {
  const cases = [];
  for (const mode of MODES)
    for (const scenario of scenarios()) cases.push(await runCase(scenario, mode));
  const summary = Object.fromEntries(
    MODES.map((mode) => {
      const rows = cases.filter((row) => row.mode === mode);
      return [
        mode,
        {
          cases: rows.length,
          appliedAuthorizationAttacks: rows.filter(
            (row) => row.kind === "authorization" && row.attackApplied
          ).length,
          authorizationAttacksWithForbiddenEffects: rows.filter(
            (row) =>
              row.kind === "authorization" && row.attackApplied && row.verdict.forbiddenEffects > 0
          ).length,
          forbiddenEffects: rows.reduce((sum, row) => sum + (row.verdict.forbiddenEffects ?? 0), 0),
          benignCompleted: rows.filter((row) => row.benignCompleted).length,
          appliedEvidenceMutations: rows.filter(
            (row) => row.kind === "evidence" && row.attackApplied
          ).length,
          invalidMutations: rows.filter((row) => row.attackApplied === false).length,
          traceOnlyMismatches: rows.filter((row) => row.verdict.traceOnly === "mismatch").length,
          checkpointMismatches: rows.filter((row) => row.verdict.checkpoint === "mismatch").length,
          reconciledMismatches: rows.filter((row) => row.verdict.reconciled === "mismatch").length,
          unknown: rows.filter((row) => row.verdict.reconciled === "unknown").length,
        },
      ];
    })
  );
  return {
    schema: "simurgh.assurance-lab.v1",
    scope:
      "Authored local file effects; one trusted host/operator; no model or SDK execution; no durable replay claim.",
    sourceManifest: await sourceManifest(),
    cases,
    summary,
  };
}

export async function verifyReport(report) {
  if (
    !report ||
    report.schema !== "simurgh.assurance-lab.v1" ||
    canonical(report.sourceManifest) !== canonical(await sourceManifest())
  )
    throw new Error("report_mismatch: schema or source manifest");
  if (canonical(report) !== canonical(await runStudy()))
    throw new Error("report_mismatch: fresh execution differs");
  return true;
}
