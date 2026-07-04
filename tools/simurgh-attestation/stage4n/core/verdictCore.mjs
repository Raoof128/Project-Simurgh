// SPDX-License-Identifier: AGPL-3.0-or-later
// Composed verdict — the PINNED gate order (spec §6): Q10 → Q11 → Q15 → Q13 → Q14 → Q16
// → Q12 → Q17. First failure wins so every falsifier has exactly one legal answer.
// The verdict is a pure function of committed inputs (Fix 3): no clock, no IO.
import { validateGenesisPolicy } from "./genesisCore.mjs";
import { verifyChainIntegrity, verifyTemporalCompleteness } from "./chainCore.mjs";
import { verifyInclusionProof, verifyNoEquivocation } from "./inclusionCore.mjs";
import { scanPublicSurface, verifyLeakageBudget, verifyRevealSchedule } from "./gatesCore.mjs";
import { verifySourceRoots } from "../node/sourceRoots.mjs";
import { windowIndex } from "./windowModel.mjs";

export function seismographVerdict({
  policy,
  records,
  asOfWindow,
  sourceRoots,
  publicArtifacts,
  inclusionProof = null,
  secondArtifact = null,
}) {
  const done = (rawCode, reason, gate) => ({
    rawCode,
    reason,
    gate,
    as_of_window: typeof asOfWindow === "string" ? asOfWindow : null,
  });
  let asOfIndex;
  try {
    asOfIndex = windowIndex(asOfWindow);
  } catch {
    return done(49, "schema_invalid", "Q10");
  }
  if (!validateGenesisPolicy(policy).ok) return done(49, "schema_invalid", "Q10");

  const heartbeats = records.filter((r) => r?.record_type === "heartbeat");
  const gates = [
    ["Q10", () => verifyChainIntegrity(records, policy, asOfIndex)],
    ["Q11", () => verifyTemporalCompleteness(records, policy, asOfIndex)],
    ["Q15", () => verifySourceRoots(heartbeats, sourceRoots)],
    ["Q13", () => verifyRevealSchedule(records, policy, asOfIndex)],
    ["Q14", () => verifyLeakageBudget(records, policy)],
    ["Q16", () => scanPublicSurface(publicArtifacts)],
    [
      "Q12",
      () =>
        inclusionProof
          ? verifyInclusionProof({ proof: inclusionProof, feedRecords: records })
          : { raw: 0 },
    ],
    [
      "Q17",
      () =>
        secondArtifact
          ? verifyNoEquivocation({ feedRecords: records, secondArtifact })
          : { raw: 0 },
    ],
  ];
  for (const [gate, run] of gates) {
    const result = run();
    if (result.raw !== 0) return done(result.raw, result.reason, gate);
  }
  return done(0, null, null);
}
