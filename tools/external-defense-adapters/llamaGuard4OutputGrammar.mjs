// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure parser for Llama Guard 4 classifier output. LG4 emits `safe` or `unsafe` on the first
// line; if `unsafe`, an optional second line lists comma-separated hazard codes (S<number>).
// Never throws; anything off-grammar is malformed_output.
const MALFORMED = Object.freeze({
  label: "unknown",
  categories: [],
  error_code: "malformed_output",
});
const CODE = /^S\d+$/;

export function parseLlamaGuard4(raw) {
  if (typeof raw !== "string") return MALFORMED;
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return MALFORMED;
  const head = lines[0].toLowerCase();
  if (head === "safe") return { label: "safe", categories: [], error_code: "none" };
  if (head === "unsafe") {
    if (lines.length === 1) return { label: "unsafe", categories: [], error_code: "none" };
    const codes = lines[1].split(",").map((c) => c.trim());
    if (codes.every((c) => CODE.test(c)))
      return { label: "unsafe", categories: codes, error_code: "none" };
    return MALFORMED;
  }
  return MALFORMED;
}
