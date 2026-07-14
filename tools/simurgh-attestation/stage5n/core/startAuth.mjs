// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 402 start_request binding (commits the already-verified values), 403 producer signature over
// the raw start_request_digest (inside the anchored start_authorisation subject, P0-2).
import { R } from "./result.mjs";
import { startRequestDigest } from "./derive.mjs";
import { verifyEd25519 } from "./sig.mjs";

export function checkStartBinding(env) {
  const sr = env.start_request;
  if (!sr || typeof sr !== "object")
    return R(402, "start_request_binding_invalid", { detail: "absent" });
  if (sr.run_id !== env.run_id)
    return R(402, "start_request_binding_invalid", { detail: "run_id" });
  if (sr.D_in !== env.D_in) return R(402, "start_request_binding_invalid", { detail: "D_in" });
  if (sr.delay_policy_digest !== env.delay_policy_digest)
    return R(402, "start_request_binding_invalid", { detail: "delay_policy_digest" });
  if (sr.nonce !== env.freshness_challenge?.nonce)
    return R(402, "start_request_binding_invalid", { detail: "nonce" });
  const auth = env.start_authorisation;
  if (!auth || auth.start_request_digest !== startRequestDigest(sr))
    return R(402, "start_request_binding_invalid", { detail: "authorisation_digest" });
  return null;
}

export function checkStartSignature(env, verifier_config) {
  const auth = env.start_authorisation;
  if (auth?.producer_key_fingerprint !== verifier_config?.expected_producer_fpr)
    return R(403, "start_request_signature_invalid", { detail: "producer_not_pinned" });
  const pem = verifier_config?.pinned_producer_pubkey_pem;
  if (!pem || !verifyEd25519(pem, auth.start_request_signature, auth.start_request_digest))
    return R(403, "start_request_signature_invalid", { detail: "signature" });
  return null;
}
