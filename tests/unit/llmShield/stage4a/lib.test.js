import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBundle,
  STAGE4A_BUNDLE_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage4aAuthorityLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-4a-lite";
const summary = JSON.parse(readFileSync(`${EV}/authority-decision-summary.json`, "utf8"));
const manifest = JSON.parse(readFileSync(`${EV}/manifest.json`, "utf8"));
const decisions = JSON.parse(readFileSync(`${EV}/authority-decisions.json`, "utf8"));

test("buildBundle is deterministic and carries the no-confirmation summary", () => {
  const a = buildBundle({ summary, manifest, decisions });
  const b = buildBundle({ summary, manifest, decisions });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.schema, STAGE4A_BUNDLE_SCHEMA);
  assert.equal(a.summary.requires_confirmation_count, 0);
  assert.equal(a.decisions_count, decisions.length);
});
