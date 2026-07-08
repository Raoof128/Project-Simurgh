// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — grid + cell-class partition (plan Task 4; codes 228/229/231/232). Motto:
// AnthropicSafe First, then ReviewerSafe. The grid is the TOTAL (MR × base) product (No
// Cherry-Picked Mutation); each cell is partitioned; the verifier recomputes everything.
import { createHash } from "node:crypto";
import { VSB_MAX_DEGENERATE_RATE, VSB_CELL_CLASSES } from "../constants.mjs";
import { applyMR5C, MR_EQUIVALENCE_BASIS_BY_ID } from "./mrRuleset.mjs";
import { flagged } from "./gateReductions.mjs";

const sha256Bytes = (s) =>
  "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

// Pure partition rule (precedence: not_applicable → degenerate → caught/slipped).
export function classifyCell(baseVerdict, isDegenerate, mutationVerdict) {
  if (baseVerdict === false) return "not_applicable";
  if (isDegenerate) return "degenerate";
  return mutationVerdict === true ? "caught" : "slipped";
}

// baseCorpus in: [{ base_id, mechanism, gate_version, base_text }]. Returns the enriched
// baseCorpus (with base_verdict + base_text_digest) and the total grid.
export function buildGrid(baseCorpus, mrIds) {
  const enriched = baseCorpus.map((b) => ({
    base_id: b.base_id,
    mechanism: b.mechanism,
    gate_version: b.gate_version ?? null,
    base_text: b.base_text,
    base_text_digest: sha256Bytes(b.base_text),
    base_verdict: flagged(b.mechanism, b.gate_version, b.base_text),
  }));
  const byId = new Map(enriched.map((b) => [b.base_id, b]));
  const grid = [];
  for (const mrId of mrIds)
    for (const b of enriched) {
      const mutated = applyMR5C(mrId, b.base_text);
      const mutationVerdict = flagged(b.mechanism, b.gate_version, mutated);
      grid.push({
        mr_id: mrId,
        base_id: b.base_id,
        equivalence_basis: MR_EQUIVALENCE_BASIS_BY_ID[mrId],
        mutated_text_digest: sha256Bytes(mutated),
        mutation_verdict: mutationVerdict,
        cell_class: classifyCell(b.base_verdict, mutated === b.base_text, mutationVerdict),
      });
    }
  grid.sort((a, b) => `${a.mr_id}|${a.base_id}`.localeCompare(`${b.mr_id}|${b.base_id}`));
  // Public bundle carries the digest-only corpus; the raw texts travel only in the audit-private
  // map (P0-5), which the audit tier feeds back to checkGrid to enable the applyMR5C recompute.
  const baseOut = enriched.map(({ base_text, ...rest }) => rest);
  const baseTextById = Object.fromEntries(enriched.map((b) => [b.base_id, b.base_text]));
  return { grid, baseCorpus: baseOut, baseTextById };
}

export function degenerateRate(grid) {
  const den = grid.length;
  const num = grid.filter((c) => c.cell_class === "degenerate").length;
  return { num, den };
}

// Verifier: 228 completeness → 229 mutation reproducibility → 231 verdict recompute →
// 232 partition validity + degenerate-rate cap. First-failure order.
export function checkGrid(grid, baseCorpus, mrIds, baseTextById = null) {
  const bad = (raw, reason, detail) => ({ raw, reason, detail });
  const byId = new Map(baseCorpus.map((b) => [b.base_id, b]));

  // 228 — total product, no dupes / gaps / extras.
  const expected = new Set();
  for (const mrId of mrIds) for (const b of baseCorpus) expected.add(`${mrId}|${b.base_id}`);
  const seen = new Set();
  for (const c of grid) {
    const k = `${c.mr_id}|${c.base_id}`;
    if (seen.has(k) || !expected.has(k))
      return bad(228, "vsb_grid_incomplete", { dupe_or_extra: k });
    seen.add(k);
  }
  if (seen.size !== expected.size)
    return bad(228, "vsb_grid_incomplete", { missing: expected.size - seen.size });

  for (const c of grid) {
    const b = byId.get(c.base_id);
    // Structural (both tiers): cell_class must be a valid class label.
    if (!VSB_CELL_CLASSES.includes(c.cell_class))
      return bad(232, "vsb_partition_invalid", { bad_class: c.cell_class });
    // Recompute checks (229/231/232) require the raw base text — audit tier only (P0-5). Public
    // tier (no baseTextById) verifies completeness + shape; the recompute is the audit's job.
    if (!baseTextById) continue;
    const baseText = baseTextById[c.base_id];
    if (baseText === undefined)
      return bad(231, "vsb_gate_verdict_mismatch", { missing_base_text: c.base_id });
    const mutated = applyMR5C(c.mr_id, baseText);
    // 229 — mutation reproducibility
    if (sha256Bytes(mutated) !== c.mutated_text_digest)
      return bad(229, "vsb_mutation_not_reproducible", { cell: `${c.mr_id}|${c.base_id}` });
    // 231 — recomputed verdicts vs sealed
    const baseVerdict = flagged(b.mechanism, b.gate_version, baseText);
    const mutationVerdict = flagged(b.mechanism, b.gate_version, mutated);
    if (baseVerdict !== b.base_verdict || mutationVerdict !== c.mutation_verdict)
      return bad(231, "vsb_gate_verdict_mismatch", { cell: `${c.mr_id}|${c.base_id}` });
    // 232 — partition validity (class matches the recomputed partition)
    const expectedClass = classifyCell(baseVerdict, mutated === baseText, mutationVerdict);
    if (!VSB_CELL_CLASSES.includes(c.cell_class) || c.cell_class !== expectedClass)
      return bad(232, "vsb_partition_invalid", { cell: `${c.mr_id}|${c.base_id}` });
  }

  // 232 — degenerate-rate cap (num/den > max means a no-op corpus)
  const { num, den } = degenerateRate(grid);
  const { num: mn, den: md } = VSB_MAX_DEGENERATE_RATE;
  if (den > 0 && num * md > mn * den)
    return bad(232, "vsb_partition_invalid", { degenerate_rate_exceeded: { num, den } });

  return null;
}
