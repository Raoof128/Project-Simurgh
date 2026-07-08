// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — JS↔Python parity over the deterministic surface (plan Task 12). Digest
// preflight (claim table + narrative), then full ledger-content equality over the honestly
// rebuildable fixtures (clean/pilot/rcp — tampers deliberately diverge). Motto: AnthropicSafe
// First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  canonicalJson,
  recordDigest,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildFixtures } from "../../../../tools/simurgh-attestation/stage5a/node/build-stage5a-fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PY = join(
  HERE,
  "..",
  "..",
  "..",
  "..",
  "tools/simurgh-attestation/stage5a/python/vnc_parity.py"
);

const py = (mode, arg) => {
  const r = spawnSync("python3", [PY, mode, arg], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

const rebuildable = buildFixtures().filter((f) => ["clean", "pilot", "rcp"].includes(f.set));

test("Python is available for the parity check", () => {
  const r = spawnSync("python3", ["--version"], { encoding: "utf8" });
  assert.equal(r.status, 0, "python3 must be installed for parity");
});

for (const fx of rebuildable) {
  test(`parity ${fx.id}: digests + full ledger content match JS byte-for-byte`, () => {
    const file = join(tmpdir(), `vnc-parity-${fx.id}.json`);
    writeFileSync(file, canonicalJson(fx.bundle));
    // digest preflight
    assert.equal(py("claim_digest", file), recordDigest(fx.bundle.claim_table), "claim digest");
    assert.equal(
      py("narrative_digest", file),
      recordDigest(fx.bundle.narrative),
      "narrative digest"
    );
    // full ledger-content equality (signature excluded — Node authoritative)
    assert.equal(py("ledger", file), canonicalJson(fx.bundle.ledger.content), "ledger content");
  });
}
