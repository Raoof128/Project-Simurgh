// SPDX-License-Identifier: AGPL-3.0-or-later
// Canonicalise a single context's raw content for inspection only. Reuses the
// input pipeline (normalise -> attack-aware canonicalise) so context poisoning is
// scanned with the same rigor as user input. Returns scan views + a content hash;
// the raw content is never returned for storage.
import { normalisePrompt, hashPrompt } from "./promptNormalise.js";
import { canonicalisePrompt } from "./promptCanonicalise.js";

export function canonicaliseContext(rawContent) {
  const raw = typeof rawContent === "string" ? rawContent : "";
  const contentHash = hashPrompt(raw);
  const normalised = normalisePrompt(raw);
  const { canonical, compact, signals } = canonicalisePrompt(normalised);
  return { canonical, compact, signals, contentHash };
}
