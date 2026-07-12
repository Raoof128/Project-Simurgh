// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — Node <-> Python parity over the frozen digest surface. The stdlib Python verifier must
// recompute byte-identical commitment_session_id / verified_anchor_set / start_capability_root against the
// committed Lane-A bundle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../../../../..");
const PY = join(ROOT, "tools/simurgh-attestation/stage5l/python/vtcq_parity.py");
const CASE = join(ROOT, "docs/research/llm-shield/evidence/stage-5l/lane-a/quorum-confirmed-stub");

test("Python parity returns raw 0 and byte-matches the Node bundle digests", () => {
  const out = JSON.parse(execFileSync("python3", [PY], { encoding: "utf8" }));
  assert.equal(out.raw, 0);
  const bundle = JSON.parse(readFileSync(join(CASE, "bundle.json"), "utf8"));
  assert.equal(
    out.commitment_session_id,
    bundle.commitment_session_id,
    "commitment_session_id parity"
  );
  assert.equal(
    out.start_capability_root_digest,
    bundle.review_access_authorisation_receipt.start_capability_root_digest,
    "start_capability_root parity"
  );
});
