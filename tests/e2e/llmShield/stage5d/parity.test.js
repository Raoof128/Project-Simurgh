// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — JS ↔ Python ↔ browser-realm parity on the deterministic reconstruction surface
// (plan Task 15). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applyRecipe } from "../../../../tools/simurgh-attestation/stage5d/core/recipes.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const EVID = join(REPO, "docs/research/llm-shield/evidence/stage-5d");
const bundle = JSON.parse(readFileSync(join(EVID, "varl-ledger.json"), "utf8"));
const baseText = Object.fromEntries(bundle.base_corpus.map((b) => [b.base_id, b.base_text]));
const sha = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

test("Python parity reproduces every evasion digest + audit binding", () => {
  const out = execFileSync("python3", [
    join(REPO, "tools/simurgh-attestation/stage5d/python/varl_parity.py"),
  ]).toString();
  assert.match(out, /PARITY OK — 18 evasion digests/);
});

test("JS (Node) reproduces every committed evasion digest", () => {
  for (const rung of bundle.rungs)
    for (const e of rung.evasions)
      assert.equal(sha(applyRecipe(baseText[e.base_id], e.recipe)), e.evasion_digest);
});

test("browser-realm applyRecipe (node:vm) matches — same bytes across realms", () => {
  // A self-contained applyRecipe (the subset the browser verifier ships), run in a fresh realm.
  const src = `
    const CGJ = "\\u034F";
    function applyRecipe(base, recipe){
      let t = base;
      for (const s of recipe){
        const a = s.args || {};
        if (s.op === "fullwidth_digits") t = t.replace(/[0-9]/g, d => String.fromCodePoint(0xff10+Number(d)));
        else if (s.op === "percent_to_per_cent") t = t.replaceAll("percent","per cent");
        else if (s.op === "spell_number" || s.op === "homoglyph_month") { for (const k of Object.keys(a.map||{}).sort()) t = t.replaceAll(k, a.map[k]); }
        else if (s.op === "combining_joiner") { const cp=[...t]; for (const p of [...(a.positions||[])].sort((x,y)=>y-x)) cp.splice(p+1,0,CGJ); t=cp.join(""); }
        else if (s.op === "cross_script_confusable") { const cp=[...t]; for (const r of (a.replacements||[])) cp[r.index]=r.to; t=cp.join(""); }
        else if (s.op === "literal") t = a.text;
        else throw new Error("unknown op");
      }
      return t;
    }
    globalThis.__run = (base, recipe) => applyRecipe(base, recipe);
  `;
  const ctx = {};
  runInNewContext(src, ctx);
  for (const rung of bundle.rungs)
    for (const e of rung.evasions) {
      const realmText = ctx.__run(baseText[e.base_id], e.recipe);
      // compare by VALUE across realms (node:vm array/string gotcha) — hash equality
      assert.equal(sha(realmText), e.evasion_digest);
    }
});
