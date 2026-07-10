// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — corpus binding (plan Task 7, raw 272). Cases hash to corpus_digest; cells reference
// only committed cases; unique, non-empty case IDs. "Verify the exam before marking the answers."
import { sha256Canon } from "./digests.mjs";

export function checkCorpus(bundle) {
  const cases = bundle?.corpus?.cases;
  if (!Array.isArray(cases) || cases.length === 0) return 272;
  const ids = cases.map((c) => c.case_id);
  if (new Set(ids).size !== ids.length) return 272;
  if (bundle.corpus.corpus_digest !== sha256Canon(cases)) return 272;
  const committed = new Set(ids);
  for (const cell of bundle.cells ?? []) if (!committed.has(cell.case_id)) return 272;
  return null;
}
