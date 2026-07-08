// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — OSCAL projection (spec §3, plan Task 15). Motto: AnthropicSafe First, then
// ReviewerSafe. Renders a VERIFIED map's aggregates as a NIST OSCAL Assessment-Results
// `observations` block — machine-generated evidence of a guardrail-control measurement. Pure
// projection of already-verified data (zero new raw codes, no network). Deterministic: all
// uuids derive from the map digest, so the projection is byte-stable.
import { recordDigest } from "../../stage4m/core/canonical.mjs";

// Shape a 32-hex chunk of a digest into a v4-style uuid string (deterministic, not random).
function uuidFrom(hex, tag) {
  const h = (recordDigest({ hex, tag }) + "0".repeat(64)).replace(/^sha256:/, "").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// toOscalObservations(map) → an OSCAL-shaped assessment-results fragment. One observation per
// region class (bytes measured) plus one for the shadow slip-rate. NON-CLAIM: an observation is
// a measurement, not a compliance verdict.
export function toOscalObservations(map) {
  const digest = recordDigest(map);
  const agg = map.aggregates;
  const observations = Object.keys(agg.bytes_by_class)
    .sort()
    .map((cls) => ({
      uuid: uuidFrom(digest, `bytes:${cls}`),
      description: `Bytes classified ${cls} by the frozen leakage gate over the submitted document.`,
      methods: ["TEST"],
      "relevant-evidence": [
        { href: "#vdr-map", description: `vdr.${cls}.byte_count=${agg.bytes_by_class[cls]}` },
      ],
    }));
  const sh = agg.shadow;
  observations.push({
    uuid: uuidFrom(digest, "shadow"),
    description:
      "Metamorphic shadow slip-rate: of the applicable signed variants of caught regions, how many slip the lexical gate.",
    methods: ["TEST"],
    "relevant-evidence": [
      {
        href: "#vdr-map",
        description: `vdr.shadow.slip_v1=${sh.k_slip_v1}/${sh.a_applicable_variants} slip_v2=${sh.k_slip_v2}/${sh.a_applicable_variants}`,
      },
    ],
  });
  return {
    "assessment-results": {
      uuid: uuidFrom(digest, "results"),
      metadata: {
        title: "Stage 4Y VDR document-residue measurement",
        version: "simurgh.vdr.map.v1",
        "oscal-version": "1.1.2",
      },
      results: [
        {
          uuid: uuidFrom(digest, "result"),
          title: "Verifiable Document Residue",
          description: "A residue map is a measurement, not a compliance verdict.",
          start: "1970-01-01T00:00:00Z",
          observations,
        },
      ],
    },
  };
}
