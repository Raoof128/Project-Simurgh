// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FIX = "tests/fixtures/llmShield/stage4q/lane-b";

test("committed lane-b capture replays offline to the expected arm verdicts", async () => {
  const { replayCapture } =
    await import("../../../../tools/simurgh-attestation/stage4q/node/laneb-approval-capture.mjs");
  const capture = JSON.parse(readFileSync(`${FIX}/capture.json`, "utf8"));
  const expected = JSON.parse(readFileSync(`${FIX}/expected-arms.json`, "utf8"));
  assert.deepEqual(replayCapture(capture), expected);
});

test("the ten frozen arms are present, including the mandatory raw-86 negative arm", () => {
  const expected = JSON.parse(readFileSync(`${FIX}/expected-arms.json`, "utf8"));
  const byArm = Object.fromEntries(expected.map((a) => [a.arm_id, a.raw]));
  assert.equal(byArm.harness_signer_as_approver, 86);
  assert.equal(byArm.human_at_terminal, 0);
  assert.equal(byArm.refusal_bearing_run, 0);
  assert.equal(byArm.census_mismatch, 89);
  assert.equal(expected.length, 10);
});

test("capture is digest-only (no raw tool arguments, prompts, emails, or private keys)", () => {
  const raw = readFileSync(`${FIX}/capture.json`, "utf8");
  assert.ok(!/@[a-z]+\.(com|org|net)/i.test(raw), "no email-like strings");
  assert.ok(!raw.includes("BEGIN PRIVATE KEY"));
});

test("approver runs as a separate process and refuses a display mismatch", () => {
  const req = {
    unsigned_receipt: { approval_display_digest: `sha256:${"1".repeat(64)}` },
    rendered_display_text: "something that does not hash to that",
  };
  assert.throws(() =>
    execFileSync(
      "node",
      [
        "tools/simurgh-attestation/stage4q/node/approver-signer.mjs",
        "--key",
        "tests/fixtures/llmShield/stage4q/test-keys/INSECURE_FIXTURE_ONLY_approver.pem",
      ],
      { input: JSON.stringify(req), stdio: ["pipe", "pipe", "pipe"] }
    )
  );
});
