// SPDX-License-Identifier: AGPL-3.0-or-later
// Run chain + census + refusal ledger — the raw-89 anti-laundering tier
// (4Q spec §2.1.3, §6.1, §6.2; plan freeze 4). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { chainEntryDigest, chainEntryReplayDigest, chainRootDigest } from "./digest.mjs";
import { validateChainEntry } from "./schemaCore.mjs";
import { SCHEMAS, GENESIS } from "../constants.mjs";

function entryRecord(event, previous, position) {
  return {
    schema: SCHEMAS.RUN_CHAIN_ENTRY,
    entry_kind: event.entry_kind,
    entry_digest: event.entry_digest,
    raw_code: event.raw_code,
    previous_entry_digest: previous,
    chain_position: position,
  };
}

export function buildChain(events) {
  const entries = [];
  let previous = GENESIS;
  events.forEach((event, i) => {
    const record = entryRecord(event, previous, i);
    entries.push(record);
    previous = chainEntryDigest(record);
  });
  return { entries, root: chainRootDigest(entries.map((e) => chainEntryDigest(e))) };
}

// Plan freeze 4: census counts crossings + schema-valid refusals (raw_code !== 80).
function censusCount(entries) {
  let n = 0;
  for (const e of entries) {
    if (e.entry_kind === "crossing") n += 1;
    else if (e.entry_kind === "refusal" && e.raw_code !== 80) n += 1;
  }
  return n;
}

export function verifyChain(entries, { expectedRoot, census }) {
  const seen = new Set();
  let previous = GENESIS;
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const v = validateChainEntry(e);
    if (!v.ok) return { raw: 89, reason: "missing_entry" };
    if (e.chain_position !== i) return { raw: 89, reason: "reordered_entry" };
    if (e.previous_entry_digest !== previous)
      return { raw: 89, reason: "non_linking_previous_digest" };
    // Dedup on the CONTENT-only replay digest (patch 2) so replayed content at a new
    // position is caught; link/root still use the full position-bearing digest.
    const replay = chainEntryReplayDigest(e);
    if (seen.has(replay)) return { raw: 89, reason: "duplicated_entry" };
    seen.add(replay);
    previous = chainEntryDigest(e);
  }
  const root = chainRootDigest(entries.map((e) => chainEntryDigest(e)));
  if (expectedRoot !== undefined && root !== expectedRoot)
    return { raw: 89, reason: "refusal_entry_removed" };
  if (census) {
    const counted = censusCount(entries);
    if (census.committed_crossings !== counted) return { raw: 89, reason: "census_mismatch" };
    if (census.laneb_observed !== undefined && census.laneb_observed !== counted)
      return { raw: 89, reason: "census_mismatch" };
  }
  return { raw: 0 };
}

export function positionsOf(entries, entryDigest) {
  for (let i = 0; i < entries.length; i += 1) {
    if (entries[i].entry_digest === entryDigest) return i;
  }
  return -1;
}
