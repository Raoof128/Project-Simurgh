// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — recipe engine (plan Task 3). Motto: AnthropicSafe First, then ReviewerSafe.
// A recipe is an ordered [{op,args}] pure transform base_text → evasion. applyRecipe is a pure
// function of (base, recipe) [Lean recipeDeterminism]; no raw-payload trust — anyone regenerates the
// exact bytes from the public base + recipe, then re-runs the gate.
import { createHash } from "node:crypto";
import { VARL_RECIPE_OPS } from "../constants.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

const CGJ = "͏"; // Combining Grapheme Joiner (invisible)
const sha256 = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const sortedEntries = (m) =>
  Object.entries(m ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

// Each op: (text, args) -> text. Pure. Codepoint-indexed where positional.
const OPS = {
  fullwidth_digits: (t) => t.replace(/[0-9]/g, (d) => String.fromCodePoint(0xff10 + Number(d))),
  percent_to_per_cent: (t) => t.replaceAll("percent", "per cent"),
  spell_number: (t, { map } = {}) =>
    sortedEntries(map).reduce((s, [k, v]) => s.replaceAll(k, v), t),
  homoglyph_month: (t, { map } = {}) =>
    sortedEntries(map).reduce((s, [k, v]) => s.replaceAll(k, v), t),
  combining_joiner: (t, { positions = [] } = {}) => {
    const cp = [...t];
    // insert CGJ after each codepoint index; apply descending so earlier indices stay valid
    for (const p of [...positions].sort((a, b) => b - a)) {
      if (p < 0 || p >= cp.length) throw new Error(`combining_joiner index out of range: ${p}`);
      cp.splice(p + 1, 0, CGJ);
    }
    return cp.join("");
  },
  cross_script_confusable: (t, { replacements = [] } = {}) => {
    const cp = [...t];
    for (const { index, to } of replacements) {
      if (index < 0 || index >= cp.length)
        throw new Error(`confusable index out of range: ${index}`);
      cp[index] = to;
    }
    return cp.join("");
  },
  literal: (_t, { text } = {}) => {
    if (typeof text !== "string") throw new Error("literal op requires { text: string }");
    return text;
  },
};

export function applyRecipe(baseText, recipe) {
  if (!Array.isArray(recipe)) throw new Error("recipe must be an array");
  return recipe.reduce((text, step) => {
    if (!step || typeof step.op !== "string" || !VARL_RECIPE_OPS.includes(step.op))
      throw new Error(`unknown recipe op: ${step && step.op}`);
    return OPS[step.op](text, step.args ?? {});
  }, String(baseText));
}

export const evasionDigest = (baseText, recipe) => sha256(applyRecipe(baseText, recipe));
export const recipeDigest = (recipe) => sha256(canonicalJson(recipe));
