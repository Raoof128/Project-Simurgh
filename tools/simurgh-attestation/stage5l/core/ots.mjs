// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q OTS structural (370) + finality-claimed-vs-computed (380). 370/380 are disjoint:
// declared=pending & computed=pending → 380 silent; a false confirmed claim over computed pending → 380.
import { R } from "./result.mjs";

// 370 — OTS proof / Merkle path / checkpoint-evidence structurally invalid (S4: skips if no OTS anchor).
export function checkOtsStructural(ctx) {
  if (!ctx.otsAnchor) return null; // Core with no OTS: nothing to structurally verify
  if (ctx.otsState === "invalid") return R(370, "ots_path_invalid");
  const ce = ctx.otsAnchor.checkpoint_evidence;
  if (ce && !ctx.otsWitnessAccepted) return R(370, "checkpoint_witness_not_accepted"); // wrong chain/checkpoint
  return null;
}

// 380 — declared finality state != computed. Runs right after 370 (spine).
export function checkFinalityOverclaim(ctx) {
  if (!ctx.otsAnchor) return null;
  if (ctx.declaredFinality !== ctx.computedFinality) {
    return R(380, "finality_claimed_vs_computed", {
      declared: ctx.declaredFinality,
      computed: ctx.computedFinality,
    });
  }
  return null;
}
