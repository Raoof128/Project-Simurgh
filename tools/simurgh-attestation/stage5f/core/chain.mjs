// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — evidence chain (plan Task 5, raw 270, Law 3). Linear, contiguous 0..N, single terminal
// head; the precommit is position 0 and the closeout is terminal and binds the Lane-B receipt digest.
// NO wall-clock claims: precedence is order in the recorded chain only.
import { sha256Canon } from "./digests.mjs";

export function recordDigest(rec) {
  const { record_digest, signature, ...rest } = rec;
  return sha256Canon(rest);
}

// The head BEFORE the closeout — what the Lane-B receipt and the closeout's previous_record_digest bind.
export function resultChainHeadDigest(records) {
  const ordered = [...records].sort((a, b) => a.chain_position - b.chain_position);
  return ordered[ordered.length - 2]?.record_digest ?? null;
}

export function checkChain(bundle) {
  const pre = bundle?.roster_precommit;
  const close = bundle?.closeout;
  if (!pre || !close) return 270;
  const records = [pre, close];
  const ordered = [...records].sort((a, b) => a.chain_position - b.chain_position);
  // contiguous 0..N, one per position
  for (let i = 0; i < ordered.length; i++) if (ordered[i].chain_position !== i) return 270;
  if (ordered[0].record_type !== "panel_precommit" || ordered[0].previous_record_digest !== null)
    return 270;
  for (const r of ordered) if (r.record_digest !== recordDigest(r)) return 270;
  for (let i = 1; i < ordered.length; i++)
    if (ordered[i].previous_record_digest !== ordered[i - 1].record_digest) return 270;
  const terminal = ordered[ordered.length - 1];
  if (
    terminal.record_type !== "panel_closeout" ||
    typeof terminal.blind_recompute_receipt_digest !== "string"
  )
    return 270;
  return null;
}
