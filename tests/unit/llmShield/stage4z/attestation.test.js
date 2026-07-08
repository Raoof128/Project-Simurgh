// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — verify CLI over the committed evidence at both tiers (plan Task 9).
import test from "node:test";
import assert from "node:assert/strict";
import { verify } from "../../../../tools/simurgh-attestation/stage4z/node/verify-stage4z-attestation.mjs";

test("verify --tier public: every fixture reaches its expected public code", () => {
  const { ok, results } = verify({ tier: "public" });
  assert.ok(ok, JSON.stringify(results.filter((r) => !r.ok)));
});

test("verify --tier audit: tamper targets caught, withheld skipped", () => {
  const { ok, results } = verify({ tier: "audit" });
  assert.ok(ok, JSON.stringify(results.filter((r) => !r.ok)));
  const withheld = results.find((r) => r.id === "withheld_tensors");
  assert.equal(withheld.got, "SKIPPED");
});
