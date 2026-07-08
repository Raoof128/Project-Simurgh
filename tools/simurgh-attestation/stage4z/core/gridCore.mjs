// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — gridCore (spec §2, plan Task 4). Motto: AnthropicSafe First, then ReviewerSafe.
// No Silent Cell (the grid is total over the precommitted declaration) × No Silent Token
// (every cell scores EVERY lexicon token — no top-K truncation, which would make
// lexiconMonotone false). Flags are a θ-only threshold on the published nano scores.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { scoreNano, cmpNano } from "./tensorCore.mjs";

const fail = (detail) => ({ raw: 194, reason: "vwa_grid_invalid", detail });

// Total order on cells: (prompt_id asc, t asc, layer asc). prompt_id compared as string.
function cmpCell(a, b) {
  const pa = String(a.prompt_id);
  const pb = String(b.prompt_id);
  if (pa !== pb) return pa < pb ? -1 : 1;
  if (a.t !== b.t) return a.t - b.t;
  return a.layer - b.layer;
}

// expandGrid(decl) — the canonical total grid: every token position of every pinned prompt
// (decl.prompts: [{prompt_id, n_tokens}]) × the precommitted layer set (decl.layers).
export function expandGrid(decl) {
  const cells = [];
  for (const p of decl.prompts)
    for (let t = 0; t < p.n_tokens; t++)
      for (const layer of decl.layers) cells.push({ prompt_id: p.prompt_id, t, layer });
  cells.sort(cmpCell);
  return cells;
}

// Attach the FULL score matrix: one score_nano per lexicon token, in lexicon order.
// scoreFn(cell, token) → float; scoreNano enforces finite + safe-range + string encoding.
export function buildScores(cells, lexicon, scoreFn) {
  return cells.map((c) => ({
    ...c,
    scores: lexicon.tokens.map((tok) => ({
      token_id: tok.token_id,
      score_nano: scoreNano(scoreFn(c, tok)),
    })),
  }));
}

// θ-only flag rule of record: token flagged iff score_nano ≥ theta_nano (BigInt compare).
export function flagsFor(scores, theta_nano) {
  return scores.filter((s) => cmpNano(s.score_nano, theta_nano) >= 0).map((s) => s.token_id);
}

// Aggregates recounted from the PUBLISHED per-cell flags (194 checks internal consistency;
// 196 separately checks those flags against the θ rule).
export function aggregatesFromFlags(cells) {
  const flags_by_token = {};
  let n_flagged_cells = 0;
  let flag_total = 0;
  for (const c of cells) {
    const flags = c.flags ?? [];
    if (flags.length) n_flagged_cells += 1;
    flag_total += flags.length;
    for (const tid of flags) flags_by_token[tid] = (flags_by_token[tid] ?? 0) + 1;
  }
  return { n_cells: cells.length, flags_by_token, n_flagged_cells, flag_total };
}

// checkGrid(map, decl, lexicon) → null | {raw:194}. Enforces:
//  (1) cells == the total expanded declaration, in order, each once (No Silent Cell);
//  (2) every cell scores every lexicon token, in lexicon order (No Silent Token);
//  (3) published aggregates == recount from published flags.
export function checkGrid(map, decl, lexicon) {
  const cells = map?.cells ?? [];
  const expected = expandGrid(decl);
  if (cells.length !== expected.length) return fail("cell_count_mismatch");
  for (let i = 0; i < cells.length; i++) {
    const a = cells[i];
    const e = expected[i];
    if (String(a.prompt_id) !== String(e.prompt_id) || a.t !== e.t || a.layer !== e.layer)
      return fail("cell_mismatch_or_unsorted");
  }
  const tokenIds = lexicon.tokens.map((t) => t.token_id);
  for (const c of cells) {
    if ((c.scores?.length ?? 0) !== tokenIds.length) return fail("token_missing");
    for (let j = 0; j < tokenIds.length; j++)
      if (c.scores[j].token_id !== tokenIds[j]) return fail("token_mismatch");
  }
  if (canonicalJson(map.aggregates ?? {}) !== canonicalJson(aggregatesFromFlags(cells)))
    return fail("aggregates_mismatch");
  return null;
}

// checkFlags(map, theta_nano) → null | {raw:196}. Published per-cell flags must equal the
// θ rule applied to the published score matrix (order-insensitive comparison).
export function checkFlags(map, theta_nano) {
  const sortNum = (xs) => [...xs].sort((a, b) => a - b);
  for (const c of map?.cells ?? []) {
    const expected = sortNum(flagsFor(c.scores ?? [], theta_nano));
    const got = sortNum(c.flags ?? []);
    if (canonicalJson(got) !== canonicalJson(expected))
      return {
        raw: 196,
        reason: "vwa_flag_agreement_mismatch",
        detail: { cell: [c.prompt_id, c.t, c.layer] },
      };
  }
  return null;
}
