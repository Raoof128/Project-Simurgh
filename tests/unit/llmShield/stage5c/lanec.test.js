// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — Lane C adapter (plan Task 13; F8). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  flaggedAdapter,
  validateLaneCBinding,
  LANE_C_KIND,
} from "../../../../tools/simurgh-attestation/stage5c/lanec/detectorAdapter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ADAPTER = join(
  HERE,
  "..",
  "..",
  "..",
  "..",
  "tools/simurgh-attestation/stage5c/lanec/detectorAdapter.mjs"
);

test("flaggedAdapter coerces a BYO detector to a strict boolean", () => {
  assert.equal(
    flaggedAdapter((t) => t.includes("x"), "axb"),
    true
  );
  assert.equal(
    flaggedAdapter(() => 1, "y"),
    false
  ); // non-boolean truthy → false (strict)
});

test("validateLaneCBinding: absent is legal; external_detector needs all fields", () => {
  assert.equal(validateLaneCBinding(null), null);
  assert.equal(validateLaneCBinding({ kind: "var_capture_1b" }).error, "bad_kind");
  const good = {
    kind: LANE_C_KIND,
    detector_id: "prompt-guard",
    detector_version: "86m",
    threshold: 0.5,
    base_corpus_digest: "sha256:aa",
    verdict_log_digest: "sha256:bb",
    audit_private_log_digest: "sha256:cc",
  };
  assert.equal(validateLaneCBinding(good), null);
  const { audit_private_log_digest, ...missing } = good;
  assert.equal(validateLaneCBinding(missing).field, "audit_private_log_digest");
});

test("CI boundary: the adapter has no IMPORT of torch/transformers (F8)", () => {
  const src = readFileSync(ADAPTER, "utf8");
  // Only import/require statements count — prose in comments is allowed to name the deps.
  assert.ok(
    !/^\s*(import|const|let|var)\b.*\b(torch|transformers|onnxruntime)\b/m.test(src),
    "adapter must not import heavy ML deps in CI"
  );
});
