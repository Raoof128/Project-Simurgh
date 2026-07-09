// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — Lane C BYO-detector adapter (plan Task 13; F8/PF5). Motto: AnthropicSafe First,
// then ReviewerSafe. Defines the `flagged(text)` interface a lab wraps its own detector in, and
// validates the `lane_c_binding` SHAPE — WITHOUT importing torch/transformers (the heavy Prompt
// Guard / Llama Guard runners live in lanec/*.py and NEVER enter any CI glob). Lane C's grid runs
// over a DIFFERENT base corpus (flagged prompts, not the 4W/4X/4Y bases); its raw texts stay in the
// audit-private artifact (P0-5) and are never public/CI.
export const LANE_C_KIND = "external_detector";
const REQUIRED = [
  "detector_id",
  "detector_version",
  "threshold",
  "base_corpus_digest",
  "verdict_log_digest",
];

// A BYO detector is any deterministic `(text) => boolean` at a pinned threshold. This wrapper
// coerces the result to a strict boolean so it composes with the grid engine unchanged.
export function flaggedAdapter(detectorFn, text) {
  return detectorFn(text) === true;
}

// Validate the public Lane-C binding shape (the 238 surface, adapter-side). Returns null or an error.
export function validateLaneCBinding(binding) {
  if (binding == null) return null; // absent is legal (Lane C is optional, non-CI)
  if (binding.kind !== LANE_C_KIND) return { error: "bad_kind", kind: binding.kind };
  for (const f of REQUIRED)
    if (binding[f] === undefined) return { error: "missing_field", field: f };
  // audit_private_log_digest binds the withheld raw-text log (P0-5) so its later disclosure verifies.
  if (binding.audit_private_log_digest === undefined)
    return { error: "missing_field", field: "audit_private_log_digest" };
  return null;
}
