// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — REAL Lane C capture lock (plan Task 2 closeout). Loads the committed
// frozen_capture from the byte-stable Llama-3.2-1B-Instruct capture run on commodity CPU
// (Apple M2, 8GB, float32, offline from cache — captured twice, cmp-identical) and asserts it
// reconciles to the sealed ceremony root and validates. This locks the real capture as the
// grounding substrate for the red-team. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { frozenCaptureRoot } from "../../../../tools/simurgh-attestation/stage5b/core/captureBinding.mjs";
import { validateCeremony } from "../../../../tools/simurgh-attestation/stage5b/lanec/ceremonyCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..", "..", "..", "..", "docs/research/llm-shield/evidence/stage-5b/lanec");
const fc = JSON.parse(readFileSync(join(EVID, "frozen_capture.json"), "utf8"));
const ceremony = JSON.parse(readFileSync(join(EVID, "ceremony.json"), "utf8")).ceremony;

test("the real capture sealed a `captured` outcome on the pinned 1B model", () => {
  assert.equal(ceremony.outcome, "captured");
  assert.equal(ceremony.model_id, "meta-llama/Llama-3.2-1B-Instruct");
  assert.equal(ceremony.position_rule_id, "all_positions");
  assert.equal(validateCeremony(ceremony), null);
});

test("the committed frozen_capture reconciles to the sealed capture_root (No Author's Map)", () => {
  const root = frozenCaptureRoot(fc);
  const sealed = JSON.parse(readFileSync(join(EVID, "ceremony.json"), "utf8")).capture_root;
  assert.equal(root, sealed);
  assert.equal(root, "sha256:ad766ed33568c1469b1d118f736e8aa8d70c42854f8e9a4093bc0a23ac1b8964");
});

test("the real capture carries activation + lens tensors (18 committed)", () => {
  const keys = Object.keys(fc.tensors_b64);
  assert.equal(keys.length, 18);
  assert.ok(
    keys.some((k) => k.startsWith("act:")),
    "has activation tensors"
  );
  assert.ok(
    keys.some((k) => k.startsWith("lens:")),
    "has lens VJP rows"
  );
  assert.equal(Object.keys(fc.commitments).length, 18);
});
