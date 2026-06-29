// SPDX-License-Identifier: AGPL-3.0-or-later
export const CERTIFICATE_TYPE = "simurgh.vca.dfi_certificate.v1";
export const PROOF_SYSTEM = "simurgh-ifc-lattice-v0";
export const CHECKER_VERSION = "4h-v0";
export const CLAIM = "explicit_data_flow_integrity";
export const MANIFEST_VERSION = "simurgh.vca.signed_pack_manifest.v1";
export const MANIFEST_DOMAIN = "SIMURGH_STAGE4H_MANIFEST_V1\0";
export const STAGE4H_EVIDENCE_DIR = "docs/research/llm-shield/evidence/stage-4h";
export const STAGE4D_EVIDENCE_DIR =
  "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack";

export const DEFAULT_SCOPE = Object.freeze({
  explicit_data_edges: true,
  control_dependence_edges: false,
  implicit_flow_security: false,
});
