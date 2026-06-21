// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Q consistency: registry derivable from manifest; manifest digest bound;
// self-proof clean + zero laundering; registry signature is the 3Q schema.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { deriveRegistry, buildSelfProof } from "../tools/simurgh-temporal/registry.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const errors = [];

const committed = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
const { registry, manifestDigest } = await deriveRegistry();
if (stable(committed) !== stable(registry)) errors.push("registry not derivable from manifest");
if (committed.source.timeline_manifest_digest !== manifestDigest) errors.push("manifest digest not bound");

const sidecar = JSON.parse(await readFile(join(EV, "registry", "registry.signature.json"), "utf8"));
if (sidecar.schema !== "simurgh.temporal.signature.v1") errors.push("registry signature wrong schema");
if (sidecar.algorithm !== "Ed25519") errors.push("registry not Ed25519");

const sp = buildSelfProof();
if (!sp.summary.clean_baseline_passed) errors.push("self-proof clean baseline failed");
if (!sp.summary.all_expected_detectors_fired) errors.push("self-proof detector miss");
if (sp.summary.integrity_laundering_successes !== 0) errors.push("integrity laundering succeeded");

if (errors.length > 0) {
  console.error("stage3q consistency: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3q consistency: PASS");
