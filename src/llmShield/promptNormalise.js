// SPDX-License-Identifier: AGPL-3.0-or-later
// Canonicalises user input before classification: NFKC fold, strip zero-width
// and control characters (keeping newline and tab), trim. Hashing preserves an
// auditable fingerprint of both raw and normalised forms without storing text.
import crypto from "node:crypto";

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
// All C0/C1 control chars except tab and newline, plus DEL.
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

export function normalisePrompt(input) {
  if (typeof input !== "string") return "";
  return input.normalize("NFKC").replace(ZERO_WIDTH, "").replace(CONTROL, "").trim();
}

export function hashPrompt(input) {
  return "sha256:" + crypto.createHash("sha256").update(String(input)).digest("hex");
}
