// SPDX-License-Identifier: AGPL-3.0-or-later
// Article-73/55 projection (spec §4.5): a pure output surface over a verified bundle.
// Field groups mirror the Commission serious-incident template sections; every field is
// either { value, source_digest } from a recomputable disclosure claim or the literal
// "not_projected". No free text is ever synthesized. This is not a filing.
import { recordDigest } from "../core/canonical.mjs";
import { VXD_PROJECTION_SCHEMA } from "../constants.mjs";

const claimValue = (disclosure, kind) => disclosure.claims.find((c) => c.kind === kind)?.value;

export function buildArticle73Projection({ attestation, disclosure }) {
  const sourceDigest = recordDigest(disclosure);
  const range = claimValue(disclosure, "window_range");
  const affected = claimValue(disclosure, "consumer_count");
  return {
    schema: VXD_PROJECTION_SCHEMA,
    attestation_digest: recordDigest(attestation),
    incident_description: "not_projected",
    temporal_scope:
      range !== undefined ? { value: range, source_digest: sourceDigest } : "not_projected",
    affected_counts:
      affected !== undefined ? { value: affected, source_digest: sourceDigest } : "not_projected",
    corrective_context: "not_projected",
    non_claims: ["not_legal_compliance_certification", "projection_is_output_surface_not_filing"],
  };
}
