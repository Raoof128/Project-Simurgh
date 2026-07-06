// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R census / budget / herd-token / reuse-replay ledgers (4R spec §6.5,
// §8.1, §8.5). Motto: AnthropicSafe First, then ReviewerSafe. Detection here is
// RECORDED-EVIDENCE over the committed run set, never omniscience (rail
// `scalar_reuse_and_replay_checks_are_recorded_evidence_not_omniscience`).
import {
  POINT_HEX_RE,
  SLOT_TERMINAL_KINDS,
  DISCLOSURE_BUDGET_MAX_SIGNALS_PER_WINDOW,
} from "../constants.mjs";

const ok90 = Object.freeze({ ok: true });
const fail90 = (reason) => ({ ok: false, raw: 90, reason });

const TERMINAL_TO_COUNT = Object.freeze({
  exported_match_record: "matches",
  exported_non_match_record: "non_matches",
  ledgered_export_refusal: "refusals",
});

// §8.5 — count-only census over one window's slot terminals.
export function buildWindowMatchCensus(epoch, slotLedger) {
  const census = { epoch, matches: 0, non_matches: 0, refusals: 0 };
  for (const slot of slotLedger) {
    const bucket = TERMINAL_TO_COUNT[slot.terminal];
    if (bucket) census[bucket] += 1;
  }
  return census;
}

// §8.5 — the committed census must equal a recount of the slot ledger.
export function checkCensus(census, epoch, slotLedger) {
  const recount = buildWindowMatchCensus(epoch, slotLedger);
  const same =
    census &&
    census.epoch === recount.epoch &&
    census.matches === recount.matches &&
    census.non_matches === recount.non_matches &&
    census.refusals === recount.refusals;
  return same ? ok90 : fail90("window_match_census_mismatch");
}

// §8.1 — cardinality commitment + every slot terminal.
export function checkSlotTerminality(commitment, slotLedger) {
  if (!Number.isInteger(commitment)) return fail90("slot_cardinality_commitment_missing");
  if (!Array.isArray(slotLedger) || slotLedger.length !== commitment) {
    return fail90("slot_cardinality_mismatch");
  }
  for (const slot of slotLedger) {
    if (!slot || !SLOT_TERMINAL_KINDS.includes(slot.terminal)) {
      return fail90("slot_terminal_record_missing");
    }
  }
  return ok90;
}

// §8.1 — combined 90-tier gate used by the ceremony/attestation path.
export function checkCardinalityAndCensus(commitment, slotLedger, census, epoch) {
  const term = checkSlotTerminality(commitment, slotLedger);
  if (!term.ok) return term;
  return checkCensus(census, epoch, slotLedger);
}

// §6.1 raw 97 — disclosure budget (4P import, max 4 signals per window).
export function budgetCheck(exportCount) {
  return { exceeded: exportCount > DISCLOSURE_BUDGET_MAX_SIGNALS_PER_WINDOW };
}

// §6.1 raw 99 — public herd-token scan. `privateIndex` holds the sets of values
// that must NEVER appear in the public bundle: raw class digests, mask/z hex,
// token digests. Any hit, or any bare 64-hex point outside the allow-set, is a
// violation.
export function herdTokenScan(publicBundle, privateIndex, allowedHexValues = new Set()) {
  const forbidden = new Set([
    ...(privateIndex.classDigests ?? []),
    ...(privateIndex.maskHexes ?? []),
    ...(privateIndex.zHexes ?? []),
    ...(privateIndex.tokenDigests ?? []),
  ]);
  const seen = new Set();
  const walk = (node) => {
    if (typeof node === "string") {
      if (forbidden.has(node)) return true;
      if (POINT_HEX_RE.test(node) && !allowedHexValues.has(node)) return true; // bare raw point
      return false;
    }
    if (node === null || typeof node !== "object") return false;
    if (seen.has(node)) return false;
    seen.add(node);
    for (const value of Object.values(node)) if (walk(value)) return true;
    return false;
  };
  return { hit: walk(publicBundle) };
}

// §6.5 — reuse/replay ledgers over the committed run set. Each transcript
// contributes its epoch-keyed mask digests, ephemeral-public digests, and
// token digests.
export function buildLedgers(runSet) {
  const maskDigestsByEpoch = new Map();
  const ephemeralDigestsByEpoch = new Map();
  const tokensByEpoch = new Map();
  const bump = (map, epoch, value) => {
    if (!map.has(epoch)) map.set(epoch, new Map());
    const inner = map.get(epoch);
    inner.set(value, (inner.get(value) ?? 0) + 1);
  };
  for (const entry of runSet) {
    for (const role of ["a", "b"]) {
      bump(maskDigestsByEpoch, entry.epoch, entry.maskDigests[role]);
      bump(ephemeralDigestsByEpoch, entry.epoch, entry.ephemeralDigests[role]);
      bump(tokensByEpoch, entry.epoch, entry.tokens[role]);
    }
  }
  return { maskDigestsByEpoch, ephemeralDigestsByEpoch, tokensByEpoch };
}

// §6.5 raw 95 — a message whose epoch differs from the ceremony epoch, or a
// mask/token value duplicated ACROSS epochs.
export function detectReplay(messageEpoch, ceremonyEpoch, crossEpochDuplicate = false) {
  if (messageEpoch !== ceremonyEpoch) return { hit: true, reason: "cross_epoch_replay_detected" };
  if (crossEpochDuplicate) return { hit: true, reason: "cross_epoch_replay_detected" };
  return { hit: false };
}

// §6.5 raw 96 — mask-digest or ephemeral-public-digest duplicated within the
// accepted epoch ledger (same epoch by construction).
export function detectReuse(epoch, ledgers) {
  const dupIn = (map) => {
    const inner = map.get(epoch);
    if (!inner) return false;
    for (const count of inner.values()) if (count > 1) return true;
    return false;
  };
  if (dupIn(ledgers.maskDigestsByEpoch)) return { hit: true, reason: "mask_reuse_detected" };
  if (dupIn(ledgers.ephemeralDigestsByEpoch)) {
    return { hit: true, reason: "ephemeral_public_digest_reuse_detected" };
  }
  return { hit: false };
}
