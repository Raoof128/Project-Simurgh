// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — Lane B ceremony PARENT (plan Task 11). Hands the child ONLY the inputs, then
// checks the child's independently-rebuilt ledger byte-equals the committed one; also runs the
// blindness negatives (operator env, forbidden answer-leaking keys). Motto: AnthropicSafe
// First, then ReviewerSafe.
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { buildGreenVncBundle } from "../node/greenBundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHILD = join(HERE, "recompute-child.mjs");

export function runChild(message, extraEnv = {}) {
  const res = spawnSync(process.execPath, [CHILD], {
    input: JSON.stringify(message),
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
  return { status: res.status, stdout: res.stdout ?? "" };
}

function childInputs(bundle) {
  return {
    narrative: bundle.narrative,
    vwa: bundle.vwa,
    claim_table: bundle.claim_table,
    provenance: bundle.ledger.content.provenance,
  };
}

export function runCeremony() {
  const bundle = buildGreenVncBundle({ conflict: true }); // a conflict-bearing ledger
  const message = childInputs(bundle);
  const positive = runChild(message);
  const match = positive.status === 0 && positive.stdout === canonicalJson(bundle.ledger);

  // Negative 1: an operator hint in the environment → the child refuses (exit 2).
  const envRefusal = runChild(message, { OPERATOR_HINT: "1" }).status === 2;
  // Negative 2: the message leaks the answer's identity → the child refuses (exit 2).
  const leakRefusal = runChild({ ...message, committed_ledger: bundle.ledger }).status === 2;

  return { match, envRefusal, leakRefusal };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = runCeremony();
  console.log(JSON.stringify(r));
  process.exit(r.match && r.envRefusal && r.leakRefusal ? 0 : 1);
}
