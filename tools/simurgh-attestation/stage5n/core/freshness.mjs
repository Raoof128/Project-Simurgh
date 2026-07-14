// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 401 freshness: the WHOLE issuer challenge is signed (P0-5); census-relative replay (P0/Task5).
import { R } from "./result.mjs";
import { freshnessRequestDigest, issuerChallengeDigest, censusKey } from "./derive.mjs";
import { verifyEd25519 } from "./sig.mjs";

export function checkFreshness(env, verifier_config, facts, census) {
  const fail = (d) =>
    R(401, "freshness_challenge_invalid_or_reused", {
      freshness_mode: env.freshness_challenge?.mode ?? null,
      failure: d,
    });
  const ch = env.freshness_challenge;
  if (!ch || ch.mode !== "issuer_signed") return fail("mode");

  const content = {
    challenge_schema: ch.challenge_schema,
    mode: ch.mode,
    request_commitment_digest: ch.request_commitment_digest,
    run_id: ch.run_id,
    nonce: ch.nonce,
    issued_at_ms: ch.issued_at_ms,
    expires_at_ms: ch.expires_at_ms,
    issuer_key_id: ch.issuer_key_id,
  };
  const pem = verifier_config?.pinned_issuer_pubkey_pem;
  if (!pem || ch.issuer_key_id !== verifier_config?.expected_issuer_fpr)
    return fail("signature_invalid");
  if (!verifyEd25519(pem, ch.signature, issuerChallengeDigest(content)))
    return fail("signature_invalid");

  // request_commitment_digest must reconstruct from the envelope's freshness_request.
  if (freshnessRequestDigest(env.freshness_request) !== ch.request_commitment_digest)
    return fail("binding_mismatch");
  if (
    env.freshness_request.run_id !== ch.run_id ||
    env.freshness_request.issuer_key_id !== ch.issuer_key_id
  )
    return fail("binding_mismatch");

  // Unexpired at the (claimed) start genTime; 405 later validates the token cryptographically.
  const g = facts?.start?.genTime_ms;
  if (!Number.isSafeInteger(g) || g < ch.issued_at_ms || g > ch.expires_at_ms)
    return fail("expired");
  if (env.start_request?.nonce !== ch.nonce) return fail("binding_mismatch");

  // Census-relative replay (excludes the current envelope's own appearance).
  const key = censusKey({
    mode: ch.mode,
    issuer_key_id: ch.issuer_key_id,
    run_id: ch.run_id,
    nonce: ch.nonce,
  });
  const prior = census?.prior_seen_keys ?? [];
  if (prior.includes(key)) return fail("reused");
  return null;
}
