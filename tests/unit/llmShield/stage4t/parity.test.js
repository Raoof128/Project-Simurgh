// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC JS-Python parity (non-signature, non-engine-rerun). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildLaneAFixtures } from "../../../../tools/simurgh-attestation/stage4t/node/build-stage4t-fixtures.mjs";
import { evaluateCapsuleSafe } from "../../../../tools/simurgh-attestation/stage4t/core/capsuleCore.mjs";
import {
  buildGreenBundle,
  STAGE_VERIFIERS,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

const PY = "tools/simurgh-attestation/stage4t/python/vic_parity.py";
// Excluded from parity: 134 (Ed25519 signature) and 146 (cross-stage engine rerun) —
// both out of the public-tier decision core the Python mirror implements.
const EXCLUDE = new Set([134, 146]);

function python3Available() {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test("JS and Python agree on every non-signature, non-engine-rerun fixture", (t) => {
  if (!python3Available()) {
    t.skip("python3 not available");
    return;
  }
  const { pubKeyPem } = buildGreenBundle();
  const dir = mkdtempSync(join(tmpdir(), "vic-parity-"));
  for (const f of buildLaneAFixtures()) {
    if (EXCLUDE.has(f.expected_raw)) continue;
    const jsRaw = evaluateCapsuleSafe(f.bundle, {
      capsulePubKeyPem: pubKeyPem,
      stageVerifiers: STAGE_VERIFIERS,
      ...f.evalOpts,
    }).raw;
    const casePath = join(dir, `${f.name}.json`);
    writeFileSync(casePath, JSON.stringify({ bundle: f.bundle, eval_opts: f.evalOpts }));
    const pyRaw = Number(execFileSync("python3", [PY, casePath], { encoding: "utf8" }).trim());
    assert.equal(pyRaw, jsRaw, `${f.name}: JS ${jsRaw} vs Python ${pyRaw}`);
  }
});
