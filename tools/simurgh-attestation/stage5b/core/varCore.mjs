// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — evaluateVar orchestrator (spec §3; plan Task 8). Runs VAR_CHECK_ORDER 210→223
// first-failure-wins; the wrapper 224 (evaluateVarSafe) is applied LAST via try/catch and is
// NEVER reached by the normal order. Schema (210) validates shape only — a charter carrying a
// tensor_commitment_root is a well-formed object routed to 219, not a 210 schema reject
// (reachability, reviewer medium). Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { VAR_SCHEMAS } from "../constants.mjs";
import {
  deriveAttackIds,
  checkCharterCampaign,
  verifyAttackScheduled,
  checkPrecommitStructural,
} from "./charter.mjs";
import { checkNoAuthorsMap, checkCaptureCeremony } from "./captureBinding.mjs";
import {
  checkFindingClassification,
  checkNoSilentBypass,
  checkBypassLabelMismatch,
  checkSeverityLock,
  detectOmittedBypasses,
} from "./findingLedger.mjs";
import {
  checkAsrRecompute,
  checkTallies,
  checkFloorReconciliation,
  checkPartition,
} from "./asrCore.mjs";

const GREEN = { raw: 0, reason: "green" };
export function attestationBody(att) {
  const { signature, ...body } = att;
  return body;
}
export function signAttestation(att, privKey) {
  const body = attestationBody(att);
  const signature = crypto.sign(null, Buffer.from(canonicalJson(body)), privKey).toString("hex");
  return { ...body, signature };
}
function sigOk(body, signatureHex, pubKeyPem) {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalJson(body)),
      crypto.createPublicKey(pubKeyPem),
      Buffer.from(signatureHex, "hex")
    );
  } catch {
    return false;
  }
}

// 210 — shape only (required artifacts + schema strings + finding fields). Extras are ignored.
export function checkSchema(bundle) {
  const bad = (detail) => ({ raw: 210, reason: "var_schema_invalid", detail });
  if (!bundle || typeof bundle !== "object") return bad({ shape: true });
  if (bundle.charter?.schema !== VAR_SCHEMAS.CHARTER) return bad({ charter: true });
  if (bundle.capture_binding?.schema !== VAR_SCHEMAS.CAPTURE_BINDING)
    return bad({ capture_binding: true });
  if (bundle.attestation?.schema !== VAR_SCHEMAS.ATTESTATION) return bad({ attestation: true });
  if (!Array.isArray(bundle.findings)) return bad({ findings: true });
  for (const f of bundle.findings)
    if (
      typeof f?.attack_id !== "string" ||
      typeof f?.target_raw !== "number" ||
      typeof f?.outcome !== "string"
    )
      return bad({ finding_shape: f?.attack_id });
  return GREEN;
}

// 211 — attestation + charter signatures valid.
export function checkSignature(bundle) {
  if (
    !sigOk(
      attestationBody(bundle.attestation),
      bundle.attestation.signature,
      bundle.attestation_pub_key_pem
    )
  )
    return { raw: 211, reason: "var_signature_invalid", detail: { attestation: true } };
  const { signature, ...charterBody } = bundle.charter;
  if (!sigOk(charterBody, signature, bundle.charter_pub_key_pem))
    return { raw: 211, reason: "var_signature_invalid", detail: { charter: true } };
  return GREEN;
}

// evaluateVar — the frozen order. `tier` ∈ {public, audit}; audit adds the omitted-bypass
// (truthfulness) teeth of 217 over `drivenResults`.
export function evaluateVar(
  bundle,
  { tier = "public", drivenResults = null, canonicalFamilyCounts } = {}
) {
  let r = checkSchema(bundle);
  if (r.raw) return r;
  r = checkSignature(bundle);
  if (r.raw) return r;
  r = checkCharterCampaign(bundle.charter, {
    pubKeyPem: bundle.charter_pub_key_pem,
    canonicalFamilyCounts,
  });
  if (r.raw) return r;
  const scheduled = deriveAttackIds(
    bundle.charter.campaign_seed,
    bundle.charter.attack_family_counts
  );
  for (const f of bundle.findings) {
    r = verifyAttackScheduled(f.attack_id, bundle.charter);
    if (r.raw) return r;
  }
  r = checkNoAuthorsMap(bundle.capture_binding, bundle.frozen_capture);
  if (r.raw) return r;
  r = checkCaptureCeremony(bundle.capture_binding, bundle.charter);
  if (r.raw) return r;
  for (const f of bundle.findings) {
    r = checkFindingClassification(f);
    if (r.raw) return r;
  }
  for (const f of bundle.findings) {
    r = checkNoSilentBypass(f);
    if (r.raw) return r;
  }
  // Audit-only truthfulness teeth of 217: omitted bypasses (needs the re-driven results).
  if (tier === "audit" && drivenResults) {
    r = detectOmittedBypasses(bundle.findings, drivenResults);
    if (r.raw) return r;
  }
  for (const f of bundle.findings) {
    r = checkBypassLabelMismatch(f);
    if (r.raw) return r;
  }
  r = checkPrecommitStructural(bundle.charter);
  if (r.raw) return r;
  for (const f of bundle.findings) {
    r = checkSeverityLock(f, bundle.charter.known_limitations);
    if (r.raw) return r;
  }
  r = checkPartition(bundle.findings, scheduled);
  if (r.raw) return r;
  r = checkAsrRecompute(bundle.attestation.aggregates, bundle.findings);
  if (r.raw) return r;
  r = checkTallies(bundle.attestation, bundle.findings);
  if (r.raw) return r;
  r = checkFloorReconciliation(bundle.findings, bundle.floors || {});
  if (r.raw) return r;
  return { raw: 0, reason: "green", tier };
}

// 224 — fail-closed wrapper, applied LAST, only via an internal exception.
export function evaluateVarSafe(bundle, opts) {
  try {
    return evaluateVar(bundle, opts);
  } catch (e) {
    return {
      raw: 224,
      reason: "internal_fail_closed_var",
      detail: { error: String(e?.message || e) },
    };
  }
}

export { recordDigest };
