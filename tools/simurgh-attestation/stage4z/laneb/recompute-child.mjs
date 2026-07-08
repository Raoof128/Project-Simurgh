// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA Lane B — BLIND recompute child (plan Task 10). Reads ONLY the capture-input
// set over stdin { declaration, tensors, salts, self_report, provenance } — everything the
// map is a pure function of EXCEPT the answer — rebuilds the map, emits canonicalJson to
// stdout. It NEVER receives the committed map/audit, nor OPERATOR_* env (blindness negatives).
// self_report and salts are INPUTS (a claim / a nonce are not the answer). Motto: AnthropicSafe
// First, then ReviewerSafe.
import { Buffer } from "node:buffer";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { buildMap } from "../core/mapCore.mjs";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  // Blindness self-check: refuse if the operator leaked privileged env into this process.
  const leaked = Object.keys(process.env).filter((k) => /^OPERATOR_/.test(k));
  if (leaked.length) {
    process.stderr.write(`blindness_violation:operator_env:${leaked.join(",")}\n`);
    process.exit(2);
  }
  const msg = JSON.parse(input);
  // Refuse the ANSWER: the committed map/audit must never be supplied to a blind child.
  for (const forbidden of ["committed_map", "map", "map_path", "audit", "audit_path"])
    if (msg[forbidden] != null) {
      process.stderr.write(`blindness_violation:answer_supplied:${forbidden}\n`);
      process.exit(2);
    }
  // Reconstruct the per-tensor byte maps from the flat prefixed tensor table.
  const activations = {};
  const lensRows = {};
  for (const [k, bytes] of Object.entries(msg.tensors)) {
    if (k.startsWith("act:")) activations[k.slice(4)] = Buffer.from(bytes);
    else if (k.startsWith("lens:")) lensRows[k.slice(5)] = Buffer.from(bytes);
  }
  const { map } = buildMap({
    declaration: msg.declaration,
    activations,
    lensRows,
    saltFor: (key) => msg.salts[key],
    selfReport: msg.self_report,
    provenance: msg.provenance ?? "fixture",
  });
  process.stdout.write(canonicalJson(map) + "\n");
});
