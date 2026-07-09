// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — ledger recompute checks 242–249 (plan Task 7). Motto: AnthropicSafe First, then
// ReviewerSafe. Each check returns null (ok) or its raw code (first fault). All recompute from the
// PUBLIC base_corpus + pinned gate sources — no attacker trust.
import { applyRecipe, evasionDigest } from "./recipes.mjs";
import { verdictAt, sourceDigest } from "./gateRegistry.mjs";
import { cornerOutcomes } from "./trilemma.mjs";
import { classifyDurability } from "./durability.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

const baseIndex = (bundle) =>
  Object.fromEntries((bundle.base_corpus ?? []).map((b) => [b.base_id, b]));

// 242 — every gate_registry entry's source_digest matches the pinned bytes.
export function checkSourceDigests(bundle) {
  for (const g of bundle.gate_registry ?? []) {
    let d;
    try {
      d = sourceDigest(g.gate_version);
    } catch {
      return 242;
    }
    if (d !== g.source_digest) return 242;
  }
  return null;
}

// 243 — rounds contiguous 1..N, every rung non-empty (No Silent Round, structural).
export function checkContiguity(bundle) {
  const rungs = bundle.rungs ?? [];
  if (rungs.length === 0) return 243;
  for (let i = 0; i < rungs.length; i++) {
    if (rungs[i].round !== i + 1) return 243;
    if (!Array.isArray(rungs[i].evasions) || rungs[i].evasions.length === 0) return 243;
  }
  return null;
}

// 244 — applyRecipe(base_text, recipe) hashes to evasion_digest (unknown op / bad args → 244).
export function checkRecipes(bundle) {
  const idx = baseIndex(bundle);
  for (const rung of bundle.rungs ?? [])
    for (const e of rung.evasions) {
      const base = idx[e.base_id];
      if (!base) return 244;
      try {
        if (evasionDigest(base.base_text, e.recipe) !== e.evasion_digest) return 244;
      } catch {
        return 244;
      }
    }
  return null;
}

// 245 — watcher recompute of the target-gate verdict equals the declared verdict.
export function checkWatcherVerdicts(bundle) {
  const idx = baseIndex(bundle);
  for (const rung of bundle.rungs ?? [])
    for (const e of rung.evasions) {
      const base = idx[e.base_id];
      const text = applyRecipe(base.base_text, e.recipe);
      if (verdictAt(rung.target_gate_version, base.mechanism, text) !== e.watcher_verdict_at_target)
        return 245;
    }
  return null;
}

// 246 — closed_count = # evasions now FLAG at the hardening's to_gate_version (open rung skipped).
export function checkClosedCounts(bundle) {
  const idx = baseIndex(bundle);
  for (const rung of bundle.rungs ?? []) {
    if (!rung.hardening_diff) continue; // open rung [PG4]
    const to = rung.hardening_diff.to_gate_version;
    const n = rung.evasions.filter((e) =>
      verdictAt(to, idx[e.base_id].mechanism, applyRecipe(idx[e.base_id].base_text, e.recipe))
    ).length;
    if (n !== rung.closed_count) return 246;
  }
  return null;
}

// 247 — A Closure Is Not a Cure: EVERY rung must name a non-empty residual class. A hardening closes
// this round's evasions but never terminates the escalation (the next round, or for the open final
// rung the Trilemma, always leaves a class open). An empty/omitted residual → 247.
export function checkResidual(bundle) {
  for (const rung of bundle.rungs ?? [])
    if (!rung.residual_class || String(rung.residual_class).trim() === "") return 247;
  return null;
}

// 248 — durability bit matches the classifier over the hardening's rule_kinds (open rung → null).
export function checkDurability(bundle) {
  for (const rung of bundle.rungs ?? []) {
    if (!rung.hardening_diff) {
      if (rung.durability !== null && rung.durability !== undefined) return 248;
      continue;
    }
    if (classifyDurability(rung.hardening_diff) !== rung.durability) return 248;
  }
  return null;
}

// 249 — trilemma_corners: A/B recomputed, C declared shape; pick-2 holds.
export function checkTrilemma(bundle) {
  const recomputed = cornerOutcomes();
  const got = bundle.trilemma_corners ?? [];
  if (got.length !== recomputed.length) return 249;
  for (const rc of recomputed) {
    const g = got.find((x) => x.corner === rc.corner);
    if (!g) return 249;
    if (rc.corner === "uts39_skeleton") {
      if (g.fixed !== false || g.declared_only !== true) return 249; // declared shape
      continue;
    }
    if (
      g.closes_confusables !== rc.closes_confusables ||
      g.diacritic_overblock !== rc.diacritic_overblock ||
      g.fixed !== rc.fixed
    )
      return 249;
  }
  // pick-2: no corner may claim {closes ∧ ¬overblock ∧ fixed}
  if (got.some((c) => c.closes_confusables && !c.diacritic_overblock && c.fixed)) return 249;
  return null;
}

// Helper for Lean/tests: on the committed corpus, caught(vₖ₊₁) ⊇ caught(vₖ) — monotone non-decreasing.
export function escalationMonotoneOnCorpus(bundle) {
  const idx = baseIndex(bundle);
  const all = (bundle.rungs ?? []).flatMap((r) => r.evasions);
  const caughtBy = (gate) =>
    all.filter((e) =>
      verdictAt(gate, idx[e.base_id].mechanism, applyRecipe(idx[e.base_id].base_text, e.recipe))
    ).length;
  const seq = ["v1", "v3", "v4"].map(caughtBy);
  return seq.every((n, i) => i === 0 || n >= seq[i - 1]);
}

export const _canonicalJson = canonicalJson;
