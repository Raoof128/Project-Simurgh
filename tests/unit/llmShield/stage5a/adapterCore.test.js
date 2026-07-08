// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — adapterCore / pilot conformance (207). Plan Task 8. Motto: AnthropicSafe
// First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { checkAdaptation } from "../../../../tools/simurgh-attestation/stage5a/core/adapterCore.mjs";
import {
  makeVwaBundle,
  VWA_PUB,
} from "../../../../tools/simurgh-attestation/stage5a/node/greenBundle.mjs";

const RAW = Buffer.from("external-publisher-readout-export-bytes");
const sha = (b) => "sha256:" + createHash("sha256").update(b).digest("hex");
const LOSSINESS = ["salts", "self_report_derived", "ceremony"];

const adaptedBundle = () =>
  makeVwaBundle("pilot", {
    provenance: "adapter_derived",
    extraMapFields: { adapter_derived_fields: [...LOSSINESS] },
  });

const pilot = (over = {}) => ({
  content: {
    schema: "simurgh.vnc.pilot_adaptation.v1",
    external_export_id: "neuronpedia:gemma-2-2b:v1",
    source_digest: sha(RAW),
    adapter_version: "vnc.adapter.v1",
    adapter_role: "adapter",
    lossiness: [...LOSSINESS],
    ...over,
  },
});

test("clean adapted pilot → null (public), and audit with matching raw bytes → null", () => {
  const b = adaptedBundle();
  assert.equal(checkAdaptation(pilot(), b, { vwaPubKeyPem: VWA_PUB }), null);
  assert.equal(checkAdaptation(pilot(), b, { vwaPubKeyPem: VWA_PUB, rawExportBytes: RAW }), null);
});

test("207: adapted map fails 4Z public verify (wrong key)", () => {
  const b = adaptedBundle();
  const r = checkAdaptation(pilot(), b, { vwaPubKeyPem: b.narrative?.author_pub_key_pem ?? "bad" });
  assert.equal(r.raw, 207);
  assert.equal(r.reason, "adapted_map_verify_failed");
});

test("207: undeclared lossiness — a synthesized field the pilot did not declare", () => {
  const b = adaptedBundle();
  const r = checkAdaptation(pilot({ lossiness: ["salts", "ceremony"] }), b, {
    vwaPubKeyPem: VWA_PUB,
  });
  assert.equal(r.raw, 207);
  assert.equal(r.reason, "undeclared_lossiness");
});

test("207: audit — frozen raw bytes ≠ committed source digest", () => {
  const b = adaptedBundle();
  const r = checkAdaptation(pilot(), b, {
    vwaPubKeyPem: VWA_PUB,
    rawExportBytes: Buffer.from("tampered-bytes"),
  });
  assert.equal(r.raw, 207);
  assert.equal(r.reason, "source_digest_mismatch");
});
