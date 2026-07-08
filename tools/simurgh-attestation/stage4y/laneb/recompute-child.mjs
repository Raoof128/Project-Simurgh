// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR Lane B — BLIND recompute child (plan Task 11). Reads ONLY
// {document_path (a parent-made TEMP COPY), manifest, salt, provenance} over stdin, rebuilds
// the map, emits canonicalJson to stdout. It NEVER receives the committed map/audit nor
// OPERATOR_* env (blindness negatives). Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
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
  for (const forbidden of ["committed_map", "map_path", "audit_path", "ledger_path"])
    if (msg[forbidden] != null) {
      process.stderr.write(`blindness_violation:answer_supplied:${forbidden}\n`);
      process.exit(2);
    }
  const bytes = new Uint8Array(readFileSync(msg.document_path));
  const { map } = buildMap(bytes, msg.manifest ?? [], {
    salt: msg.salt,
    provenance: msg.provenance ?? "fixture",
  });
  process.stdout.write(canonicalJson(map) + "\n");
});
