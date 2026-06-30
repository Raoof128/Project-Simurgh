// SPDX-License-Identifier: AGPL-3.0-or-later
import { sha256Canonical } from "../stage4d/stage4dCrypto.mjs";

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

export const INTEGRITY_LABELS = Object.freeze(["trusted", "untrusted"]);
export const REQUIRED_SINK_INTEGRITY = "trusted";

export const INTEGRITY_LATTICE = Object.freeze({
  proof_system: PROOF_SYSTEM,
  labels: ["trusted", "untrusted"],
  order: [["untrusted", "trusted"]],
  bottom: "untrusted",
  top: "trusted",
});

export const INTEGRITY_LATTICE_DIGEST = `sha256:${sha256Canonical(INTEGRITY_LATTICE)}`;
