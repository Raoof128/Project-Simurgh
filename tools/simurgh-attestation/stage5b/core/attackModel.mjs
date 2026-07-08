// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — attack model (spec §4, plan Task 5). The 46-attack corpus DESIGN: seven
// families pointed at the frozen 4V→5A verifiers, each attack a pure mutation descriptor. The
// concrete FAMILY_COUNTS + attack_manifest_root are frozen in Task 10B from THIS source, after
// the fixture-integrity gate (Task 10) confirms each attack trips its exact target code.
// Every correct target SURVIVES (catches) its attack; residue slips are floor-reconciled (§4).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { CAMPAIGN_SEED, VAR_ATTACK_FAMILIES } from "../constants.mjs";

// ★ capture-grounded core (needs the real precommitted readout to have teeth) vs regression tail.
const GROUNDED = new Set([
  "conflict_laundering",
  "residue_paraphrase_slip",
  "silent_cell_hide",
  "capture_substitution",
]);

// Per-family design: count, target stage(s), tampering `kind` (interpreted by driveTarget in
// Task 9 against the real target bundle), and whether it is floor-reconciled.
const FAMILY_DESIGN = Object.freeze({
  conflict_laundering: { count: 8, targets: ["5a"], kind: "launder_contradiction_to_corroborated" },
  residue_paraphrase_slip: {
    count: 8,
    targets: ["4x", "4y"],
    kind: "metamorphic_paraphrase",
    floor: true,
  },
  silent_cell_hide: { count: 8, targets: ["4z"], kind: "hide_workspace_cell_or_token" },
  narrative_span_forgery: { count: 6, targets: ["4w"], kind: "smuggle_claim_as_unverified_prose" },
  precommit_backdate: { count: 4, targets: ["5a"], kind: "bind_map_digest_not_declaration" },
  crypto_signature: {
    count: 6,
    targets: ["4v", "4w", "4x", "4y", "4z", "5a"],
    kind: "signature_forgery",
  },
  capture_substitution: { count: 6, targets: ["self"], kind: "swap_synthetic_capture" },
});

export const ATTACK_DESIGN_COUNTS = Object.freeze(
  Object.fromEntries(VAR_ATTACK_FAMILIES.map((f) => [f, FAMILY_DESIGN[f].count]))
);

export function familyCounts() {
  return { ...ATTACK_DESIGN_COUNTS };
}

// deriveAttacks() → 46 specs, sorted by attack_id (parity with charter.deriveAttackIds order).
export function deriveAttacks() {
  const out = [];
  for (const family of VAR_ATTACK_FAMILIES) {
    const d = FAMILY_DESIGN[family];
    for (let i = 0; i < d.count; i++) {
      out.push({
        attack_id: `${CAMPAIGN_SEED}:${family}#${i}`,
        family,
        // spread multi-target families deterministically across their gates
        target_stage: d.targets[i % d.targets.length],
        kind: d.kind,
        // every correct target SURVIVES (catches) the attack; the actual outcome is discovered
        // by driveTarget (Task 9) and reconciled (residue floor) in Task 7.
        expected_outcome: "survived",
        floor_reconciled: d.floor === true,
        capture_grounded: GROUNDED.has(family),
      });
    }
  }
  return out.sort((a, b) => (a.attack_id < b.attack_id ? -1 : a.attack_id > b.attack_id ? 1 : 0));
}

// applyFieldOps(obj, ops) — a PURE deep-clone mutator used by driveTarget (Task 9) to tamper a
// clean target bundle. ops: [{ path: "a.b.c", op: "set"|"delete"|"flipByte", value }].
export function applyFieldOps(obj, ops) {
  const clone = structuredClone(obj);
  for (const { path, op, value } of ops) {
    const parts = path.split(".");
    const last = parts.pop();
    let node = clone;
    for (const p of parts) node = node?.[p];
    if (!node || typeof node !== "object") continue;
    if (op === "set") node[last] = value;
    else if (op === "delete") delete node[last];
    else if (op === "flipByte" && typeof node[last] === "string" && node[last].length)
      node[last] = (node[last][0] === "0" ? "1" : "0") + node[last].slice(1);
  }
  return clone;
}
