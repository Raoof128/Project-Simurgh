// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S JS<->Python parity (4S spec §16). The Python kernel reimplements the
// post-signature math layers; it agrees with the JS core on the raw code for every
// fixture EXCEPT the 101 signature case (Python has no Ed25519, by the zero-deps
// rule). Signature fixtures remain JS-only.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateChainSafe } from "../../../../tools/simurgh-attestation/stage4s/core/chainCore.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const FIX = join(ROOT, "docs/research/llm-shield/evidence/stage-4s/fixtures");
const KERNEL = join(ROOT, "tools/simurgh-attestation/stage4s/python/vdcc_kernel.py");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

test("python kernel agrees with the JS core on every non-signature fixture", () => {
  const index = readJson(join(FIX, "corpus-index.json"));
  const out = execFileSync("python3", [KERNEL, "verify", join(FIX, "corpus-index.json")], {
    encoding: "utf8",
  });
  const pyByName = new Map();
  for (const line of out.trim().split("\n")) {
    const { name, raw } = JSON.parse(line);
    pyByName.set(name, raw);
  }
  for (const c of index.cases) {
    if (c.expected_raw === 101) continue; // signature fixture: JS-only (no stdlib Ed25519)
    const bundle = readJson(join(FIX, c.file));
    const jsRaw = evaluateChainSafe(bundle).raw;
    assert.equal(pyByName.get(c.name), jsRaw, `parity for ${c.name}`);
  }
});
