// SPDX-License-Identifier: AGPL-3.0-or-later

export function recomputeRecordOutcome(record) {
  if (record.record_type === "abort") {
    return { resolved_class: record.target_class, verdict: "aborted" };
  }
  if (record.target_class === "III") {
    return { resolved_class: "III", verdict: "out_of_scope" };
  }
  if (record.target_class === "IV") {
    return { resolved_class: "IV", verdict: "escaped" };
  }
  return { resolved_class: record.resolved_class, verdict: record.verdict };
}
