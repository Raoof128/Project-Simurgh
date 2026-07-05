// SPDX-License-Identifier: AGPL-3.0-or-later
// Exact-key structural validators — the raw 80/83 tier (4Q spec §2.2, §2.3). Pure.
// Motto: AnthropicSafe First, then ReviewerSafe.
import {
  SCHEMAS,
  ENUMS,
  POLICY_ENVELOPE_KEYS,
  RECEIPT_KEYS,
  EXEMPTION_KEYS,
  CROSSING_KEYS,
  CHAIN_ENTRY_KEYS,
} from "../constants.mjs";
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";

const ok = () => ({ ok: true });
const bad = (reason, detail) => ({ ok: false, reason, detail });
const isDigest = (v) => typeof v === "string" && DIGEST_RE.test(v);
const isInt = (v) => Number.isInteger(v) && v >= 0;

function exactKeys(obj, keys) {
  const got = Object.keys(obj).sort();
  const want = [...keys].sort();
  return got.length === want.length && got.every((k, i) => k === want[i]);
}

function structural(obj, keys, schemaName, checks) {
  if (obj === null || obj === undefined) return bad("absent", "value_missing");
  if (typeof obj !== "object" || Array.isArray(obj)) return bad("schema_invalid", "not_object");
  if (!exactKeys(obj, keys)) return bad("schema_invalid", "exact_key_mismatch");
  if (obj.schema !== schemaName) return bad("schema_invalid", "schema_name_mismatch");
  for (const [name, predicate] of checks) {
    if (!predicate(obj)) return bad("schema_invalid", name);
  }
  return ok();
}

export function validateEnvelope(e) {
  return structural(e, POLICY_ENVELOPE_KEYS, SCHEMAS.ENVELOPE, [
    ["policy_id", (o) => typeof o.policy_id === "string" && o.policy_id.length > 0],
    [
      "boundary_kinds",
      (o) =>
        Array.isArray(o.boundary_kinds_requiring_approval) &&
        o.boundary_kinds_requiring_approval.length > 0 &&
        o.boundary_kinds_requiring_approval.every((k) => ENUMS.boundary_kind.includes(k)),
    ],
    [
      "admissible_exemptions",
      (o) =>
        Array.isArray(o.admissible_exemption_boundary_kinds) &&
        o.admissible_exemption_boundary_kinds.every((k) => ENUMS.boundary_kind.includes(k)),
    ],
    ["approver_digest", (o) => isDigest(o.approver_public_key_digest)],
    ["harness_digest", (o) => isDigest(o.harness_public_key_digest)],
    ["straddle", (o) => isInt(o.max_window_straddle)],
    ["run_id", (o) => isDigest(o.run_id_digest)],
    ["anchor", (o) => isDigest(o.stage4n_window_anchor_digest)],
  ]);
}

export function validateReceipt(r) {
  return structural(r, RECEIPT_KEYS, SCHEMAS.APPROVAL_RECEIPT, [
    ["action", (o) => isDigest(o.action_digest)],
    ["request", (o) => isDigest(o.request_digest)],
    ["kind", (o) => ENUMS.boundary_kind.includes(o.boundary_kind)],
    ["anchor", (o) => isDigest(o.stage4n_window_anchor_digest)],
    ["run_id", (o) => isDigest(o.run_id_digest)],
    ["receipt_epoch", (o) => isInt(o.receipt_epoch)],
    ["from", (o) => isInt(o.valid_from_epoch)],
    ["until", (o) => isInt(o.valid_until_epoch) && o.valid_until_epoch >= o.valid_from_epoch],
    // Freeze 3 / patch 3: a receipt cannot be minted outside its own declared window.
    [
      "mint_in_window",
      (o) => o.valid_from_epoch <= o.receipt_epoch && o.receipt_epoch <= o.valid_until_epoch,
    ],
    ["nonce", (o) => isDigest(o.nonce_digest)],
    ["display", (o) => isDigest(o.approval_display_digest)],
    ["approver_digest", (o) => isDigest(o.approver_public_key_digest)],
    ["signature", (o) => typeof o.signature === "string" && o.signature.length > 0],
  ]);
}

// Freeze 5 — the signed exemption object ("receipt of absence").
export function validateExemption(e) {
  return structural(e, EXEMPTION_KEYS, SCHEMAS.APPROVAL_EXEMPTION, [
    ["action", (o) => isDigest(o.action_digest)],
    ["request", (o) => isDigest(o.request_digest)],
    ["kind", (o) => ENUMS.boundary_kind.includes(o.boundary_kind)],
    ["run_id", (o) => isDigest(o.run_id_digest)],
    ["anchor", (o) => isDigest(o.stage4n_window_anchor_digest)],
    ["reason", (o) => ENUMS.exemption_reason.includes(o.exemption_reason)],
    [
      "policy_id",
      (o) => typeof o.exemption_policy_id === "string" && o.exemption_policy_id.length > 0,
    ],
    ["harness_digest", (o) => isDigest(o.harness_public_key_digest)],
    ["signature", (o) => typeof o.signature === "string" && o.signature.length > 0],
  ]);
}

export function validateCrossing(c) {
  return structural(c, CROSSING_KEYS, SCHEMAS.BOUNDARY_CROSSING, [
    ["action", (o) => isDigest(o.action_digest)],
    ["request", (o) => isDigest(o.request_digest)],
    ["kind", (o) => ENUMS.boundary_kind.includes(o.boundary_kind)],
    ["epoch", (o) => isInt(o.crossing_epoch)],
    ["run_id", (o) => isDigest(o.run_id_digest)],
    // Freeze 5 variant binding: kind ∈ {receipt, exemption} + a well-formed digest.
    ["binding_kind", (o) => ENUMS.approval_binding_kind.includes(o.approval_binding_kind)],
    ["binding_digest", (o) => isDigest(o.approval_binding_digest)],
    ["harness_digest", (o) => isDigest(o.harness_public_key_digest)],
    ["signature", (o) => typeof o.signature === "string" && o.signature.length > 0],
  ]);
}

export function validateChainEntry(en) {
  return structural(en, CHAIN_ENTRY_KEYS, SCHEMAS.RUN_CHAIN_ENTRY, [
    ["kind", (o) => ENUMS.entry_kind.includes(o.entry_kind)],
    ["digest", (o) => isDigest(o.entry_digest)],
    [
      "raw",
      (o) =>
        o.raw_code === 0 || (Number.isInteger(o.raw_code) && o.raw_code >= 80 && o.raw_code <= 89),
    ],
    ["previous", (o) => isDigest(o.previous_entry_digest)],
    ["position", (o) => isInt(o.chain_position)],
  ]);
}
