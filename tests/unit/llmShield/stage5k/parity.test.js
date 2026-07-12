// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — Node <-> Python parity over the deterministic surface. The stdlib-only Python verifier
// must recompute byte-identical universe_root / commitment_digest / U-set digests against the committed
// pack, and agree with the Node bundle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../../../../..");
const PY = join(ROOT, "tools/simurgh-attestation/stage5k/python/vuc_parity.py");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5k");

test("Python parity returns raw 0 and byte-matches the Node bundle roots", () => {
  const out = JSON.parse(execFileSync("python3", [PY], { encoding: "utf8" }));
  assert.equal(out.raw, 0);
  const bundle = JSON.parse(readFileSync(join(EVID, "bundle.json"), "utf8"));
  const uc = bundle.universe_commitment;
  assert.equal(out.universe_root, uc.universe_root, "universe_root parity");
  assert.equal(
    out.universe_commitment_digest,
    uc.universe_commitment_digest,
    "commitment digest parity"
  );
  const bij = bundle.projections.bijection_census;
  assert.equal(out.u_commit, bij.commit);
  assert.equal(out.u_vpc, bij.vpc);
  assert.equal(out.u_vrc, bij.vrc);
  assert.equal(out.u_commit, out.u_vpc);
  assert.equal(out.u_commit, out.u_vrc);
});
