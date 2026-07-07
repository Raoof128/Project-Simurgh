import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { verifyContestLaneBCapture } from "../../../../tools/simurgh-attestation/stage4v/laneb/run-laneb-contest-ceremony.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAP = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4v/laneb/capture.json");

test("committed Lane B contest capture re-verifies (respondent-blind, scoreable)", () => {
  const capture = JSON.parse(readFileSync(CAP, "utf8"));
  const res = verifyContestLaneBCapture(capture);
  assert.equal(res.ok, true, JSON.stringify(res));
  // spec §7 negatives
  assert.equal(capture.respondent_process.blindness.env_has_operator_key_path, false);
  assert.equal(capture.respondent_process.blindness.env_has_operator_state_path, false);
  assert.equal(capture.respondent_process.blindness.argv_has_pem, false);
  // two genuinely separate processes + a real contest outcome
  assert.equal(capture.respondent_process.pid_isolated, true);
  assert.ok(capture.contest_outcome.result.sections.length >= 1);
});

test("tampering the committed capture is caught", () => {
  const capture = JSON.parse(readFileSync(CAP, "utf8"));
  const t = JSON.parse(JSON.stringify(capture));
  t.respondent_process.blindness.env_has_operator_key_path = true;
  assert.equal(verifyContestLaneBCapture(t).ok, false);
});
