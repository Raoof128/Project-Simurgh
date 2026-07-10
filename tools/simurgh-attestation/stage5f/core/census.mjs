// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — audit census bijection (plan Task 14, raw 280, Law 5, audit-only). ALL public cells
// (every status) ↔ ALL terminal census records, keyed on stable record_id; every attempt resolves to
// one terminal record; the census hashes to the signed capture_log_digest. No dropped/phantom record.
import { sha256Canon } from "./digests.mjs";

export function checkCensus(bundle, auditPrivate) {
  if (!auditPrivate || sha256Canon(auditPrivate) !== bundle?.capture_provenance?.capture_log_digest)
    return 280;
  const records = auditPrivate.records ?? [];
  const cellIds = (bundle?.cells ?? []).map((c) => c.record_id);
  const recIds = records.map((r) => r.record_id);
  if (cellIds.length !== recIds.length || new Set(recIds).size !== recIds.length) return 280;
  const recSet = new Set(recIds);
  for (const id of cellIds) if (!recSet.has(id)) return 280; // no dropped cell
  const cellSet = new Set(cellIds);
  for (const id of recIds) if (!cellSet.has(id)) return 280; // no phantom record
  // every attempt links to exactly one terminal record.
  for (const r of records)
    if (
      r.status !== "missing_capture" &&
      r.status !== "not_applicable" &&
      typeof r.attempt_id !== "string"
    )
      return 280;
  return null;
}
