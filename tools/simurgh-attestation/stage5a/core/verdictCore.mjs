// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — verdictCore: the flag relation, the verdict rule, total classification
// (raw 203, "No Silent Claim"), and verdict recompute (raw 205, "No Two Stories"). Plan
// Task 4. Motto: AnthropicSafe First, then ReviewerSafe.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VNC_VERDICTS } from "../constants.mjs";

// Token ids are decimal-integer strings. Strict canonical form: non-negative, no leading
// zeros, within the safe-integer range (reviewer N2, rusty-nail defense). Accepts a number
// or a string; returns the canonical string, or null on any malformed form ("01", "1.0",
// "-1", " 1", > 2^53). Membership is on the canonical string, so "9" never matches "10" and
// nothing is compared lexically.
export function parseTokenId(v) {
  let s;
  if (typeof v === "number") {
    if (!Number.isSafeInteger(v) || v < 0) return null;
    s = String(v);
  } else if (typeof v === "string") {
    if (!/^(0|[1-9]\d*)$/.test(v)) return null;
    s = v;
  } else {
    return null;
  }
  if (!Number.isSafeInteger(Number(s))) return null;
  return s;
}

// A hit/flag address, sorted by (prompt_id, t, layer, token_id) — a total order, hence
// unique. prompt_id compared as string (4Z convention), t/layer numeric, token_id integer.
export function cmpAddr(a, b) {
  const ap = String(a.prompt_id);
  const bp = String(b.prompt_id);
  if (ap !== bp) return ap < bp ? -1 : 1;
  if (a.t !== b.t) return a.t - b.t;
  if (a.layer !== b.layer) return a.layer - b.layer;
  const at = BigInt(parseTokenId(a.token_id));
  const bt = BigInt(parseTokenId(b.token_id));
  return at < bt ? -1 : at > bt ? 1 : 0;
}

// F ⊆ cells × lexicon: every flagged (cell, token) as a sorted address list.
export function flagRelation(map) {
  const out = [];
  for (const c of map.cells ?? [])
    for (const tid of c.flags ?? [])
      out.push({ prompt_id: c.prompt_id, t: c.t, layer: c.layer, token_id: parseTokenId(tid) });
  out.sort(cmpAddr);
  return out;
}

// The declared lexicon: the set of token_ids the map watched (every cell publishes a score
// for every lexicon token — the 4Z total matrix). Union over cells (all equal in a total map).
export function declaredLexicon(map) {
  const set = new Set();
  for (const c of map.cells ?? [])
    for (const s of c.scores ?? []) {
      const t = parseTokenId(s.token_id);
      if (t !== null) set.add(t);
    }
  return set;
}

const claimTokenSet = (claim) => (claim.token_ids ?? []).map(parseTokenId);

// hits(claim, F): the sorted subset of F whose token is one of the claim's tokens (exact
// integer equality over ALL cells — F already spans every cell).
export function hitsFor(claim, F) {
  const want = new Set(claimTokenSet(claim).filter((t) => t !== null));
  return F.filter((f) => want.has(f.token_id));
}

// The verdict rule (spec §2). Assumes 201+202 already passed (span resolved) — reviewer MF3:
// an unresolvable span is a raw-202 gate, NOT an `unreadable` verdict, so it never reaches
// here in the full verifier. `unreadable` is ONLY out-of-lexicon (the instrument wasn't
// watching): ANY out-of-lexicon token ⇒ the WHOLE claim is unreadable (conservative
// precedence — partial coverage never downgrades to a corroboration over the readable subset).
export function verdictFor(claim, map) {
  const lex = declaredLexicon(map);
  const tokens = claimTokenSet(claim);
  const unreadable = tokens.some((t) => t === null || !lex.has(t));
  if (unreadable) return { claim_id: claim.claim_id, verdict: "unreadable", evidence: [] };
  const hits = hitsFor(claim, flagRelation(map));
  let verdict;
  if (claim.polarity === "asserts_unflagged")
    verdict = hits.length === 0 ? "corroborated" : "contradicted";
  else verdict = hits.length > 0 ? "corroborated" : "contradicted";
  return { claim_id: claim.claim_id, verdict, evidence: hits };
}

// classify(table, map): TOTAL — exactly one verdict row per claim, sorted by claim_id.
export function classify(table, map) {
  const claims = table.content.claims ?? [];
  return claims
    .map((c) => verdictFor(c, map))
    .sort((a, b) => (a.claim_id < b.claim_id ? -1 : a.claim_id > b.claim_id ? 1 : 0));
}

// 203 — No Silent Claim: the published verdict rows are one-per-claim, sorted by claim_id,
// each with a known verdict label; no missing / extra / duplicate / unknown-label rows.
export function checkClassification(ledger, table) {
  const rows = ledger.content.verdicts ?? [];
  const claimIds = (table.content.claims ?? []).map((c) => c.claim_id);
  const fail = (reason, detail = {}) => ({ raw: 203, reason, detail });
  const seen = new Set();
  let prev = null;
  for (const r of rows) {
    if (!VNC_VERDICTS.includes(r.verdict))
      return fail("unknown_verdict_label", { verdict: r.verdict });
    if (!claimIds.includes(r.claim_id))
      return fail("verdict_for_undeclared_claim", { claim_id: r.claim_id });
    if (seen.has(r.claim_id)) return fail("duplicate_verdict", { claim_id: r.claim_id });
    if (prev !== null && r.claim_id < prev)
      return fail("verdicts_unsorted", { claim_id: r.claim_id });
    seen.add(r.claim_id);
    prev = r.claim_id;
  }
  for (const id of claimIds)
    if (!seen.has(id)) return fail("claim_without_verdict", { claim_id: id });
  return null;
}

// 205 — No Two Stories: recomputing verdicts + evidence from (map, claim table) must equal
// the published ledger rows exactly. A flipped verdict or a dropped/added evidence entry
// lands here (canonicalJson equality, never JSON.stringify — 4X gotcha).
export function checkVerdicts(ledger, table, map) {
  const recomputed = classify(table, map);
  const published = ledger.content.verdicts ?? [];
  if (canonicalJson(recomputed) !== canonicalJson(published))
    return { raw: 205, reason: "verdict_recompute_mismatch", detail: {} };
  return null;
}
