// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC rating-chain + epoch-ticket integrity (337). Owns STRUCTURE, including cross-subject
// supersession and epoch-ticket signatures (reviewer P6). A correct-subject entry with a bad SIGNER is
// 340/341 (Task 1.8), not here. 337 runs after obligation (334–336) in the frozen order.
import { R } from "./result.mjs";

function checkOneChain(entries) {
  // entries: all rating entries sharing one chain_subject.
  const digests = new Set(entries.map((e) => e.entry_digest));
  const genesis = entries.filter((e) => e.content.supersedes_digest === null);
  if (genesis.length !== 1) return "chain_genesis_not_unique";

  const revisions = entries.map((e) => e.content.revision).sort((a, b) => a - b);
  for (let i = 0; i < revisions.length; i++) {
    if (revisions[i] !== i) return "revision_not_contiguous";
  }
  // Exactly one head = an entry whose digest no other entry in the chain supersedes.
  const superseded = new Set(
    entries.map((e) => e.content.supersedes_digest).filter((d) => d !== null)
  );
  // every non-null supersedes_digest must reference an entry IN this chain (no cycle / no dangling here)
  for (const d of superseded) {
    if (!digests.has(d)) return "supersedes_out_of_chain";
  }
  const heads = entries.filter((e) => !superseded.has(e.entry_digest));
  if (heads.length !== 1) return "active_head_ambiguous";
  return null;
}

export function checkChains(ctx) {
  const { bundle, facts } = ctx;
  const all = [...bundle.reviewer_ratings, ...bundle.producer_ratings];
  const subjectOf = new Map(all.map((e) => [e.entry_digest, e.content.chain_subject]));

  // Cross-subject / cross-chain supersession is a STRUCTURAL fault (caught before signatures).
  for (const e of all) {
    const sup = e.content.supersedes_digest;
    if (sup === null) continue;
    if (!subjectOf.has(sup)) return R(337, "supersedes_dangling");
    if (subjectOf.get(sup) !== e.content.chain_subject) return R(337, "cross_subject_supersession");
  }

  // Per-chain topology.
  const byChain = new Map();
  for (const e of all) {
    const k = e.content.chain_subject;
    if (!byChain.has(k)) byChain.set(k, []);
    byChain.get(k).push(e);
  }
  for (const [, entries] of byChain) {
    const err = checkOneChain(entries);
    if (err) return R(337, err);
  }

  // Epoch-ticket chain: contiguity via previous_epoch_ticket_digest AND ledger-authority signature.
  const tickets = bundle.epoch_tickets;
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (!facts.epochTicketSigValid?.[t.epoch_ticket_digest]) {
      return R(337, "epoch_ticket_signature_invalid");
    }
    const expectedPrev = i === 0 ? null : tickets[i - 1].epoch_ticket_digest;
    if (t.content.previous_epoch_ticket_digest !== expectedPrev) {
      return R(337, "epoch_ticket_chain_broken");
    }
  }
  return null;
}
