// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure Stage 3S claim checker. Strict single-object schema wall + field-equality against
// the evidence digest (no prose NLP) + the Stage 2.5 no-finding vocabulary wall.
import { resolveDigestRef } from "./evidenceDigest.mjs";

export const MODEL_SLOTS_SCHEMA = "simurgh.defensive_narrative.model_slots.v1";

export const ALLOWED_WORDING = Object.freeze(
  new Set([
    "no_issue_observed",
    "integrity_signal_present",
    "manual_review_recommended",
    "evidence_incomplete",
    "proof_missing",
    "proof_valid",
    "proof_replayed",
    "chain_valid",
    "chain_invalid",
    "fallback_observed",
    "containment_boundary_triggered",
    "provider_refusal_observed",
  ])
);
export const FORBIDDEN_WORDING = Object.freeze(
  new Set([
    "cheated",
    "guilty",
    "misconduct confirmed",
    "malicious",
    "intentional",
    "fraud",
    "proved wrongdoing",
    "caught",
  ])
);
export const ALLOWED_OPERATORS = Object.freeze(new Set(["==", "!=", ">", ">=", "<", "<="]));
export const ALLOWED_SEVERITY = Object.freeze(
  new Set([
    "no_issue_observed",
    "integrity_signal_present",
    "manual_review_recommended",
    "evidence_incomplete",
  ])
);

// Strict: exactly one JSON object of the right type. No fences, no prefixes, no arrays,
// no multiple objects, no extra prose.
export function parseModelSlots(outputText) {
  if (typeof outputText !== "string") return { ok: false, violation: "narrative_schema_violation" };
  const trimmed = outputText.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}"))
    return { ok: false, violation: "narrative_schema_violation" };
  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return { ok: false, violation: "narrative_schema_violation" };
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj))
    return { ok: false, violation: "narrative_schema_violation" };
  if (obj.type !== MODEL_SLOTS_SCHEMA)
    return { ok: false, violation: "narrative_schema_violation" };
  if (!Array.isArray(obj.slots)) return { ok: false, violation: "narrative_schema_violation" };
  return { ok: true, slots: obj.slots, source: obj.source ?? null };
}

export function evalOperator(op, actual, expected) {
  switch (op) {
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    default:
      return false;
  }
}

function hasForbidden(s) {
  const t = String(s ?? "").toLowerCase();
  for (const f of FORBIDDEN_WORDING) if (t.includes(f)) return true;
  return false;
}

export function verifySlots(slots, digest) {
  const verified = [];
  const rejected = [];
  let conflict_attempts = 0;
  for (const slot of slots) {
    // wall checks first (vocabulary / operator / forbidden) → unsupported_slot
    if (
      !ALLOWED_OPERATORS.has(slot.operator) ||
      !ALLOWED_WORDING.has(slot.wording) ||
      !ALLOWED_SEVERITY.has(slot.severity) ||
      hasForbidden(slot.wording) ||
      hasForbidden(slot.severity)
    ) {
      rejected.push({ slot_id: slot.slot_id, reason: "unsupported_slot" });
      continue;
    }
    const ref = resolveDigestRef(digest, slot.evidence_ref);
    if (!ref.found) {
      rejected.push({ slot_id: slot.slot_id, reason: "unsupported_slot" });
      continue;
    }
    // ref resolves: now it is a truth claim. If the relation fails → claim conflict.
    if (!evalOperator(slot.operator, ref.value, slot.expected_value)) {
      conflict_attempts += 1;
      rejected.push({ slot_id: slot.slot_id, reason: "narrative_claim_conflict" });
      continue;
    }
    verified.push({ slot_id: slot.slot_id, wording: slot.wording, severity: slot.severity });
  }
  return { verified, rejected, conflict_attempts };
}
