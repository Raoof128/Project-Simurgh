// SPDX-License-Identifier: AGPL-3.0-or-later
// Guard: every maintained CLI entry point still runs when launched through an aliased path.
//
// `import.meta.url` is the loader's real, percent-encoded path; `process.argv[1]` is whatever the
// shell passed. Compared as text, a verifier launched through a symlinked directory (`/tmp` on
// macOS) or a path with a space never entered its main block and exited 0 printing nothing — a
// silent false green for anyone verifying from such a checkout (audit C-1, 31 October 2026).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const MAINTAINED = [
  "tools/simurgh-attestation/build-3w-witness.mjs",
  "tools/simurgh-attestation/build-3x-timeline.mjs",
  "tools/simurgh-attestation/verify-stage3p-catalogue.mjs",
  "tools/simurgh-attestation/verify-stage3v-external-defense.mjs",
  "tools/simurgh-attestation/verify-attestation.mjs",
  "tools/simurgh-attestation/verify-stage3w-witness.mjs",
  "tools/simurgh-attestation/verify-stage3p-target.mjs",
  "tools/simurgh-attestation/verify-stage3vb-external-defense.mjs",
  "tools/simurgh-attestation/verify-stage3x-timeline.mjs",
  "tools/simurgh-attestation/verify-stage5s-attestation.mjs",
  "scripts/check-lean-proofs.mjs",
  "scripts/assert-stage3l-feedable-inputs.mjs",
  "scripts/assert-stage3vb-capture-integrity.mjs",
  "scripts/check-browser-parity.mjs",
  "scripts/offline-audit-llm-shield-stage4h.mjs",
  "scripts/lib/currentReproduceSet.mjs",
  "scripts/lib/priorReproduceSet.mjs",
  "tools/simurgh-explorer/index.mjs",
  "tools/simurgh-explorer/serve.mjs",
];

for (const file of MAINTAINED) {
  test(`${file} resolves both sides of its main-module guard to the physical path`, () => {
    const text = readFileSync(file, "utf8");
    assert.match(text, /realpathSync\(process\.argv\[1\]\) === fileURLToPath\(moduleUrl\)/);
    assert.match(text, /isMainModule\(import\.meta\.url\)/);
    assert.doesNotMatch(text, /import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`/);
  });
}

test("verify-attestation.mjs launched through a symlinked path with a space still runs", () => {
  const scratch = mkdtempSync(join(tmpdir(), "simurgh entry guard "));
  try {
    const alias = join(scratch, "repo link");
    symlinkSync(process.cwd(), alias);
    const run = (root) =>
      spawnSync(
        process.execPath,
        [join(root, "tools/simurgh-attestation/verify-attestation.mjs")],
        {
          encoding: "utf8",
        }
      );
    const real = run(process.cwd());
    const aliased = run(alias);
    // With no arguments the verifier must fail loudly through either path, never exit 0 silently.
    assert.notEqual(real.status, 0);
    assert.equal(aliased.status, real.status, "exit code differs through the alias");
    assert.ok((aliased.stdout + aliased.stderr).trim().length > 0, "the alias run printed nothing");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
