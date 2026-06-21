// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../tools/simurgh-attestation/canonicalise.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3s";
const errors = [];
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const digest = await rd("digest/evidence-digest.json");
// Source-binding: source_inputs[].digest is a FILE-BYTE sha256 (sha256Hex of the bytes).
for (const s of digest.source_inputs) {
  let content;
  try {
    content = await readFile(s.path, "utf8");
  } catch {
    errors.push(`source missing: ${s.path}`);
    continue;
  }
  if (sha256Hex(content) !== s.digest) errors.push(`source digest mismatch: ${s.path}`);
}
const modelSlots = await rd("model-slots/model-slots.json");
const receipt = await rd("model-slots/gateway-receipt.json");
if (modelSlots.source.gateway_output_hash !== receipt.output_hash)
  errors.push("receipt-binding mismatch");
if (modelSlots.source.model_slots_digest !== sha256Hex(canonicalJson(modelSlots.slots)))
  errors.push("model_slots_digest mismatch");
const art = await rd("verified/verified-narrative-artifact.json");
if (art.evidence_digest_hash !== sha256Hex(canonicalJson(digest)))
  errors.push("artifact digest-binding mismatch");
if (errors.length) {
  console.error("stage3s consistency: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3s consistency: PASS");
