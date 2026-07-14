// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — pure digest derivations (the frozen commitment formulas). No I/O, no crypto beyond H_DS.
import { hdsObject } from "./encoding.mjs";
import { DS } from "../constants.mjs";

export const startRequestDigest = (startRequest) => hdsObject(DS.start_request, startRequest);

// P0-2: the producer signature is INSIDE the timestamped subject, so anchoring proves it predates the token.
export const startAuthorisationDigest = (startAuthorisation) =>
  hdsObject(DS.start_authorisation, startAuthorisation);

export const inputCommitment = (inputReference) => hdsObject(DS.input, inputReference);
export const decisionDigest = (decisionBody) => hdsObject(DS.decision, decisionBody);
export const policyDigest = (delayPolicy) => hdsObject(DS.policy, delayPolicy);
export const outputCommitment = (fields) => hdsObject(DS.output, fields);
export const freshnessRequestDigest = (req) => hdsObject(DS.freshness_request, req);
export const issuerChallengeDigest = (content) => hdsObject(DS.issuer_challenge, content);
export const censusKey = (fields) => hdsObject(DS.census, fields);

// The final-envelope digest is over the envelope with the final_envelope_signature field REMOVED (not nulled).
export function finalEnvelopeDigest(envelope) {
  const { final_envelope_signature, ...rest } = envelope;
  void final_envelope_signature;
  return hdsObject(DS.envelope, rest); // shared canonicaliser inside hdsObject (P0-9)
}
