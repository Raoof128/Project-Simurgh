// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — Lane B blind recompute ceremony (plan Task 12). Motto: AnthropicSafe First,
// then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage5b/laneb/run-laneb-var-ceremony.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const CHILD = join(ROOT, "tools/simurgh-attestation/stage5b/laneb/recompute-child.mjs");
const bundle = JSON.parse(
  readFileSync(join(ROOT, "docs/research/llm-shield/evidence/stage-5b/attestation.json"), "utf8")
);

test("blind child recompute equals the committed aggregates (ASR 0/46)", () => {
  const out = runCeremony(bundle);
  assert.equal(out.asr, bundle.attestation.aggregates.asr);
  assert.equal(out.asr, "0/46");
  assert.deepEqual(out.aggregates, bundle.attestation.aggregates);
});

test("child exits 2 on an OPERATOR_* leakage channel", () => {
  const dir = mkdtempSync(join(tmpdir(), "var-laneb-neg-"));
  const f = join(dir, "findings.json");
  writeFileSync(f, JSON.stringify({ findings: bundle.findings, floors: bundle.floors }));
  let code = 0;
  try {
    execFileSync(process.execPath, [CHILD, f], {
      env: { PATH: process.env.PATH, OPERATOR_HINT: "0/46" },
    });
  } catch (e) {
    code = e.status;
  }
  assert.equal(code, 2);
});

test("child exits 2 when a forbidden hint path is passed", () => {
  let code = 0;
  try {
    execFileSync(process.execPath, [CHILD, "some/expected_raw/leak.json"], {
      env: { PATH: process.env.PATH },
    });
  } catch (e) {
    code = e.status;
  }
  assert.equal(code, 2);
});
