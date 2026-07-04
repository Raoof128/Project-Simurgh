// SPDX-License-Identifier: AGPL-3.0-or-later
// Time-anchored surfaces (4O spec §9). Binds a committed toolset root to an already-
// committed 4N chain position. Reference direction is strictly 4O -> 4N: the shipped 4N
// heartbeat is never modified; its feed is read as a frozen fixture input, offline.
// Guarantee is at ATTESTATION time, not real time (see non-claims).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { domainDigest } from "./digest.mjs";
import { DOMAINS, TIMELINE_SCHEMA } from "../constants.mjs";

// A 4N chain position is identified by (window_id, position, prev_record_digest).
export function chainPositionDigest(stage4nRecord) {
  return domainDigest(DOMAINS.TIMELINE, TIMELINE_SCHEMA, {
    window_id: stage4nRecord.window_id,
    position: stage4nRecord.position,
    prev_record_digest: stage4nRecord.prev_record_digest,
  });
}

export function buildTimelineRecord({ chainHeadEnvelope, stage4nRecord }) {
  return {
    schema: TIMELINE_SCHEMA,
    stage4n_chain_position_digest: chainPositionDigest(stage4nRecord),
    toolset_root: chainHeadEnvelope.manifest.toolset_digest,
    manifest_epoch: chainHeadEnvelope.manifest_epoch,
  };
}

export function parseFeed(feedText) {
  return feedText
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
}

// Verify the timeline record against the manifest chain and the frozen 4N feed records.
export function verifyTimelineRecord({ record, chain, stage4nRecords }) {
  const env = chain.find((e) => e.manifest_epoch === record.manifest_epoch);
  if (!env || env.manifest.toolset_digest !== record.toolset_root) {
    return { ok: false, raw: 66, reason: "timeline_root_mismatch" };
  }
  const present = stage4nRecords.some(
    (r) => chainPositionDigest(r) === record.stage4n_chain_position_digest
  );
  if (!present) return { ok: false, raw: 66, reason: "chain_position_absent" };
  return { ok: true };
}
