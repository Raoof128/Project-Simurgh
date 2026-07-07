// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR residue ledger (spec §2). Motto: AnthropicSafe First, then ReviewerSafe.
// P0-1 two-tier split: the ledger seals a per_item_outcomes table.
//   - computeLedgerFromLiveGate(corpus)  runs the real v1/v2 gate to PRODUCE outcomes (audit/build).
//   - computeLedgerFromSealedOutcomes(corpus, outcomes)  is pure ARITHMETIC, NO gate call (public).
// checkLedgerArithmetic → 178 (public); checkOutcomesAgainstGate → 177 (audit);
// checkMonotone → 179, always RECOMPUTED, never trusts the stored flag (P1-6).
import { checkLeakage } from "../../stage4w/core/leakageGate.mjs";
import { checkLeakageV2 } from "./gateV2.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VLR_LEDGER_SCHEMA } from "../constants.mjs";

const caught = (fn, text) => fn(text, [], []) !== null;
const sortIds = (a) => [...a].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
const fail = (raw, reason, detail) => ({ raw, reason, ...(detail ? { detail } : {}) });

// Pure aggregates from the sealed per-item booleans + corpus family metadata (NO gate call).
function aggregatesFrom(corpus, outcomes) {
  const metaById = new Map(corpus.items.map((i) => [i.item_id, i]));
  const total = outcomes.length;
  const catchable = outcomes.filter((o) => o.seed_v1);
  const Rv1 = sortIds(outcomes.filter((o) => !o.residue_v1).map((o) => o.item_id));
  const Rv2 = sortIds(outcomes.filter((o) => !o.residue_v2).map((o) => o.item_id));
  const caughtV1 = outcomes.filter((o) => o.residue_v1).length;
  const caughtV2 = outcomes.filter((o) => o.residue_v2).length;
  const slipV1 = catchable.filter((o) => !o.residue_v1).length;
  const slipV2 = catchable.filter((o) => !o.residue_v2).length;

  const families = [...new Set(corpus.items.map((i) => i.family))].sort();
  const per_family = families.map((family) => {
    const ids = corpus.items.filter((i) => i.family === family).map((i) => i.item_id);
    const os = outcomes.filter((o) => ids.includes(o.item_id));
    return {
      family,
      provenance: metaById.get(ids[0]).provenance,
      v1_caught: os.filter((o) => o.residue_v1).length,
      v1_total: os.length,
      v2_caught: os.filter((o) => o.residue_v2).length,
      v2_total: os.length,
    };
  });

  // monotone RECOMPUTED: every residue v1 catches, v2 must also catch (caughtV1 ⊆ caughtV2 ⟺ R′ ⊆ R).
  const monotone = outcomes.every((o) => !o.residue_v1 || o.residue_v2);

  return {
    v1: { caught_count: caughtV1, residue_count: Rv1.length, total, residue_item_ids: Rv1 },
    v2: { caught_count: caughtV2, residue_count: Rv2.length, total, residue_item_ids: Rv2 },
    metamorphic_slip_rate_v1: `${slipV1}/${catchable.length}`,
    metamorphic_slip_rate_v2: `${slipV2}/${catchable.length}`,
    catch_rate_v1: `${caughtV1}/${total}`,
    catch_rate_v2: `${caughtV2}/${total}`,
    residue_delta: {
      newly_caught_by_v2: Rv1.filter((id) => !Rv2.includes(id)),
      irreducible: Rv2,
    },
    per_family,
    monotone,
  };
}

export function computeLedgerFromLiveGate(corpus) {
  const per_item_outcomes = sortIds(corpus.items.map((i) => i.item_id)).map((item_id) => {
    const it = corpus.items.find((i) => i.item_id === item_id);
    return {
      item_id,
      seed_v1: caught(checkLeakage, it.seed_form),
      residue_v1: caught(checkLeakage, it.residue_form),
      residue_v2: caught(checkLeakageV2, it.residue_form),
    };
  });
  return {
    schema: VLR_LEDGER_SCHEMA,
    per_item_outcomes,
    ...aggregatesFrom(corpus, per_item_outcomes),
  };
}

export function computeLedgerFromSealedOutcomes(corpus, per_item_outcomes) {
  return {
    schema: VLR_LEDGER_SCHEMA,
    per_item_outcomes,
    ...aggregatesFrom(corpus, per_item_outcomes),
  };
}

// Note: `monotone` is intentionally NOT here — Law 3 (179) owns it exclusively and RECOMPUTES
// it, so a lying flag surfaces as 179, not as a generic 178 arithmetic mismatch (check order).
const AGG_KEYS = [
  "v1",
  "v2",
  "metamorphic_slip_rate_v1",
  "metamorphic_slip_rate_v2",
  "catch_rate_v1",
  "catch_rate_v2",
  "residue_delta",
  "per_family",
];

// Public tier (178): recompute aggregates from the SEALED outcomes; NO gate call.
export function checkLedgerArithmetic(corpus, signedLedger) {
  const re = computeLedgerFromSealedOutcomes(corpus, signedLedger.per_item_outcomes);
  // canonicalJson is key-order-independent — the sealed ledger arrives with alphabetical keys
  // (canonicalJson on disk) while the recompute is insertion-order; JSON.stringify would false-fail.
  for (const k of AGG_KEYS)
    if (canonicalJson(re[k]) !== canonicalJson(signedLedger[k]))
      return fail(178, "vlr_ledger_mismatch", k);
  return null;
}

// Audit tier (177): re-run the real gate and check the sealed outcomes against it.
export function checkOutcomesAgainstGate(corpus, signedLedger) {
  const live = computeLedgerFromLiveGate(corpus).per_item_outcomes;
  const liveById = new Map(live.map((o) => [o.item_id, o]));
  for (const sealed of signedLedger.per_item_outcomes) {
    const l = liveById.get(sealed.item_id);
    if (
      !l ||
      l.seed_v1 !== sealed.seed_v1 ||
      l.residue_v1 !== sealed.residue_v1 ||
      l.residue_v2 !== sealed.residue_v2
    )
      return fail(177, "vlr_gate_recompute_mismatch", sealed.item_id);
  }
  return null;
}

// Law 3 (179): recompute monotonicity from sealed outcomes; fire on a broken v2 OR a lying flag.
export function checkMonotone(ledger) {
  const recomputed = ledger.per_item_outcomes.every((o) => !o.residue_v1 || o.residue_v2);
  if (!recomputed) return fail(179, "vlr_bound_not_monotone", "v2_drops_a_v1_catch");
  if (ledger.monotone !== recomputed)
    return fail(179, "vlr_bound_not_monotone", "monotone_flag_lie");
  return null;
}
