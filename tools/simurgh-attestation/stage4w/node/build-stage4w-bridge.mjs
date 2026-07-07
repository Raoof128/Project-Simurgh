// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W C2PA/in-toto bridge projection (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
// C2PA signs the file and records declarations; VSN types the sentences and recomputes them.
// This Statement lets Content-Credentials tooling carry a VSN digest outward.
import { VSN_BRIDGE_STATEMENT_SCHEMA, VSN_BRIDGE_PREDICATE_TYPE } from "../constants.mjs";

export function buildBridgeStatement(narrativeBodyDigest, spanMapDigest, attestationDigest) {
  return {
    _type: VSN_BRIDGE_STATEMENT_SCHEMA,
    subject: [
      { name: "vsn-narrative", digest: { sha256: narrativeBodyDigest.replace(/^sha256:/, "") } },
    ],
    predicateType: VSN_BRIDGE_PREDICATE_TYPE,
    predicate: {
      span_map_digest: spanMapDigest,
      attestation_digest: attestationDigest,
      note: "C2PA records declarations; VSN recomputes spans. Corroborate by digest equality.",
    },
  };
}
