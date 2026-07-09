// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — Lane B blind-severity CHILD (plan Task 12; F5). Motto: AnthropicSafe First, then
// ReviewerSafe. Reads slip inputs {mr_id, base_id, mutated_text_digest} from stdin — and NOTHING
// else (not mechanism, not version, not slip-rate) — and emits a severity per slip from the pure
// blind-digest function. Blindness is enforced: the child refuses OPERATOR* env and any .pem argv.
import { blindSeverity, BLIND_SEVERITY_BASIS } from "../core/blindSeverity.mjs";

function guardBlindness() {
  for (const k of Object.keys(process.env))
    if (/^OPERATOR/i.test(k)) {
      process.stderr.write(JSON.stringify({ error: "operator_env_present", key: k }) + "\n");
      process.exit(3);
    }
  for (const a of process.argv.slice(2))
    if (/\.pem$/i.test(a)) {
      process.stderr.write(JSON.stringify({ error: "pem_argv_present", arg: a }) + "\n");
      process.exit(3);
    }
}

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (buf += d));
    process.stdin.on("end", () => resolve(buf));
  });
}

async function main() {
  guardBlindness();
  const input = JSON.parse((await readStdin()) || "{}");
  const slips = Array.isArray(input.slips) ? input.slips : [];
  const rows = slips
    .map((s) => ({
      mr_id: s.mr_id,
      base_id: s.base_id,
      mutated_text_digest: s.mutated_text_digest,
      severity: blindSeverity(s.mutated_text_digest),
      severity_basis: BLIND_SEVERITY_BASIS,
    }))
    .sort((a, b) => `${a.mr_id}|${a.base_id}`.localeCompare(`${b.mr_id}|${b.base_id}`));
  process.stdout.write(JSON.stringify({ rows }) + "\n");
}

main();
