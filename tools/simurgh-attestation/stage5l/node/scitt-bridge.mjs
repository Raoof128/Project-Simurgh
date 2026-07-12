// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — I3 SCITT projection bridge. Emits `scitt_projection_candidate` — a signed projection of the
// public attestation (subject = commitment_session_id). SCITT-INSPIRED, NOT an RFC 9943-conforming Signed
// Statement (RFC 9943 mandates COSE_Sign1/CBOR; this emitter is JSON — a conforming COSE/CBOR projection is
// deferred). EMIT-ONLY: it performs no verification of its own; it re-projects already-signed data. A
// SCITT receipt proves append-only registration at a point in time, NOT global honesty.
import { DOMAINS } from "../constants.mjs";
import { artifactDigest } from "../core/digests.mjs";
import { buildPublicAttestation } from "./attestation.mjs";

export function emitScittProjection(bundle, cfg, facts, keys) {
  const pub = buildPublicAttestation(bundle, cfg, facts, keys);
  const statement = {
    kind: "scitt_projection_candidate", // NOT an RFC 9943 Signed Statement
    schema_version: DOMAINS.scittStatement,
    subject: bundle.commitment_session_id,
    payload: {
      public_attestation_digest: pub.digest,
      profile: pub.body.profile,
      computed_state: pub.body.computed_state,
      rung: pub.body.rung,
    },
    // the projection re-verifies TO the public attestation; it holds no independent authority.
    public_attestation: pub,
  };
  return { statement, digest: artifactDigest(statement) };
}
