// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR Lane B — BLIND recompute child (plan Task 9). Reads ONLY {corpus_path, v1_digest,
// v2_digest} over stdin, imports the real frozen gate + ledger, recomputes, emits the canonical
// ledger to stdout. It never receives the committed ledger nor OPERATOR_* env (blindness negatives).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { computeLedgerFromLiveGate } from "../core/residueLedger.mjs";

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
  if (msg.ledger_path || msg.committed_ledger) {
    process.stderr.write("blindness_violation:committed_ledger_supplied\n");
    process.exit(2);
  }
  const corpus = JSON.parse(readFileSync(msg.corpus_path, "utf8"));
  const ledger = computeLedgerFromLiveGate(corpus);
  process.stdout.write(canonicalJson(ledger) + "\n");
});
