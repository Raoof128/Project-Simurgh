import test from "node:test";
import assert from "node:assert/strict";
import { findForbiddenData } from "../../e2e/stage27_cross_platform_device_shield_smoke.mjs";
const canaries = ["0x123", "4321", "Answers", "hidden.exe"];
const digest = "sha256:887a6db4db8a0b06e767c6d1953c309443210dadec425025a234a9f021fe27b9";
test("a canonical paired-node digest may coincidentally contain the numeric canary", () => {
  assert.equal(findForbiddenData({ node_id_hash_if_paired: digest }, canaries), null);
});
for (const [label, payload] of [
  ["numeric PID", { debug: { pid: 4321 } }],
  ["string PID", { debug: { pid: "4321" } }],
  ["embedded PID", { detail: "pid=4321" }],
  ["forged hash field", { node_id_hash_if_paired: "4321" }],
  ["short digest", { node_id_hash_if_paired: "sha256:4321" }],
  ["digest with appended raw text", { node_id_hash_if_paired: digest + " hidden.exe" }],
  [
    "raw field beside valid digest",
    { node_id_hash_if_paired: digest, debug: { window_title: "Answers" } },
  ],
]) {
  test(`privacy smoke still detects ${label}`, () => {
    assert.ok(findForbiddenData(payload, canaries));
  });
}
