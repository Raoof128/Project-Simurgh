// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic registry derivation + hash-chain / append-continuity verification.
// No I/O, no clocks. entry_digest = sha256(canonicalJson(entry_body)).
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { REGISTRY_SCHEMA, detectCrossTargetRankingExport } from "./temporalLib.mjs";

export function entryDigest(entryBody) {
  return sha256Hex(canonicalJson(entryBody));
}

export function buildRegistryFromManifest(manifest, manifestDigest) {
  const entries = [];
  let prev = "GENESIS";
  for (const snap of manifest.snapshots) {
    const entry_body = {
      entry_index: snap.entry_index,
      entry_kind: "snapshot",
      previous_entry_digest: prev,
      snapshot: {
        snapshot_id: snap.snapshot_id,
        snapshot_label: snap.snapshot_label,
        created_at_utc: snap.created_at_utc,
        catalogue_digest: snap.catalogue_digest,
        catalogue_path: snap.catalogue_path,
        corpus_digest: snap.corpus_digest,
        target_attestations: snap.target_attestations,
      },
    };
    const digest = entryDigest(entry_body);
    entries.push({ entry_body, entry_digest: digest });
    prev = digest;
  }
  const last = entries[entries.length - 1];
  return {
    type: REGISTRY_SCHEMA,
    stage: "3Q",
    registry_id: manifest.registry_id,
    append_model: "single_signed_ledger_with_internal_hash_chain",
    cross_target_ranking_exported: false,
    source: {
      timeline_manifest_digest: manifestDigest,
      timeline_manifest_path:
        "docs/research/llm-shield/evidence/stage-3q/registry/timeline-manifest.json",
    },
    entries,
    head: {
      head_entry_index: last ? last.entry_body.entry_index : -1,
      head_entry_digest: last ? last.entry_digest : "GENESIS",
      entry_count: entries.length,
    },
    non_claims: [
      "Temporal diff, not leaderboard.",
      "This registry does not rank targets.",
      "This registry records signed attestation snapshots over time.",
      "Append-only continuity is verified against the previous signed registry head when available.",
    ],
  };
}

export function verifyRegistryHashChain(registry) {
  const errors = [];
  if (registry?.type !== REGISTRY_SCHEMA) errors.push("bad registry type");
  if (detectCrossTargetRankingExport(registry)) errors.push("cross-target ranking exported");
  const entries = Array.isArray(registry?.entries) ? registry.entries : [];
  let prev = "GENESIS";
  entries.forEach((e, i) => {
    if (e.entry_body?.entry_index !== i) errors.push(`entry ${i} index not contiguous`);
    if (e.entry_digest !== entryDigest(e.entry_body)) errors.push(`entry ${i} digest mismatch`);
    if (e.entry_body?.previous_entry_digest !== prev) errors.push(`entry ${i} broken chain link`);
    prev = e.entry_digest;
  });
  const last = entries[entries.length - 1];
  const expectedHead = last ? last.entry_digest : "GENESIS";
  if (registry?.head?.head_entry_digest !== expectedHead) errors.push("head digest mismatch");
  if (registry?.head?.entry_count !== entries.length) errors.push("head entry_count mismatch");
  return { ok: errors.length === 0, errors };
}

export function verifyAppendContinuity(previousHead, newRegistry) {
  const errors = [];
  const chain = verifyRegistryHashChain(newRegistry);
  if (!chain.ok) errors.push(...chain.errors.map((e) => `new registry: ${e}`));
  const prevCount = previousHead?.previous_entry_count ?? 0;
  const prevHeadDigest = previousHead?.previous_head_entry_digest ?? "GENESIS";
  const entries = newRegistry?.entries ?? [];
  if (entries.length < prevCount) errors.push("entries removed vs previous head");
  if (prevCount === 0) {
    if (entries.length > 0 && entries[0].entry_body.previous_entry_digest !== "GENESIS")
      errors.push("genesis append must start from GENESIS");
  } else {
    // the last PRESERVED entry must be exactly the previous head (no mutation/reorder of the prefix)
    const lastPreserved = entries[prevCount - 1];
    if (!lastPreserved) errors.push("previous entries missing vs previous head");
    else if (lastPreserved.entry_digest !== prevHeadDigest)
      errors.push("preserved prefix head does not match previous head");
    // and the first NEW entry must chain from the previous head
    const firstNew = entries[prevCount];
    if (entries.length > prevCount) {
      if (firstNew.entry_body.previous_entry_digest !== prevHeadDigest)
        errors.push("first appended entry does not continue from previous head");
    }
  }
  return { ok: errors.length === 0, errors };
}
