// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SH = "scripts/reproduce-llm-shield-stage4-authority-chain.sh";
const PY = "scripts/lib/stage4_authority_chain_check.py";

test("[stage-4] reproduce script + checker exist and are executable", () => {
  for (const f of [SH, PY]) {
    assert.ok(existsSync(f), `${f} missing`);
    assert.ok((statSync(f).mode & 0o100) !== 0, `${f} not user-executable`);
  }
});

test("[stage-4] reproduce script is strict-mode and offline (no network)", () => {
  const src = readFileSync(SH, "utf8");
  assert.match(src, /^#!\/usr\/bin\/env bash/, "missing bash shebang");
  assert.match(src, /set -euo pipefail/, "missing strict mode");
  assert.doesNotMatch(src, /\b(curl|wget|nc|ssh|npm install|pip install)\b/, "script must stay offline");
  assert.doesNotMatch(src, /ed25519\.pem/, "script must never read a private key");
  assert.match(src, /reproduction: PASS/, "script must end in a PASS sentinel");
});

test("[stage-4] checker is stdlib-only and read-only (no evidence writes)", () => {
  const src = readFileSync(PY, "utf8");
  assert.doesNotMatch(src, /\b(requests|urllib|httpx|socket)\b/, "checker must not do network I/O");
  assert.doesNotMatch(src, /\.write_text\(|open\([^)]*['"]w/, "checker must not write evidence");
});

test("[stage-4] reproduce script runs green end-to-end (offline, public keys only)", () => {
  let out;
  try {
    out = execFileSync("bash", [SH], { encoding: "utf8", timeout: 120000 });
  } catch (e) {
    assert.fail(`reproduce script failed (exit ${e.status}):\n${e.stdout || ""}\n${e.stderr || ""}`);
  }
  assert.match(out, /STAGE-4 CHAIN CHECK: ALL PASSED/, "python chain check did not pass");
  assert.match(out, /signed bundles: 3\/3 verify/, "signed-bundle reproduce-verify did not pass");
  assert.match(out, /Stage-4 authority chain reproduction: PASS/, "final PASS sentinel missing");
});
