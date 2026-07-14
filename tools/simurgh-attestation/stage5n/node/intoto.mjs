// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — I-F interval predicate (emit-only, unregistered candidate). Subject is the SHA-256 of the exact
// envelope bytes (NOT D_out — a domain-separated commitment); the elapsed lower bound lives in the predicate.
import crypto from "node:crypto";

export function buildIntotoStatement(envelopeBytes, env, verdict, packManifestDigest) {
  const subjectDigest = crypto.createHash("sha256").update(envelopeBytes).digest("hex");
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [{ name: "vtc-delay-envelope.json", digest: { sha256: subjectDigest } }],
    predicateType: "https://simurgh.dev/attestation/vtc-delay-interval/v0",
    predicate: {
      D_out: env.D_out,
      delay_policy_digest: env.delay_policy_digest,
      elapsed_lower_bound_ms: verdict.elapsed_lower_bound_ms ?? null,
      portable_pack_manifest_digest: packManifestDigest ?? null,
      verdict_raw: verdict.raw,
      non_claim:
        "asserts the elapsed lower bound, not review quality; consumers inherit every 5N non-claim",
      conformance: "unregistered candidate; not in-toto/SCITT-conforming",
    },
  };
}
