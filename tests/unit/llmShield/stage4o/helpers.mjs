// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared Stage 4O test builders. NOT a test file (no test() calls) so importing it never
// double-registers tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { domainDigest } from "../../../../tools/simurgh-attestation/stage4o/core/digest.mjs";
import { surfacePath } from "../../../../tools/simurgh-attestation/stage4o/core/merkleSurface.mjs";
import {
  computeToolsetRoot,
  toolEntryDigest,
  deltaDigest,
  commitmentDigest,
} from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import {
  DOMAINS,
  TOOL_MANIFEST_SCHEMA,
  COMMITMENT_SCHEMA,
  RECEIPT_SCHEMA,
  ACTION_SCHEMA,
  GENESIS,
} from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

export function mkEntry(i, over = {}) {
  return {
    tool_name_digest: domainDigest(DOMAINS.SERVER_ID, "test-name", `tool-${i}`),
    tool_schema_digest: domainDigest(DOMAINS.SERVER_ID, "test-schema", `schema-${i}`),
    authority_class: "read_only",
    declared_sinks: [],
    risk_class: "low",
    ...over,
  };
}

export function mkManifest(entries) {
  const tools = [...entries].sort((a, b) => (a.tool_name_digest < b.tool_name_digest ? -1 : 1));
  const m = {
    schema: TOOL_MANIFEST_SCHEMA,
    server_id_digest: domainDigest(DOMAINS.SERVER_ID, "test", "srv"),
    toolset_digest: "sha256:" + "0".repeat(64),
    tools,
  };
  m.toolset_digest = computeToolsetRoot(m);
  return m;
}

export function mkEnvelope(manifest, epoch, prevEnv, consent) {
  return {
    schema: COMMITMENT_SCHEMA,
    manifest,
    manifest_epoch: epoch,
    valid_from_epoch: epoch * 10,
    valid_until_epoch: epoch * 10 + 9,
    previous_manifest_digest: prevEnv ? commitmentDigest(prevEnv) : GENESIS,
    delta_digest: prevEnv ? deltaDigest(prevEnv.manifest, manifest) : GENESIS,
    consent_binding: consent,
    signer_public_key_pem: "PEM",
    signature: "sig",
  };
}

// A valid two-epoch world with a receipt for tool-1 (present in both epochs).
export function validWorld() {
  const m0 = mkManifest([mkEntry(1)]);
  const m1 = mkManifest([mkEntry(1), mkEntry(2)]);
  const e0 = mkEnvelope(m0, 0, null, "state");
  const e1 = mkEnvelope(m1, 1, e0, "delta");
  const idx = m1.tools.findIndex((t) => t.tool_name_digest === mkEntry(1).tool_name_digest);
  const entry = m1.tools[idx];
  const receipt = {
    schema: RECEIPT_SCHEMA,
    tool_name_digest: entry.tool_name_digest,
    tool_schema_digest: entry.tool_schema_digest,
    authority_class: entry.authority_class,
    sinks_used: [],
    inclusion_proof: surfacePath(m1.tools.map(toolEntryDigest), idx),
    run_epoch: 12,
    run_id_digest: domainDigest(DOMAINS.RECEIPT, "run", "run-1"),
  };
  const actionDigest = domainDigest(DOMAINS.ACTION, ACTION_SCHEMA, { family: "egress" });
  return { chain: [e0, e1], receipt, actionDigest };
}
