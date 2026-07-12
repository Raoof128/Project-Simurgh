// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — Ed25519 signing domains (kept with the node layer; the pure core never signs).
export const SIG = Object.freeze({
  receipt: "simurgh.vtcq.receipt_sig.v1",
  release: "simurgh.vtcq.release_sig.v1",
  tsaCrypto: "simurgh.vtcq.tsa_crypto_attestation.v1",
  checkpoint: "simurgh.vtcq.checkpoint_witness.v1",
});
