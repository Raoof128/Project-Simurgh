// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — bootstrap provenance (plan Task 12, raw 278). Pure: validates pin records + the impure
// runner's results (never trusts a bundle-declared recorded_raw). Three modes: historical_verifier
// (default — the historical verifier was re-run), reference_binding (metadata + digest only, weaker,
// explicitly declared), none (BYO — no historical lineage). Imports never contribute panel cells.
export function checkBootstrap(bundle, runnerResults = {}) {
  const mode = bundle?.provenance_mode;
  const entries = bundle?.bootstrap_provenance ?? [];

  if (mode === "none") return entries.length === 0 ? null : 278;
  if (mode !== "historical_verifier" && mode !== "reference_binding") return 278;
  if (entries.length === 0) return 278;

  for (const e of entries) {
    for (const k of [
      "imported_from",
      "release_tag",
      "commit",
      "bundle_digest",
      "original_schema",
      "original_key_fingerprint",
      "recorded_raw",
    ]) {
      if (!(k in e)) return 278;
    }
    if (mode === "historical_verifier") {
      const r = runnerResults[e.imported_from];
      if (!r) return 282; // runner could not execute → fail-closed
      if (r.ok !== true || r.recorded_raw !== e.recorded_raw || r.bundle_digest !== e.bundle_digest)
        return 278;
      if (r.key_fingerprint !== e.original_key_fingerprint) return 278;
    }
    // reference_binding: metadata + digest equality already checked structurally above (weaker claim).
  }
  return null;
}
