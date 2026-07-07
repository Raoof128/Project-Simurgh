// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC Lane B — verify the committed live capture (never regenerated). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { verifyLaneBCapture } from "../../../../tools/simurgh-attestation/stage4t/laneb/run-laneb-incident-ceremony.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPTURE = join(
  HERE,
  "../../../../docs/research/llm-shield/evidence/stage-4t/laneb/capture.json"
);

const capture = JSON.parse(readFileSync(CAPTURE, "utf8"));

test("committed Lane B capture verifies (capsule green + all three views + human-input seriousness)", () => {
  const res = verifyLaneBCapture(capture);
  assert.equal(res.ok, true, JSON.stringify(res));
});

test("Lane B was a real two-OS-process MCP stdio hop", () => {
  assert.equal(capture.transport, "mcp_stdio_jsonrpc2");
  assert.equal(capture.process_isolation.parent_pid_captured, true);
  assert.notEqual(capture.process_isolation.child_pid, undefined);
});

test("the capsule carries all three tiered audience views over one capsule root", () => {
  assert.deepEqual(Object.keys(capture.views).sort(), ["insurer", "public", "regulator"]);
  const root = capture.capsule.content.capsule_root;
  for (const v of Object.values(capture.views)) assert.equal(v.capsule_root, root);
});

test("the public view provably tells the same story as the regulator view, minus ledgered redactions", () => {
  assert.equal(capture.views.regulator.redactions.count, 0);
  assert.ok(capture.views.public.redactions.count > 0);
});
