// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 418 interpretability: corroborating only, NEVER green-gating. optional+absent → pass;
// present must bind run_id + D_out; not_in_scope + present → 418 (incoherent commitment).
import { R } from "./result.mjs";

export function checkInterp(env) {
  const channel = env.delay_policy?.interpretability_policy?.channel;
  const ev = env.interpretability;
  if (ev === null || ev === undefined) return null; // absent is honest for optional/not_in_scope
  if (channel === "not_in_scope")
    return R(418, "interpretability_evidence_invalid_or_unbound", {
      detail: "present_but_not_in_scope",
    });
  if (typeof ev !== "object")
    return R(418, "interpretability_evidence_invalid_or_unbound", { detail: "malformed" });
  if (ev.bound_run_id !== env.run_id || ev.bound_D_out !== env.D_out)
    return R(418, "interpretability_evidence_invalid_or_unbound", { detail: "unbound" });
  return null;
}
