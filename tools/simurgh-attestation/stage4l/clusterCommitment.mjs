// SPDX-License-Identifier: AGPL-3.0-or-later
import { sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import {
  ASSIGNMENT_FIELDS,
  CCB_ASSIGNMENT_SCHEMA,
  CLUSTER_BASIS_ENUM,
  RAW_IDENTITY_DENYLIST,
} from "./constants.mjs";

export class CcbSchemaError extends Error {
  constructor(reason, detail) {
    super(`ccb schema violation: ${reason}${detail ? ` (${detail})` : ""}`);
    this.reason = reason;
  }
}

const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;

// The commitment identifies the CLUSTER: members sharing these fields share it.
export const clusterCommitmentDigest = (a) =>
  `sha256:${sha256Canonical({
    window: a.window,
    cluster_basis: a.cluster_basis,
    basis_digests: a.basis_digests,
    binding_policy_digest: a.binding_policy_digest,
    graph_version_digest: a.graph_version_digest,
  })}`;

function rejectRawIdentityKeys(obj, where) {
  for (const k of Object.keys(obj)) {
    if (RAW_IDENTITY_DENYLIST.includes(k.toLowerCase())) {
      throw new CcbSchemaError("raw_identity_key", `${where}.${k}`);
    }
  }
}

export function validateAssignment(a) {
  if (!a || typeof a !== "object" || Array.isArray(a)) {
    throw new CcbSchemaError("schema_invalid_assignment");
  }
  rejectRawIdentityKeys(a, "assignment");
  for (const k of Object.keys(a)) {
    if (!ASSIGNMENT_FIELDS.includes(k)) throw new CcbSchemaError("schema_unknown_field", k);
  }
  for (const k of ASSIGNMENT_FIELDS) {
    if (!(k in a)) throw new CcbSchemaError("schema_missing_field", k);
  }
  if (a.schema !== CCB_ASSIGNMENT_SCHEMA) throw new CcbSchemaError("schema_mismatch", a.schema);
  if (typeof a.window !== "string" || a.window.length === 0) {
    throw new CcbSchemaError("schema_missing_field", "window");
  }
  if (a.binding_level !== "cluster") throw new CcbSchemaError("invalid_binding_level");
  if (a.raw_identity_exported !== false) {
    throw new CcbSchemaError("raw_identity_exported_not_false");
  }
  for (const f of ["consumer_id_digest", "binding_policy_digest", "graph_version_digest"]) {
    if (!DIGEST_RE.test(a[f])) throw new CcbSchemaError("schema_invalid_digest", f);
  }
  if (!Array.isArray(a.cluster_basis) || a.cluster_basis.length === 0) {
    throw new CcbSchemaError("empty_cluster_basis");
  }
  for (const b of a.cluster_basis) {
    if (!CLUSTER_BASIS_ENUM.includes(b)) throw new CcbSchemaError("unknown_cluster_basis", b);
  }
  if (!a.basis_digests || typeof a.basis_digests !== "object" || Array.isArray(a.basis_digests)) {
    throw new CcbSchemaError("schema_invalid_basis_digests");
  }
  rejectRawIdentityKeys(a.basis_digests, "basis_digests");
  for (const k of Object.keys(a.basis_digests)) {
    if (!a.cluster_basis.includes(k)) throw new CcbSchemaError("basis_key_not_in_basis", k);
    if (!DIGEST_RE.test(a.basis_digests[k])) throw new CcbSchemaError("schema_invalid_digest", k);
  }
  for (const b of a.cluster_basis) {
    if (!(b in a.basis_digests)) throw new CcbSchemaError("basis_digest_missing", b);
  }
  if (a.cluster_commitment !== clusterCommitmentDigest(a)) {
    throw new CcbSchemaError("commitment_recompute_mismatch");
  }
}
