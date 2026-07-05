// SPDX-License-Identifier: AGPL-3.0-or-later
// Normative custody verifier — first failure wins, order 67→68→69→78→70→71→72→73→74→
// 75→76→77→79 (4P spec §7.1). Pure, no I/O; Ed25519 results are injected booleans.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { validateEnvelope, validateCustodyReceipt } from "./schemaCore.mjs";
import { verifyHopChain } from "./chainCore.mjs";
import { verifyCpcEmission } from "./cpcCore.mjs";
import { custodyPathDigest, hopReceiptDigest } from "./digest.mjs";

const TRACE_ALLOWED = Object.freeze({
  provider_only: ["provider_only"],
  declared_relay: ["provider_only", "declared_relay"],
  no_trace_retained: ["provider_only"],
  unknown_disallowed: [],
});

export function verifyCustody(input) {
  // 67
  if (!input.envelope) return { raw: 67, reason: "absent" };
  const ve = validateEnvelope(input.envelope);
  if (!ve.ok) return { raw: ve.raw, reason: ve.reason };
  const env = input.envelope;
  // 68
  if (!input.sig.envelope_ok) return { raw: 68, reason: "envelope_signature_invalid" };
  if (!input.sig.hops_ok) return { raw: 68, reason: "hop_signature_invalid" };
  if (!input.sig.receipt_ok) return { raw: 68, reason: "receipt_signature_invalid" };
  // 69 — envelope-only (MF3): no receipt field read here.
  if (env.run_epoch < env.valid_from_epoch || env.run_epoch > env.valid_until_epoch)
    return { raw: 69, reason: "run_epoch_outside_validity_window" };
  // 78 (laundering before content mismatches — it can mask them)
  const chain = verifyHopChain({
    envelopeDigest: input.envelopeDigest,
    hops: input.hops,
    responseDigest: input.responseDigest,
  });
  if (!chain.ok) return { raw: chain.raw, reason: chain.reason };
  // 70
  if (input.observed.endpoint_digest !== env.declared_endpoint_digest)
    return { raw: 70, reason: "declared_endpoint_digest_mismatch" };
  // 71
  if (env.relay_policy === "direct_only" && input.hops.length > 1)
    return { raw: 71, reason: "relay_policy_direct_only" };
  for (const rid of chain.relay_identity_digests)
    if (!env.declared_relay_digests.includes(rid)) return { raw: 71, reason: "relay_not_declared" };
  // Receipt-parseability precondition (MF3 follow-up): the receipt is read by the
  // content checks below (72 model, 75 surface). Validate its shape ONCE here, before
  // any receipt field is compared, so a malformed receipt fails 77 receipt_schema_invalid
  // instead of being misread as a 72/75 content mismatch (or throwing).
  const receiptShape = validateCustodyReceipt(input.custodyReceipt);
  if (!receiptShape.ok) return { raw: receiptShape.raw, reason: receiptShape.reason };
  // 72
  if (
    input.observed.model_identity_digest !== env.model_identity_digest ||
    input.custodyReceipt.model_identity_digest !== env.model_identity_digest
  )
    return { raw: 72, reason: "model_identity_digest_mismatch" };
  // 73
  if (input.observed.account_pool_observed && env.account_boundary !== "declared_pool")
    return { raw: 73, reason: "account_boundary_undeclared_pool" };
  // 74
  if (!TRACE_ALLOWED[env.trace_custody].includes(input.observed.trace_custody_observed))
    return { raw: 74, reason: "trace_custody_expanded_beyond_declaration" };
  // 75
  if (
    input.custodyReceipt.tool_surface_digest !== input.stage4o_surface_commitment_digest ||
    input.observed.tool_surface_digest !== input.stage4o_surface_commitment_digest
  )
    return { raw: 75, reason: "stage4o_surface_binding_mismatch" };
  // 76
  for (const t of input.observed.transform_digests)
    if (!env.declared_transform_digests.includes(t))
      return { raw: 76, reason: "transform_not_declared" };
  // 77 — binding only (schema already validated at the receipt-parseability gate above)
  const recomputedPath = custodyPathDigest(input.hops.map(hopReceiptDigest));
  if (
    input.custodyReceipt.request_digest !== input.requestDigest ||
    input.custodyReceipt.response_digest !== input.responseDigest ||
    input.custodyReceipt.custody_path_digest !== recomputedPath ||
    input.custodyReceipt.receipt_epoch !== env.run_epoch
  )
    return { raw: 77, reason: "binding_mismatch" };
  // 79
  const cpc = verifyCpcEmission({
    signals: input.cpc.signals,
    declared_cap: input.cpc.declared_cap,
    anchor_digests: input.cpc.anchor_digests,
  });
  if (!cpc.ok) return { raw: cpc.raw, reason: cpc.reason };
  return { raw: 0, custody_path_digest: chain.custody_path_digest };
}
