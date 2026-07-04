// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

test("domains are the spec list plus the commitment domain, all NUL-free uppercase", () => {
  assert.deepEqual(Object.keys(C.DOMAINS).sort(), [
    "ACTION",
    "ATTESTATION_BUNDLE",
    "DECISION_CORPUS",
    "DELTA",
    "MANIFEST_COMMITMENT",
    "MERKLE_LEAF",
    "MERKLE_NODE",
    "RECEIPT",
    "SERVER_ID",
    "TIMELINE",
    "TOOLSET",
    "TOOL_ENTRY",
  ]);
  for (const v of Object.values(C.DOMAINS)) assert.match(v, /^SIMURGH_STAGE4O_[A-Z_]+_V1$/);
});

test("closed enums and frozen wordings", () => {
  assert.deepEqual([...C.AUTHORITY_ORDER], ["read_only", "write", "egress", "destructive"]);
  assert.deepEqual([...C.RISK_CLASSES], ["low", "medium", "high"]);
  assert.deepEqual([...C.CONSENT_BINDINGS], ["state", "delta"]);
  assert.equal(C.KERNEL_ENTRYPOINT, "authorise_with_manifest.v1");
  assert.equal(C.VTSA_NON_CLAIMS.length, 8);
  assert.ok(C.VTSA_NON_CLAIMS.includes("not_constitutional_compliance_claim"));
  assert.ok(C.HONESTY_CEILING.startsWith("Infrastructure alignment is not model-value alignment."));
});

test("schema ids are the frozen v1 identifiers", () => {
  assert.equal(C.TOOL_MANIFEST_SCHEMA, "simurgh.tool_manifest.v1");
  assert.equal(C.COMMITMENT_SCHEMA, "simurgh.tool_manifest_commitment.v1");
  assert.equal(C.RECEIPT_SCHEMA, "simurgh.tool_receipt.v1");
  assert.equal(C.ACTION_SCHEMA, "simurgh.tool_action.v1");
  assert.equal(C.TIMELINE_SCHEMA, "simurgh.surface_timeline.v1");
  assert.equal(C.ATTESTATION_SCHEMA, "simurgh.vtsa_attestation.v1");
  assert.equal(C.GENESIS, "genesis");
});

test("alignment vocabulary is a closed frozen list", () => {
  assert.ok(Object.isFrozen(C.ALIGNMENT_VOCABULARY));
  assert.ok(
    C.ALIGNMENT_VOCABULARY.includes("prevents_silent_substitution_of_the_authorised_tool_surface")
  );
});
