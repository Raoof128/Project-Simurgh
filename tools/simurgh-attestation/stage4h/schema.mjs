// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CERTIFICATE_TYPE,
  CHECKER_VERSION,
  CLAIM,
  DEFAULT_SCOPE,
  MANIFEST_VERSION,
  PROOF_SYSTEM,
} from "./constants.mjs";

const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const BASE64_RE = /^base64:[A-Za-z0-9+/]+={0,2}$/;

function keysExactly(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
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

export function isSha256Digest(value) {
  return typeof value === "string" && DIGEST_RE.test(value);
}

export function validateDfiCertificate(cert) {
  const topKeys = [
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
  ];
  if (!keysExactly(cert, topKeys)) return fail("schema_invalid", "certificate");
  if (cert.type !== CERTIFICATE_TYPE) return fail("schema_invalid", "type");
  if (cert.proof_system !== PROOF_SYSTEM) return fail("proof_system_unsupported", "proof_system");
  if (cert.claim !== CLAIM) return fail("schema_invalid", "claim");
  if (!keysExactly(cert.scope, Object.keys(DEFAULT_SCOPE))) return fail("schema_invalid", "scope");
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
  if (
    !keysExactly(cert.derivation, [
      "derived_node_labels",
      "lattice_steps",
      "sink_safety_claims",
      "premise_refs",
    ])
  ) {
    return fail("schema_invalid", "derivation");
  }
  for (const field of Object.keys(cert.derivation)) {
    if (!Array.isArray(cert.derivation[field])) {
      return fail("schema_invalid", `derivation.${field}`);
    }
  }
  if (
    !keysExactly(cert.summary, [
      "sources_checked",
      "edges_checked",
      "authority_sinks_checked",
      "violations",
    ])
  ) {
    return fail("schema_invalid", "summary");
  }
  for (const field of Object.keys(cert.summary)) {
    if (!nonNegativeInteger(cert.summary[field])) return fail("schema_invalid", `summary.${field}`);
  }
  return ok();
}

export function validateSignedPackManifest(manifest) {
  if (
    !keysExactly(manifest, [
      "manifest_version",
      "base_pack_digest",
      "certificate_digest",
      "signed_pack_manifest_digest",
      "merkle_root",
      "signature",
    ])
  ) {
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
