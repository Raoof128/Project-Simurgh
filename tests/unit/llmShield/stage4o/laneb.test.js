// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyDrift,
  validateChain,
} from "../../../../tools/simurgh-attestation/stage4o/core/driftCore.mjs";
import { validateManifest } from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import { mkEnvelope } from "./helpers.mjs";

const LANEB = "tests/fixtures/llmShield/stage4o/laneb";
const capture = JSON.parse(readFileSync(`${LANEB}/capture-manifest.json`, "utf8"));
const rugpulled = JSON.parse(readFileSync(`${LANEB}/capture-rugpulled.json`, "utf8"));

test("both captured fixtures are valid digest-only manifests marked external-validity", () => {
  assert.equal(capture.external_validity, true);
  assert.equal(rugpulled.external_validity, true);
  assert.deepEqual(validateManifest(capture.manifest), { ok: true });
  assert.deepEqual(validateManifest(rugpulled.manifest), { ok: true });
});

test("the rug pull is a broadening, and a state-bound re-approval ledgers raw 65", () => {
  assert.equal(classifyDrift(capture.manifest, rugpulled.manifest), "broadening");
  const e0 = mkEnvelope(capture.manifest, 0, null, "state");
  const e1 = mkEnvelope(rugpulled.manifest, 1, e0, "state");
  assert.deepEqual(validateChain([e0, e1]), {
    ok: false,
    raw: 65,
    reason: "state_bound_broadening",
  });
});

test("egress guard: the fixtures carry only digests and closed enums, no raw tool text", () => {
  const ALLOWED = new Set([
    "simurgh.tool_manifest.v1",
    "read_only",
    "write",
    "egress",
    "destructive",
    "low",
    "medium",
    "high",
    "live",
  ]);
  const walk = (v) => {
    if (typeof v === "string") {
      assert.ok(
        /^sha256:[a-f0-9]{64}$/.test(v) || ALLOWED.has(v),
        `unexpected raw string in Lane B fixture: ${v}`
      );
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
    // booleans/numbers are fine
  };
  walk(capture);
  walk(rugpulled);
});
