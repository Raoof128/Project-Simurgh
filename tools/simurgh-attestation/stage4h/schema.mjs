// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CERTIFICATE_TYPE,
  CHECKER_VERSION,
  CLAIM,
  DEFAULT_SCOPE,
  INTEGRITY_LABELS,
  MANIFEST_VERSION,
  PROOF_SYSTEM,
} from "./constants.mjs";

const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const BASE64_RE = /^base64:[A-Za-z0-9+/]+={0,2}$/;
const PREMISE_REF_RE = /^premise:sha256:[a-f0-9]{64}$/;

export const CERTIFICATE_ALLOWED_KEYS = Object.freeze([
  "type",
  "proof_system",
  "claim",
  "scope",
  "run_id_hash",
  "base_pack_digest",
  "replay_root",
  "premise_digest",
  "policy_digest",
  "lattice_digest",
  "checker_version",
  "derivation",
  "summary",
]);

export const DERIVATION_ALLOWED_KEYS = Object.freeze([
  "derived_node_labels",
  "lattice_steps",
  "sink_safety_claims",
  "premise_refs",
]);

export const DERIVED_NODE_LABEL_ALLOWED_KEYS = Object.freeze(["node", "label", "premise_refs"]);
export const LATTICE_STEP_ALLOWED_KEYS = Object.freeze(["op", "node", "inputs", "result"]);
export const SINK_SAFETY_CLAIM_ALLOWED_KEYS = Object.freeze(["node", "node_label", "safe"]);
const SUMMARY_ALLOWED_KEYS = Object.freeze([
  "sources_checked",
  "edges_checked",
  "authority_sinks_checked",
  "violations",
]);
const MANIFEST_ALLOWED_KEYS = Object.freeze([
  "manifest_version",
  "base_pack_digest",
  "certificate_digest",
  "signed_pack_manifest_digest",
  "merkle_root",
  "signature",
]);

function keysExactly(value, keys, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail("schema_invalid", path);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  for (const key of actual) {
    if (!expected.includes(key)) {
      return fail("unknown_field", path ? `${path}.${key}` : key);
    }
  }
  for (const key of expected) {
    if (!actual.includes(key)) {
      return fail("schema_invalid", path ? `${path}.${key}` : key);
    }
  }
  return ok();
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function ok() {
  return { ok: true };
}

function fail(reason, field) {
  return { ok: false, reason, field };
}

export function validateJsonTextNoDuplicateKeys(raw) {
  const stack = [];
  let index = 0;
  while (index < raw.length) {
    const ch = raw[index];
    if (/\s/.test(ch)) {
      index += 1;
      continue;
    }
    if (ch === "{") {
      stack.push({ keys: new Set(), expectingKey: true });
      index += 1;
      continue;
    }
    if (ch === "}") {
      stack.pop();
      index += 1;
      continue;
    }
    if (ch === ",") {
      if (stack.length > 0) stack[stack.length - 1].expectingKey = true;
      index += 1;
      continue;
    }
    if (ch !== '"') {
      index += 1;
      continue;
    }

    let end = index + 1;
    let escaped = false;
    while (end < raw.length) {
      const current = raw[end];
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === '"') {
        break;
      }
      end += 1;
    }
    const token = raw.slice(index, end + 1);
    let cursor = end + 1;
    while (/\s/.test(raw[cursor])) cursor += 1;
    const top = stack[stack.length - 1];
    if (top?.expectingKey && raw[cursor] === ":") {
      const key = JSON.parse(token);
      if (top.keys.has(key)) return { ok: false, reason: "duplicate_key", key };
      top.keys.add(key);
      top.expectingKey = false;
    }
    index = end + 1;
  }
  return ok();
}

function validIntegrityLabel(label) {
  return INTEGRITY_LABELS.includes(label);
}

function validPremiseRefs(refs) {
  return (
    Array.isArray(refs) && refs.every((ref) => typeof ref === "string" && PREMISE_REF_RE.test(ref))
  );
}

function validDerivationEntries(derivation) {
  for (const label of derivation.derived_node_labels) {
    const keys = keysExactly(
      label,
      DERIVED_NODE_LABEL_ALLOWED_KEYS,
      "derivation.derived_node_labels[]"
    );
    if (!keys.ok) return keys;
    if (typeof label.node !== "string")
      return fail("schema_invalid", "derivation.derived_node_labels[].node");
    if (!validIntegrityLabel(label.label))
      return fail("schema_invalid", "derivation.derived_node_labels[].label");
    if (!validPremiseRefs(label.premise_refs))
      return fail("schema_invalid", "derivation.derived_node_labels[].premise_refs");
  }

  for (const step of derivation.lattice_steps) {
    const keys = keysExactly(step, LATTICE_STEP_ALLOWED_KEYS, "derivation.lattice_steps[]");
    if (!keys.ok) return keys;
    if (step.op !== "combine") return fail("schema_invalid", "derivation.lattice_steps[].op");
    if (typeof step.node !== "string")
      return fail("schema_invalid", "derivation.lattice_steps[].node");
    if (!Array.isArray(step.inputs) || !step.inputs.every(validIntegrityLabel))
      return fail("schema_invalid", "derivation.lattice_steps[].inputs");
    if (!validIntegrityLabel(step.result))
      return fail("schema_invalid", "derivation.lattice_steps[].result");
  }

  for (const claim of derivation.sink_safety_claims) {
    const keys = keysExactly(
      claim,
      SINK_SAFETY_CLAIM_ALLOWED_KEYS,
      "derivation.sink_safety_claims[]"
    );
    if (!keys.ok) return keys;
    if (typeof claim.node !== "string")
      return fail("schema_invalid", "derivation.sink_safety_claims[].node");
    if (!validIntegrityLabel(claim.node_label))
      return fail("schema_invalid", "derivation.sink_safety_claims[].node_label");
    if (typeof claim.safe !== "boolean")
      return fail("schema_invalid", "derivation.sink_safety_claims[].safe");
  }

  if (!validPremiseRefs(derivation.premise_refs)) {
    return fail("schema_invalid", "derivation.premise_refs");
  }
  return ok();
}

export function isSha256Digest(value) {
  return typeof value === "string" && DIGEST_RE.test(value);
}

export function validateDfiCertificate(cert) {
  const topKeys = keysExactly(cert, CERTIFICATE_ALLOWED_KEYS, "certificate");
  if (!topKeys.ok) return topKeys;
  if (cert.type !== CERTIFICATE_TYPE) return fail("schema_invalid", "type");
  if (cert.proof_system !== PROOF_SYSTEM) return fail("proof_system_unsupported", "proof_system");
  if (cert.claim !== CLAIM) return fail("schema_invalid", "claim");
  const scopeKeys = keysExactly(cert.scope, Object.keys(DEFAULT_SCOPE), "scope");
  if (!scopeKeys.ok) return scopeKeys;
  for (const [key, value] of Object.entries(DEFAULT_SCOPE)) {
    if (cert.scope[key] !== value) return fail("schema_invalid", `scope.${key}`);
  }
  for (const field of [
    "run_id_hash",
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
  ]) {
    if (!isSha256Digest(cert[field])) return fail("schema_invalid", field);
  }
  if (cert.checker_version !== CHECKER_VERSION) {
    return fail("schema_invalid", "checker_version");
  }
  const derivationKeys = keysExactly(cert.derivation, DERIVATION_ALLOWED_KEYS, "derivation");
  if (!derivationKeys.ok) return derivationKeys;
  for (const field of Object.keys(cert.derivation)) {
    if (!Array.isArray(cert.derivation[field])) {
      return fail("schema_invalid", `derivation.${field}`);
    }
  }
  const derivationEntries = validDerivationEntries(cert.derivation);
  if (!derivationEntries.ok) return derivationEntries;
  const summaryKeys = keysExactly(cert.summary, SUMMARY_ALLOWED_KEYS, "summary");
  if (!summaryKeys.ok) return summaryKeys;
  for (const field of Object.keys(cert.summary)) {
    if (!nonNegativeInteger(cert.summary[field])) return fail("schema_invalid", `summary.${field}`);
  }
  return ok();
}

export function validateSignedPackManifest(manifest) {
  if (!keysExactly(manifest, MANIFEST_ALLOWED_KEYS, "manifest").ok) {
    return fail("schema_invalid", "manifest");
  }
  if (manifest.manifest_version !== MANIFEST_VERSION) {
    return fail("schema_invalid", "manifest_version");
  }
  for (const field of [
    "base_pack_digest",
    "certificate_digest",
    "signed_pack_manifest_digest",
    "merkle_root",
  ]) {
    if (!isSha256Digest(manifest[field])) return fail("schema_invalid", field);
  }
  if (typeof manifest.signature !== "string" || !BASE64_RE.test(manifest.signature)) {
    return fail("schema_invalid", "signature");
  }
  return ok();
}
