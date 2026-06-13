// SPDX-License-Identifier: AGPL-3.0-or-later
// src/integrity/pairingCanonicalise.js
//
// Pairing payloads use the same canonical signing rules as integrity proof payloads:
// top-level `signature` stripped, keys lex-sorted at every depth, no whitespace,
// UTF-8 bytes. We re-export the proof helper rather than duplicate it — fewer
// places for the canonical wire format to drift between modules.
export { canonicaliseProofPayload as canonicalisePairingPayload } from "./proofCanonicalise.js";
