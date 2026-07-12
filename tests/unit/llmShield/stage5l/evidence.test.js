// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — Lane-A evidence is byte-stable + the committed pack verifies via the CLI helper.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage5l/core/digests.mjs";
import { buildEvidence } from "../../../../tools/simurgh-attestation/stage5l/node/build-vtcq-evidence.mjs";
import { verifyCaseDir } from "../../../../tools/simurgh-attestation/stage5l/node/verify-vtcq-attestation.mjs";

test("evidence build is byte-identical across two runs (no disk write)", () => {
  const a = buildEvidence({ write: false });
  const b = buildEvidence({ write: false });
  assert.equal(canonicalJson(a), canonicalJson(b));
});

test("committed Lane-A quorum-confirmed pack verifies public+audit raw 0", () => {
  const base = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../docs/research/llm-shield/evidence/stage-5l/lane-a/quorum-confirmed-stub"
  );
  const res = verifyCaseDir(base);
  assert.equal(res.public.raw, 0);
  assert.equal(res.audit.raw, 0);
});

test("committed core-positive pack verifies raw 0", () => {
  const base = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../docs/research/llm-shield/evidence/stage-5l/lane-a/core-positive"
  );
  assert.equal(verifyCaseDir(base).public.raw, 0);
});
