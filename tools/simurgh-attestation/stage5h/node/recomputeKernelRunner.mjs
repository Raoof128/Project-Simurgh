// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the pinned recompute kernel (Node side; the ONLY place a recipe is executed). It is a
// deterministic recipe INTERPRETER, not arbitrary code (3T frozen-recipe style): the sole op is
// `aggregate_mean` over the `value` fields of the listed artefacts' rows, as scaled-integer decimal
// arithmetic (half-up) — never binary float. The pure core consumes only its {matched, digest} result.
import { artifactDigest } from "../core/digests.mjs";

function parseScaled(v, decimals) {
  const scale = 10n ** BigInt(decimals);
  const neg = String(v).startsWith("-");
  const [intPart, fracPart = ""] = String(v).replace("-", "").split(".");
  const frac = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  const val = BigInt(intPart || "0") * scale + BigInt(frac || "0");
  return neg ? -val : val;
}
function formatScaled(scaled, decimals) {
  const scale = 10n ** BigInt(decimals);
  const i = scaled / scale;
  const f = (scaled % scale).toString().padStart(decimals, "0");
  return `${i}.${f}`;
}
export function aggregateMean(values, decimals) {
  const n = BigInt(values.length);
  let sum = 0n;
  for (const v of values) sum += parseScaled(v, decimals);
  const meanScaled = (2n * sum + n) / (2n * n); // half-up
  return formatScaled(meanScaled, decimals);
}

// Execute one recipe against the artefact bytes → the canonical output object.
export function runRecipe(recipe, artefactBytes) {
  if (recipe.op !== "aggregate_mean") throw new Error(`unknown recipe op ${recipe.op}`);
  const values = recipe.input_artefact_ids.flatMap((id) =>
    artefactBytes[id].rows.map((r) => r.value)
  );
  return { metric: recipe.metric, mean: aggregateMean(values, recipe.decimals), n: values.length };
}

// Rerun recipes for PUBLIC-declared claims only (R1's rerun is the host's, not ours). Returns the
// recomputeResult map the pure core expects: { [claim_id]: { matched, computed_output_digest } }.
export function runRecomputeKernel({ claims, recipes, artefactBytes }) {
  const result = {};
  for (const c of claims) {
    if (c.declared_tier !== "public" || !c.recompute) continue;
    const recipe = recipes[c.claim_id];
    const output = runRecipe(recipe, artefactBytes);
    const computed_output_digest = artifactDigest(output);
    result[c.claim_id] = {
      matched: computed_output_digest === c.recompute.committed_output_digest,
      computed_output_digest,
    };
  }
  return result;
}
