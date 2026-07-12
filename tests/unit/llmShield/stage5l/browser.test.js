// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — browser (WebCrypto) parity + honest claim boundary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  recomputeCommitmentSessionId,
  BROWSER_CLAIM,
  BROWSER_NON_CLAIM,
} from "../../../../tools/simurgh-attestation/stage5l/browser/vtcq-portable.mjs";

const ROOT = join(fileURLToPath(import.meta.url), "../../../../..");
const CASE = join(ROOT, "docs/research/llm-shield/evidence/stage-5l/lane-a/quorum-confirmed-stub");

test("browser WebCrypto recomputes the same commitment_session_id as the Node core", async () => {
  const bundle = JSON.parse(readFileSync(join(CASE, "bundle.json"), "utf8"));
  const recomputed = await recomputeCommitmentSessionId(bundle);
  assert.equal(recomputed, bundle.commitment_session_id);
});

test("browser tier makes only the bounded claim (never independent RFC-3161)", () => {
  assert.equal(BROWSER_CLAIM, "adapter-attestation and structural binding verified");
  assert.notEqual(BROWSER_CLAIM, BROWSER_NON_CLAIM);
});
