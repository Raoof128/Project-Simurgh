import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script = readFileSync(new URL("../../../scripts/check.sh", import.meta.url), "utf8");
const start = script.indexOf("run_step() {");
assert.notEqual(start, -1, "the maintained launcher must exist");
const end = script.indexOf("\n}\n", start);
assert.notEqual(end, -1, "the complete launcher body must be present");
const runStep = script.slice(start, end + 3);

for (const verbose of [false, true]) {
  test(`check command retains selected runtime when verbose=${verbose}`, () => {
    const scratch = mkdtempSync(join(tmpdir(), "simurgh-runtime-env-"));
    try {
      const bin = join(scratch, "bin");
      const logs = join(scratch, "logs");
      mkdirSync(bin);
      mkdirSync(logs);
      writeFileSync(join(bin, "simurgh_runtime_probe"), "#!/bin/sh\necho selected-runtime\n", {
        mode: 0o755,
      });
      // Model a login profile replacing the caller's PATH. Ordinary command shells
      // must retain the runtime selected by the surrounding validation job.
      const startup = join(scratch, "startup.sh");
      writeFileSync(startup, "if shopt -q login_shell; then export PATH=/usr/bin:/bin; fi\n");
      const result = spawnSync(
        "bash",
        [
          "-c",
          `set -euo pipefail
VERBOSE=${verbose}
YELLOW='' NC=''
pass() { printf '%s\\n' "passed: $1"; }
fail() { printf '%s\\n' "failed: $1"; exit 1; }
${runStep}
run_step runtime  'simurgh_runtime_probe'
`,
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            BASH_ENV: startup,
            LOG_DIR: logs,
            PATH: `${bin}:${process.env.PATH}`,
          },
          timeout: 10000,
        }
      );
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /passed: runtime/);
      assert.equal(readFileSync(join(logs, "runtime.log"), "utf8"), "selected-runtime\n");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
}

for (const verbose of [false, true]) {
  test(`check logs are uploadable and preserve failure details when verbose=${verbose}`, () => {
    const scratch = mkdtempSync(join(tmpdir(), "simurgh-log-name-"));
    try {
      const result = spawnSync(
        "bash",
        [
          "-c",
          `
set -euo pipefail
VERBOSE=${verbose}
YELLOW='' NC=''
pass() { echo "unexpected pass"; }
fail() { echo "failed: $1"; }
${runStep}
run_step 'prettier --check (npm run format:check)' 'printf "not ok 1 - browser parity\\n  error: original-browser-diagnostic\\n"; seq 1 80; exit 7'
`,
        ],
        { encoding: "utf8", env: { ...process.env, LOG_DIR: scratch } }
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /failed: prettier/);
      assert.doesNotMatch(result.stdout, /unexpected pass/);
      assert.match(result.stdout, /original-browser-diagnostic/);
      const logs = readdirSync(scratch);
      assert.equal(logs.length, 1);
      assert.match(logs[0], /^[A-Za-z0-9_.-]+$/);
      assert.match(readFileSync(join(scratch, logs[0]), "utf8"), /original-browser-diagnostic/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
}
