// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CHECKER_VERSION,
  CERTIFICATE_TYPE,
  CLAIM,
  DEFAULT_SCOPE,
  INTEGRITY_LABELS,
  PROOF_SYSTEM,
} from "./constants.mjs";
import { buildPremiseSet, digest, premiseDigest } from "./canonicalPremises.mjs";
import { validateDfiCertificate } from "./schema.mjs";

export function certificateDigest(certificate) {
  return digest(certificate);
}

export function normalizeIntegrityLabel(label) {
  return label === "trusted" ? "trusted" : "untrusted";
}

export function combineIntegrity(labels) {
  for (const label of labels) {
    if (!INTEGRITY_LABELS.includes(label)) {
      throw new Error(`unknown integrity label: ${label}`);
    }
    if (label === "untrusted") return "untrusted";
  }
  return "trusted";
}

export function integrityLte(a, b) {
  if (!INTEGRITY_LABELS.includes(a) || !INTEGRITY_LABELS.includes(b)) {
    throw new Error("unknown integrity label");
  }
  return a === b || (a === "untrusted" && b === "trusted");
}

export function buildDfiCertificate({ pack }) {
  const premises = buildPremiseSet(pack);
  const certificate = {
    type: CERTIFICATE_TYPE,
    proof_system: PROOF_SYSTEM,
    claim: CLAIM,
    scope: { ...DEFAULT_SCOPE },
    run_id_hash: digest(pack.run_manifest?.run_id || "unknown-run"),
    base_pack_digest: premises.base_pack_digest,
    replay_root: premises.replay_root,
    premise_digest: premiseDigest(premises),
    policy_digest: premises.policy_digest,
    lattice_digest: premises.lattice_digest,
    checker_version: CHECKER_VERSION,
    derivation: {
      derived_node_labels: [],
      lattice_steps: [],
      sink_safety_claims: [],
      premise_refs: [],
    },
    summary: {
      sources_checked: premises.sources.length,
      edges_checked: premises.explicit_edges.length,
      authority_sinks_checked: premises.authority_sinks.length,
      violations: 0,
    },
  };
  const valid = validateDfiCertificate(certificate);
  if (!valid.ok) throw new Error(`invalid stage4h certificate: ${valid.reason}:${valid.field}`);
  return certificate;
}
