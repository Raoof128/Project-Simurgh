// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR — JS↔Python parity (plan Task 11). Implementation parity of the gate + ledger,
// NOT signature parity (Ed25519 stays Node-authoritative).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { computeLedgerFromLiveGate } from "../../../../tools/simurgh-attestation/stage4x/core/residueLedger.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PARITY = join(ROOT, "tools/simurgh-attestation/stage4x/python/vlr_parity.py");
const CORPUS = join(ROOT, "docs/research/llm-shield/evidence/stage-4x/corpus.json");

function python() {
  for (const bin of ["python3", "python"]) {
    const r = spawnSync(bin, [PARITY, CORPUS], { encoding: "utf8" });
    if (r.status === 0) return JSON.parse(r.stdout);
    if (r.error && r.error.code === "ENOENT") continue;
    throw new Error(`python parity failed: ${r.stderr || r.stdout}`);
  }
  return null; // python not installed — skip
}

test("Python parity reproduces the JS ledger over the corpus", () => {
  const py = python();
  if (!py) return; // environment without python; Lane A JS is authoritative
  const corpus = JSON.parse(readFileSync(CORPUS, "utf8"));
  const js = computeLedgerFromLiveGate(corpus);
  for (const k of [
    "per_item_outcomes",
    "v1",
    "v2",
    "metamorphic_slip_rate_v1",
    "metamorphic_slip_rate_v2",
    "catch_rate_v1",
    "catch_rate_v2",
    "residue_delta",
    "per_family",
    "monotone",
  ])
    assert.equal(canonicalJson(py[k]), canonicalJson(js[k]), `parity diverges on ${k}`);
});
