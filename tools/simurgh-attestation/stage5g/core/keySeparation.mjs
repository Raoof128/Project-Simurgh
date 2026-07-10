// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC key-separation floor (raw 289). The rung-0 predicate: the producer key must be distinct
// from the verifier key (recomputed from the PEMs, not trusted from the declared fingerprints).
import { CODES } from "../constants.mjs";
import { fingerprint } from "./signatures.mjs";

export function checkKeySeparation(bundle) {
  const producerFp = fingerprint(bundle.producer_identity.public_key_pem);
  const verifierFp = fingerprint(bundle.verifier_identity.public_key_pem);
  return producerFp !== verifierFp ? null : CODES.VFC_KEY_NOT_DISTINCT;
}
