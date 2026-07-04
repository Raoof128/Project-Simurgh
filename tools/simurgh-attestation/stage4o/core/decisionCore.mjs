// SPDX-License-Identifier: AGPL-3.0-or-later
// The 12-check manifest-bound gate (4O spec §6). Fail-closed; DOCUMENTED order
// 55,56,57,64,65,58,59,60,61,62,63(,66 at attestation level); first failure wins.
// Crypto is injected so this core stays pure and browser-safe.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { domainDigest } from "./digest.mjs";
import {
  validateEnvelope,
  commitmentDigest,
  computeToolsetRoot,
  toolEntryDigest,
} from "./manifestCore.mjs";
import { validateChain } from "./driftCore.mjs";
import { verifySurfacePath } from "./merkleSurface.mjs";
import { DOMAINS, RECEIPT_SCHEMA, KERNEL_ENTRYPOINT, AUTHORITY_ORDER } from "../constants.mjs";

const RECEIPT_KEYS = [
  "schema",
  "tool_name_digest",
  "tool_schema_digest",
  "authority_class",
  "sinks_used",
  "inclusion_proof",
  "run_epoch",
  "run_id_digest",
];
const rank = (c) => AUTHORITY_ORDER.indexOf(c);
const R = (raw, name, reason) => ({ raw, name, reason });

export const receiptDigest = (receipt) => domainDigest(DOMAINS.RECEIPT, RECEIPT_SCHEMA, receipt);

export function validateReceipt(r) {
  const ok =
    r &&
    typeof r === "object" &&
    !Array.isArray(r) &&
    Object.keys(r).length === RECEIPT_KEYS.length &&
    RECEIPT_KEYS.every((k) => k in r) &&
    r.schema === RECEIPT_SCHEMA &&
    DIGEST_RE.test(r.tool_name_digest) &&
    DIGEST_RE.test(r.tool_schema_digest) &&
    AUTHORITY_ORDER.includes(r.authority_class) &&
    Array.isArray(r.sinks_used) &&
    r.sinks_used.every((s) => DIGEST_RE.test(s)) &&
    Array.isArray(r.inclusion_proof) &&
    Number.isInteger(r.run_epoch) &&
    r.run_epoch >= 0 &&
    DIGEST_RE.test(r.run_id_digest);
  return ok ? { ok: true } : { ok: false };
}

export function gateToolCall({ chain, receipt, actionDigest, verifyCommitmentSignature }) {
  // 55 — commitment absent or schema-invalid (manifest_defect enum in reason)
  if (!Array.isArray(chain) || chain.length === 0) return R(55, "manifest_missing", "absent");
  for (const env of chain)
    if (!validateEnvelope(env).ok) return R(55, "manifest_missing", "schema_invalid");
  const head = chain[chain.length - 1];
  // 56 — tool-manifest commitment signature (NEVER the attestation-bundle signature)
  for (const env of chain) {
    if (!verifyCommitmentSignature(env))
      return R(56, "manifest_signature_invalid", "commitment_signature_invalid");
  }
  // 63 (receipt malformed) is documented as part of check 9, but epoch check 57 needs
  // run_epoch — a malformed receipt therefore fails closed at 63 BEFORE 57 can read it.
  if (!validateReceipt(receipt).ok)
    return R(63, "manifest_receipt_binding_mismatch", "receipt_schema_invalid");
  // 57 — logical freshness
  if (receipt.run_epoch < head.valid_from_epoch || receipt.run_epoch > head.valid_until_epoch) {
    return R(57, "manifest_epoch_invalid", "run_epoch_outside_validity_window");
  }
  // 64 / 65 — epoch-chain phase
  const chainResult = validateChain(chain);
  if (!chainResult.ok) {
    return R(
      chainResult.raw,
      chainResult.raw === 64 ? "drift_laundering_detected" : "blind_reapproval",
      chainResult.reason
    );
  }
  // 58 — recomputed toolset root vs committed
  if (computeToolsetRoot(head.manifest) !== head.manifest.toolset_digest) {
    return R(58, "server_or_toolset_digest_mismatch", "toolset_root_recompute_mismatch");
  }
  // 59 — identity + inclusion proof
  const entry = head.manifest.tools.find((t) => t.tool_name_digest === receipt.tool_name_digest);
  if (!entry) return R(59, "tool_identity_mismatch", "tool_not_in_manifest");
  if (
    !verifySurfacePath(
      toolEntryDigest(entry),
      receipt.inclusion_proof,
      head.manifest.toolset_digest
    )
  ) {
    return R(59, "tool_identity_mismatch", "inclusion_proof_invalid");
  }
  // 60 — schema digest
  if (receipt.tool_schema_digest !== entry.tool_schema_digest) {
    return R(60, "tool_schema_digest_mismatch", "schema_digest_mismatch");
  }
  // 61 — authority escalation
  if (rank(receipt.authority_class) > rank(entry.authority_class)) {
    return R(61, "authority_class_upgrade", "authority_class_upgrade");
  }
  // 62 — sink expansion
  if (!receipt.sinks_used.every((s) => entry.declared_sinks.includes(s))) {
    return R(62, "declared_sink_expansion", "sink_not_declared");
  }
  // 63 — binding
  if (!DIGEST_RE.test(actionDigest))
    return R(63, "manifest_receipt_binding_mismatch", "binding_mismatch");
  return {
    raw: 0,
    name: "accepted",
    bindings: {
      action_digest: actionDigest,
      manifest_digest: commitmentDigest(head),
      manifest_entry_digest: toolEntryDigest(entry),
      kernel_entrypoint: KERNEL_ENTRYPOINT,
      receipt_digest: receiptDigest(receipt),
      run_id_digest: receipt.run_id_digest,
    },
  };
}
