// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — slip ledger (plan Task 5; codes 233/234/237). Motto: AnthropicSafe First, then
// ReviewerSafe. The slip_table is a PROJECTION of the grid's slipped cells; No Silent Slip (233,
// audit teeth), severity enum validity (234), and the anti-overclaim gate (237, PUBLIC lexical).
import { VSB_SEVERITY_ENUM, VSB_SEVERITY_BASES, VSB_BREACH_CLAIM_DENYLIST } from "../constants.mjs";

// projectSlips: one skeleton entry per slipped cell, joining mechanism/gate_version from the
// corpus. Severity + severity_basis are filled by the Lane-B blind ceremony (Task 12).
export function projectSlips(grid, baseCorpus) {
  const byId = new Map(baseCorpus.map((b) => [b.base_id, b]));
  return grid
    .filter((c) => c.cell_class === "slipped")
    .map((c) => {
      const b = byId.get(c.base_id);
      return {
        mr_id: c.mr_id,
        base_id: c.base_id,
        mechanism: b.mechanism,
        gate_version: b.gate_version ?? null,
      };
    });
}

// 237 surface: the ONLY free-text field. Lexical, case-insensitive denylist screen (PF1).
export function containsBreachClaim(note) {
  if (typeof note !== "string") return false;
  const folded = note.toLowerCase();
  return VSB_BREACH_CLAIM_DENYLIST.some((tok) => folded.includes(tok));
}

// Verifier. 234 (enum) + 237 (breach screen) run at BOTH tiers (PUBLIC). 233 (No Silent Slip) is
// AUDIT-only: it trusts grid.cell_class, which the orchestrator has already proven honest via the
// audit-tier checkGrid (232 recompute) run BEFORE this — so trusting it here is not circular.
export function checkSlipTable(grid, slipTable, { tier = "audit" } = {}) {
  const bad = (raw, reason, detail) => ({ raw, reason, detail });

  for (const e of slipTable) {
    // 234 — severity + basis enum validity
    if (!VSB_SEVERITY_ENUM.includes(e.severity))
      return bad(234, "vsb_severity_invalid", {
        cell: `${e.mr_id}|${e.base_id}`,
        severity: e.severity,
      });
    if (!VSB_SEVERITY_BASES.includes(e.severity_basis))
      return bad(234, "vsb_severity_invalid", {
        cell: `${e.mr_id}|${e.base_id}`,
        basis: e.severity_basis,
      });
    // 237 — anti-overclaim: analyst_note (optional) must not assert a kernel/authority breach
    if (containsBreachClaim(e.analyst_note))
      return bad(237, "vsb_kernel_breach_claimed", { cell: `${e.mr_id}|${e.base_id}` });
  }

  if (tier === "audit") {
    // 233 — every slipped grid cell must appear in the slip table.
    const present = new Set(slipTable.map((e) => `${e.mr_id}|${e.base_id}`));
    for (const c of grid)
      if (c.cell_class === "slipped" && !present.has(`${c.mr_id}|${c.base_id}`))
        return bad(233, "vsb_silent_slip", { omitted: `${c.mr_id}|${c.base_id}` });
  }

  return null;
}
