// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — JS<->Python parity (plan Task 12). Digest preflight gates the map compare.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { v1RulesetDigest } from "../../../../tools/simurgh-attestation/stage4x/core/corpusCore.mjs";
import { v2Digest } from "../../../../tools/simurgh-attestation/stage4x/core/gateV2.mjs";
import { metamorphicTableDigest } from "../../../../tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4y");
const PY = join(ROOT, "tools/simurgh-attestation/stage4y/python/vdr_parity.py");
const python = process.env.PYTHON || "python3";
const have = spawnSync(python, ["--version"], { encoding: "utf8" }).status === 0;
const run = (args) => spawnSync(python, [PY, ...args], { encoding: "utf8" });
const rd = (name) => JSON.parse(readFileSync(join(EVID, name), "utf8"));

test(
  "digest preflight: Python's ported v1/v2/MR digests equal the JS frozen block",
  { skip: !have },
  () => {
    const out = JSON.parse(run(["digests"]).stdout);
    assert.equal(out.v1_ruleset_digest, v1RulesetDigest());
    assert.equal(out.v2_digest, v2Digest());
    assert.equal(out.metamorphic_table_digest, metamorphicTableDigest());
  }
);

test(
  "full-map parity: Python map byte-equals JS canonicalJson map over all non-withheld fixtures",
  { skip: !have },
  () => {
    const index = rd("index.json").fixtures.filter((f) => f.set !== "withheld");
    for (const fx of index) {
      const docPath = join(EVID, `${fx.id}.document.txt`);
      if (!existsSync(docPath)) continue;
      const audit = rd(`${fx.id}.audit.json`);
      const committed = canonicalJson(rd(`${fx.id}.map.json`));
      const res = run([
        "map",
        docPath,
        audit.commitment_salt,
        JSON.stringify(audit.redaction_manifest),
        ROOT,
      ]);
      assert.equal(res.status, 0, `python failed for ${fx.id}: ${res.stderr}`);
      assert.equal(res.stdout.trim(), committed, `map divergence on ${fx.id}`);
    }
  }
);
