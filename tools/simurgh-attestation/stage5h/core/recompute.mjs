// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — recompute recipe INTEGRITY (raw 310, Law 2's anti-gaming floor). PURE, static, from
// the bundle + committed recipes: it never runs a recipe (that is the kernel's job) and never judges
// output matching (that is a tier fact → 311). Runs for EVERY claim carrying a recompute block
// (controlled included), kernel or no kernel. The recompute_recipe DOMAIN is consumed here.
import { DOMAIN, VSD_SCHEMAS } from "../constants.mjs";
import { domainDigest } from "./digests.mjs";

const RAW = 310;
const fail = (reason, claim_id) => ({ ok: false, raw: RAW, reason, claim_id });

export function checkRecipeIntegrity(ctx) {
  for (const c of ctx.bundle.claim_inventory.content.claims) {
    if (!c.recompute) continue;
    const recipe = ctx.recipes ? ctx.recipes[c.claim_id] : undefined;
    if (recipe === undefined) return fail("recipe_missing", c.claim_id);
    if (domainDigest(DOMAIN.recompute_recipe, recipe) !== c.recompute.recipe_digest) {
      return fail("recipe_digest_mismatch", c.claim_id);
    }
    if (recipe.schema !== VSD_SCHEMAS.recompute_recipe || recipe.op !== "aggregate_mean") {
      return fail("recipe_grammar_invalid", c.claim_id);
    }
    if (
      typeof recipe.metric !== "string" ||
      !Number.isInteger(recipe.decimals) ||
      !Array.isArray(recipe.input_artefact_ids)
    ) {
      return fail("recipe_grammar_invalid", c.claim_id);
    }
    if (recipe.input_artefact_ids.length === 0) {
      return fail("constant_output_recipe", c.claim_id);
    }
    const presentIds = new Set(c.artefact_manifest.present.map((p) => p.artefact_id));
    for (const id of recipe.input_artefact_ids) {
      if (!presentIds.has(id)) return fail("recipe_input_not_present", c.claim_id);
    }
  }
  return { ok: true };
}
