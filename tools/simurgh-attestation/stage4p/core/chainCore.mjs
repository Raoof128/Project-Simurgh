// SPDX-License-Identifier: AGPL-3.0-or-later
// Previous-link hop chain verification — raw 78 custody_path_laundering (4P spec §6.2,
// patch: previous-link only, no forward digests). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { hopReceiptDigest, hopReplayDigest, custodyPathDigest } from "./digest.mjs";
import { validateHopReceipt } from "./schemaCore.mjs";

const launder = (reason) => ({ ok: false, raw: 78, reason });

export function verifyHopChain({ envelopeDigest, hops, responseDigest }) {
  if (!Array.isArray(hops) || hops.length === 0) return launder("missing_hop");
  for (const hop of hops) {
    const v = validateHopReceipt(hop);
    if (!v.ok) return v; // structural validity precedes linkage (spec §7.1)
  }
  const digests = [];
  const seenContent = new Set();
  let prev = envelopeDigest;
  for (let i = 0; i < hops.length; i++) {
    if (hops[i].hop_index !== i) return launder("reordered_hop");
    if (hops[i].previous_receipt_digest !== prev) return launder("non_linking_previous_digest");
    // Content-only replay check (MF2): the same relay/transform/input/output appearing
    // twice is a loop/replay even at a valid new chain position.
    const replay = hopReplayDigest(hops[i]);
    if (seenContent.has(replay)) return launder("duplicated_hop");
    seenContent.add(replay);
    const receipt = hopReceiptDigest(hops[i]);
    digests.push(receipt);
    prev = receipt;
  }
  if (hops[hops.length - 1].output_digest !== responseDigest)
    return launder("terminal_response_mismatch");
  return {
    ok: true,
    custody_path_digest: custodyPathDigest(digests),
    relay_identity_digests: hops.map((h) => h.relay_identity_digest),
  };
}
