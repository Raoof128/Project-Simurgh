// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gateToolCall,
  receiptDigest,
} from "../../../../tools/simurgh-attestation/stage4o/core/decisionCore.mjs";
import { surfacePath } from "../../../../tools/simurgh-attestation/stage4o/core/merkleSurface.mjs";
import { toolEntryDigest } from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import {
  RECEIPT_SCHEMA,
  DOMAINS,
} from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage4o/core/digest.mjs";
import { mkEntry, mkManifest, mkEnvelope, validWorld } from "./helpers.mjs";

const sigOK = () => true;
const sigBAD = () => false;
const world = validWorld;

test("GREEN: accepted with complete six-field bindings", () => {
  const w = world();
  const out = gateToolCall({ ...w, verifyCommitmentSignature: sigOK });
  assert.equal(out.raw, 0);
  assert.equal(out.bindings.kernel_entrypoint, "authorise_with_manifest.v1");
  assert.deepEqual(Object.keys(out.bindings).sort(), [
    "action_digest",
    "kernel_entrypoint",
    "manifest_digest",
    "manifest_entry_digest",
    "receipt_digest",
    "run_id_digest",
  ]);
  assert.equal(out.bindings.receipt_digest, receiptDigest(w.receipt));
});

test("55 absent / 55 schema_invalid / 56 / 57 / 59 identity / 59 proof / 60 / 61 / 62 / 63", () => {
  const w = world();
  assert.equal(
    gateToolCall({
      chain: null,
      receipt: w.receipt,
      actionDigest: w.actionDigest,
      verifyCommitmentSignature: sigOK,
    }).raw,
    55
  );
  const badHead = [{ ...w.chain[0], extra: 1 }, w.chain[1]];
  const r55 = gateToolCall({
    chain: badHead,
    receipt: w.receipt,
    actionDigest: w.actionDigest,
    verifyCommitmentSignature: sigOK,
  });
  assert.deepEqual({ raw: r55.raw, reason: r55.reason }, { raw: 55, reason: "schema_invalid" });
  assert.equal(gateToolCall({ ...w, verifyCommitmentSignature: sigBAD }).raw, 56);
  const stale = { ...w.receipt, run_epoch: 999 };
  assert.equal(gateToolCall({ ...w, receipt: stale, verifyCommitmentSignature: sigOK }).raw, 57);
  const ghost = { ...w.receipt, tool_name_digest: mkEntry(9).tool_name_digest };
  assert.equal(gateToolCall({ ...w, receipt: ghost, verifyCommitmentSignature: sigOK }).raw, 59);
  const badProof = { ...w.receipt, inclusion_proof: [] };
  assert.equal(gateToolCall({ ...w, receipt: badProof, verifyCommitmentSignature: sigOK }).raw, 59);
  const badSchema = { ...w.receipt, tool_schema_digest: mkEntry(9).tool_schema_digest };
  assert.equal(
    gateToolCall({ ...w, receipt: badSchema, verifyCommitmentSignature: sigOK }).raw,
    60
  );
  const upgraded = { ...w.receipt, authority_class: "write" };
  assert.equal(gateToolCall({ ...w, receipt: upgraded, verifyCommitmentSignature: sigOK }).raw, 61);
  const sink = { ...w.receipt, sinks_used: [mkEntry(9).tool_schema_digest] };
  assert.equal(gateToolCall({ ...w, receipt: sink, verifyCommitmentSignature: sigOK }).raw, 62);
  const malformed = { ...w.receipt };
  delete malformed.run_id_digest;
  assert.equal(
    gateToolCall({ ...w, receipt: malformed, verifyCommitmentSignature: sigOK }).raw,
    63
  );
});

test("58 in isolation: single genesis envelope, valid-format but wrong toolset root", () => {
  const m0 = mkManifest([mkEntry(1), mkEntry(2)]);
  const idx = m0.tools.findIndex((t) => t.tool_name_digest === mkEntry(1).tool_name_digest);
  const receipt = {
    schema: RECEIPT_SCHEMA,
    tool_name_digest: m0.tools[idx].tool_name_digest,
    tool_schema_digest: m0.tools[idx].tool_schema_digest,
    authority_class: m0.tools[idx].authority_class,
    sinks_used: [],
    inclusion_proof: surfacePath(m0.tools.map(toolEntryDigest), idx),
    run_epoch: 5,
    run_id_digest: domainDigest(DOMAINS.RECEIPT, "run", "g"),
  };
  const tampered = { ...m0, toolset_digest: "sha256:" + "d".repeat(64) };
  const env = mkEnvelope(tampered, 0, null, "state");
  const out = gateToolCall({
    chain: [env],
    receipt,
    actionDigest: domainDigest(DOMAINS.ACTION, "a", { x: 1 }),
    verifyCommitmentSignature: sigOK,
  });
  assert.equal(out.raw, 58);
  assert.equal(out.reason, "toolset_root_recompute_mismatch");
});

test("first failure wins in DOCUMENTED order: bad signature + authority upgrade => 56", () => {
  const w = world();
  const upgraded = { ...w.receipt, authority_class: "destructive" };
  assert.equal(
    gateToolCall({ ...w, receipt: upgraded, verifyCommitmentSignature: sigBAD }).raw,
    56
  );
});
