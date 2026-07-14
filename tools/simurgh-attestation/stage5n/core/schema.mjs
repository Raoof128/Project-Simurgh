// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 396 envelope well-formedness (+ adequacy/overclaim scan + input provenance), 397 final
// signature (committed AND == verifier_config pin), 398 input commitment. Pure over already-parsed input;
// hostile-JSON byte preflight (dup keys / __proto__ / limits) is the node adapter's job before parse.
import { R } from "./result.mjs";
import { isDigestHex } from "./encoding.mjs";
import { finalEnvelopeDigest, inputCommitment } from "./derive.mjs";
import { verifyEd25519, fprOf } from "./sig.mjs";
import {
  ADEQUACY_FORBIDDEN_KEYS,
  DELAY_OVERCLAIM_FORBIDDEN_KEYS,
  ENVELOPE_SCHEMA,
} from "../constants.mjs";

const REQUIRED_TOP = [
  "envelope_schema",
  "run_id",
  "input_reference",
  "D_in",
  "delay_policy",
  "delay_policy_digest",
  "freshness_challenge",
  "freshness_request",
  "start_request",
  "start_authorisation",
  "start_token_digest",
  "execution_declaration",
  "delay_proof",
  "decision_body",
  "decision_digest",
  "D_out",
  "start_endpoint",
  "end_endpoint",
  "interpretability",
  "final_envelope_signature",
];

function scanForbidden(v) {
  if (Array.isArray(v)) return v.some(scanForbidden);
  if (v && typeof v === "object") {
    for (const k of Object.keys(v)) {
      if (ADEQUACY_FORBIDDEN_KEYS.has(k) || DELAY_OVERCLAIM_FORBIDDEN_KEYS.has(k)) return true;
      if (scanForbidden(v[k])) return true;
    }
  }
  return false;
}

export function checkEnvelope(env, opts) {
  if (!env || typeof env !== "object")
    return R(396, "delay_envelope_malformed", { detail: "not_object" });
  if (env.envelope_schema !== ENVELOPE_SCHEMA)
    return R(396, "delay_envelope_malformed", { detail: "schema" });
  const keys = new Set(Object.keys(env));
  for (const k of REQUIRED_TOP)
    if (!keys.has(k)) return R(396, "delay_envelope_malformed", { detail: `missing:${k}` });
  for (const k of keys)
    if (!REQUIRED_TOP.includes(k))
      return R(396, "delay_envelope_malformed", { detail: `unknown:${k}` });
  if (scanForbidden(env))
    return R(396, "delay_envelope_malformed", { detail: "forbidden_adequacy_or_overclaim_key" });
  for (const f of [
    "D_in",
    "delay_policy_digest",
    "start_token_digest",
    "decision_digest",
    "D_out",
  ]) {
    if (!isDigestHex(env[f]))
      return R(396, "delay_envelope_malformed", { detail: `digest_contract:${f}` });
  }
  const hasRef = env.input_reference && typeof env.input_reference === "object";
  if (!hasRef && !opts?.expectedInputCommitment)
    return R(396, "delay_envelope_malformed", { detail: "input_provenance_absent" });
  return null;
}

export function checkFinalSignature(env, verifier_config) {
  const pin = verifier_config?.expected_final_signer_fpr;
  const committed = env.delay_policy?.final_signer_fingerprint;
  if (!pin || committed !== pin)
    return R(397, "final_envelope_signature_invalid", { detail: "signer_not_pinned" });
  const pem = verifier_config?.pinned_finalsigner_pubkey_pem;
  if (!pem || fprOf(pem) !== pin)
    return R(397, "final_envelope_signature_invalid", { detail: "pinned_key_fpr_mismatch" });
  if (!verifyEd25519(pem, env.final_envelope_signature, finalEnvelopeDigest(env)))
    return R(397, "final_envelope_signature_invalid", { detail: "signature" });
  return null;
}

export function checkInput(env, opts) {
  const expected = opts?.expectedInputCommitment ?? inputCommitment(env.input_reference);
  if (env.D_in !== expected) return R(398, "input_commitment_mismatch");
  return null;
}
