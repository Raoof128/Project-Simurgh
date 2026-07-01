// SPDX-License-Identifier: AGPL-3.0-or-later
import { INTEGRITY_LABELS } from "./constants.mjs";
import { RAW_VERIFIER_CODES } from "./exitCodes.mjs";
import { isSha256Digest } from "./schema.mjs";

const PREMISE_REF_RE = /^premise:sha256:[a-f0-9]{64}$/;
const ID_RE = /^(source|action):[A-Za-z0-9_-]{1,64}$/;
const ID_PREFIX_RE = /^(source|action):/;
const MAX_STRING = 256;
const MAX_ID_SUFFIX = 64;
const MAX_SUMMARY_INT = 1_000_000;

export const allowedKeysByPath = Object.freeze({
  certificate: Object.freeze([
    "type",
    "proof_system",
    "claim",
    "scope",
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
    "run_id_hash",
    "checker_version",
    "summary",
    "derivation",
  ]),
  summary: Object.freeze([
    "sources_checked",
    "edges_checked",
    "authority_sinks_checked",
    "violations",
  ]),
  derivation: Object.freeze([
    "derived_node_labels",
    "lattice_steps",
    "sink_safety_claims",
    "premise_refs",
  ]),
  "derived_node_labels[]": Object.freeze(["node", "label", "premise_refs"]),
  "sink_safety_claims[]": Object.freeze(["node", "node_label", "safe"]),
  "lattice_steps[]": Object.freeze(["op", "node", "inputs", "result"]),
});

function leak(reason, where) {
  return { ok: false, code: RAW_VERIFIER_CODES.PRIVACY_LEAK_DETECTED, reason, where };
}

function checkStringLength(value, where) {
  return typeof value === "string" && value.length > MAX_STRING
    ? leak("over_length_field", where)
    : null;
}

function checkAllowedKeys(obj, path, flags) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const allowed = allowedKeysByPath[path] || [];
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      flags.push("freeform_field_present");
      continue;
    }
    const tooLong = checkStringLength(obj[key], `${path}.${key}`);
    if (tooLong) return tooLong;
  }
  return null;
}

function checkNestedKeys(cert, flags) {
  for (const [obj, path] of [
    [cert, "certificate"],
    [cert.summary, "summary"],
    [cert.derivation, "derivation"],
  ]) {
    const result = checkAllowedKeys(obj, path, flags);
    if (result) return result;
  }
  for (const [arrayName, path] of [
    ["derived_node_labels", "derived_node_labels[]"],
    ["sink_safety_claims", "sink_safety_claims[]"],
    ["lattice_steps", "lattice_steps[]"],
  ]) {
    for (const entry of cert.derivation?.[arrayName] || []) {
      const result = checkAllowedKeys(entry, path, flags);
      if (result) return result;
    }
  }
  return null;
}

function checkLatticeStepValues(step) {
  if (step.op !== "combine") return leak("opaque_or_freeform_field", "lattice_steps.op");
  const nodeCheck = checkIdValue(step.node);
  if (nodeCheck) return nodeCheck;
  if (!Array.isArray(step.inputs)) return leak("opaque_or_freeform_field", "lattice_steps.inputs");
  for (const input of step.inputs) {
    if (!INTEGRITY_LABELS.includes(input)) {
      return leak("unknown_label_not_in_lattice_enum", `lattice_steps.inputs.${input}`);
    }
  }
  if (!INTEGRITY_LABELS.includes(step.result)) {
    return leak("unknown_label_not_in_lattice_enum", `lattice_steps.result.${step.node}`);
  }
  return null;
}

function checkIdValue(value) {
  if (ID_RE.test(value)) return null;
  if (typeof value === "string" && ID_PREFIX_RE.test(value)) {
    const suffix = value.replace(ID_PREFIX_RE, "");
    if (suffix.length > MAX_ID_SUFFIX) return leak("over_length_field", value);
  }
  return leak("raw_text_in_key", value);
}

export function covertCapacityBits(cert) {
  const perEnum = Math.log2(INTEGRITY_LABELS.length);
  return (
    (cert.derivation?.derived_node_labels?.length || 0) * perEnum +
    (cert.derivation?.sink_safety_claims?.length || 0) * perEnum
  );
}

export function privacyGate(cert) {
  const auxiliaryFlags = [];
  const keyResult = checkNestedKeys(cert, auxiliaryFlags);
  if (keyResult) return keyResult;

  for (const field of [
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
    "run_id_hash",
  ]) {
    if (!isSha256Digest(cert[field])) return leak("opaque_or_freeform_field", field);
  }

  for (const entry of cert.derivation.derived_node_labels) {
    const nodeCheck = checkIdValue(entry.node);
    if (nodeCheck) return nodeCheck;
    if (!INTEGRITY_LABELS.includes(entry.label)) {
      return /[^a-z_]/.test(String(entry.label))
        ? leak("non_enum_label", `derived_node_labels.${entry.node}`)
        : leak("unknown_label_not_in_lattice_enum", `derived_node_labels.${entry.node}`);
    }
    for (const ref of entry.premise_refs) {
      if (!PREMISE_REF_RE.test(ref)) return leak("raw_text_in_premise_ref", ref);
    }
  }

  for (const claim of cert.derivation.sink_safety_claims) {
    const nodeCheck = checkIdValue(claim.node);
    if (nodeCheck) return nodeCheck;
    if (!INTEGRITY_LABELS.includes(claim.node_label)) {
      return leak("unknown_label_not_in_lattice_enum", `sink_safety_claims.${claim.node}`);
    }
    if (typeof claim.safe !== "boolean") {
      return leak("opaque_or_freeform_field", `sink_safety_claims.${claim.node}.safe`);
    }
  }

  for (const step of cert.derivation.lattice_steps) {
    const stepResult = checkLatticeStepValues(step);
    if (stepResult) return stepResult;
  }

  for (const ref of cert.derivation.premise_refs) {
    if (!PREMISE_REF_RE.test(ref)) return leak("raw_text_in_premise_ref", ref);
  }

  for (const [key, value] of Object.entries(cert.summary)) {
    if (!Number.isInteger(value) || value < 0 || value > MAX_SUMMARY_INT) {
      return leak("raw_text_in_summary", `summary.${key}`);
    }
  }

  return {
    ok: true,
    code: RAW_VERIFIER_CODES.OK,
    covert_capacity_bits: covertCapacityBits(cert),
    auxiliaryFlags,
  };
}
