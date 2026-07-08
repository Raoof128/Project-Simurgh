// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR Lane B — blind two-process recompute e2e (plan Task 11).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage4y/laneb/run-laneb-recompute-ceremony.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const CHILD = join(ROOT, "tools/simurgh-attestation/stage4y/laneb/recompute-child.mjs");

test("blind child recompute matches every committed non-withheld map", () => {
  const { ok, transcript } = runCeremony();
  assert.equal(ok, true, JSON.stringify(transcript.results.filter((r) => !r.match)));
  assert.equal(transcript.child_received_committed_map_path, false);
  assert.equal(transcript.child_read_evidence_dir, false);
  assert.equal(transcript.parent_computed_region_classes, false);
});

test("blindness negative: child refuses OPERATOR_* env (exit 2)", () => {
  const proc = spawnSync(process.execPath, [CHILD], {
    input: JSON.stringify({ document_path: "/dev/null", salt: "x" }),
    encoding: "utf8",
    env: { PATH: process.env.PATH, OPERATOR_SECRET: "leak" },
  });
  assert.equal(proc.status, 2);
  assert.match(proc.stderr, /blindness_violation:operator_env/);
});

test("blindness negative: child refuses a committed_map/answer key (exit 2)", () => {
  for (const key of ["committed_map", "map_path", "audit_path", "ledger_path"]) {
    const proc = spawnSync(process.execPath, [CHILD], {
      input: JSON.stringify({ document_path: "/dev/null", [key]: "answer" }),
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    });
    assert.equal(proc.status, 2, `should refuse ${key}`);
    assert.match(proc.stderr, /blindness_violation:answer_supplied/);
  }
});

test("child source never references the evidence directory (static scan)", () => {
  const src = readFileSync(CHILD, "utf8");
  assert.equal(/evidence\/stage-4y/.test(src), false, "child must not read committed evidence");
});
