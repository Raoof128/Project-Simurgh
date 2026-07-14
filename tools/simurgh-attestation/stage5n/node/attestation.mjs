// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — two-tier attestation. Public tier binds the recomputation-bearing digests + verifier_config +
// census identity + non-claims (an outsider reaches raw 0 offline WITHOUT trusting the producer). Audit tier
// adds facts + the signed known_limitations. Distinct SIG5N domains (must not collide with 5L/5M SIG.*).
import crypto from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { hdsObject } from "../core/encoding.mjs";
import { NON_CLAIMS, DS } from "../constants.mjs";

export const SIG5N = Object.freeze({
  public: "simurgh.vtc_delay.attestation.public.v1",
  audit: "simurgh.vtc_delay.attestation.audit.v1",
});

const KNOWN_LIMITATIONS = Object.freeze([
  "157s_gate_figure_used_a_different_seed_derivation_not_the_shipped_measurement",
  "beacon_mode_has_no_single_issuer_trust_root_but_relies_on_public_beacon_authenticity_and_finality",
  "60000ms_floor_is_a_policy_floor_not_a_sufficiency_threshold",
  "browser_tier_is_core_only_for_anchors_node_or_python_required_for_full_5m_anchor_validation",
  "a_valid_chain_around_a_pre_decided_verdict_still_verifies_finalisation_is_not_cognition",
  "replay_detection_is_census_relative_an_omitted_census_detects_no_reuse",
  "ots_offline_verifier_confirms_the_bitcoin_attestation_and_binds_D_full_merkle_recompute_is_the_residual",
]);

export function buildPublicPayload(env, verdict, verifier_config, census) {
  return {
    attestation_schema: SIG5N.public,
    envelope_schema: env.envelope_schema,
    D_in: env.D_in,
    D_out: env.D_out,
    delay_policy_digest: env.delay_policy_digest,
    elapsed_lower_bound_ms: verdict.elapsed_lower_bound_ms ?? null,
    raw: verdict.raw,
    reason: verdict.reason,
    verifier_config_digest: hdsObject(DS.envelope, redactConfig(verifier_config)),
    census_scope_digest: census?.scope_digest ?? null,
    expected_input_source_digest: hdsObject(DS.input, {
      src: verifier_config?.expected_input_source ?? null,
    }),
    non_claims: NON_CLAIMS,
  };
}

export function buildAuditPayload(env, verdict, verifier_config, census, facts) {
  const pub = buildPublicPayload(env, verdict, verifier_config, census);
  return {
    attestation_schema: SIG5N.audit,
    public_attestation_digest: hdsObject(DS.envelope, pub),
    facts_digest: hdsObject(DS.envelope, facts ?? {}),
    known_limitations: KNOWN_LIMITATIONS,
    public: pub,
  };
}

// verifier_config carries PEMs + trust material; the digest binds the trust surface, PEMs included.
function redactConfig(vc) {
  return vc ?? {};
}

export function signAttestation(payload, privateKeyPem, domain) {
  const msg = Buffer.from(domain + "\0" + canonicalJson(payload), "utf8");
  const sig = crypto.sign(null, msg, crypto.createPrivateKey(privateKeyPem));
  return { ...payload, attestation_signature: "base64:" + sig.toString("base64") };
}

export function verifyAttestation(signed, publicKeyPem, domain) {
  try {
    const { attestation_signature, ...payload } = signed;
    if (!attestation_signature?.startsWith("base64:")) return false;
    const msg = Buffer.from(domain + "\0" + canonicalJson(payload), "utf8");
    return crypto.verify(
      null,
      msg,
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(attestation_signature.slice(7), "base64")
    );
  } catch {
    return false;
  }
}
