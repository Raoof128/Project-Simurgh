import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("Lane B ceremony: blind child drafts, parent verifies raw 0, negatives sealed", () => {
  execFileSync(process.execPath, [
    "tools/simurgh-attestation/stage4w/laneb/run-laneb-drafting-ceremony.mjs",
  ]);
  const cap = JSON.parse(
    readFileSync("docs/research/llm-shield/evidence/stage-4w/laneb/capture.json", "utf8")
  );
  assert.equal(cap.schema, "simurgh.vsn.laneb_capture.v1");
  assert.equal(cap.verify_raw, 0);
  assert.equal(cap.narrative.content.author_role, "drafting_model_operator_signed");
  assert.ok(cap.blindness.negatives.every((n) => n.exit_code !== 0));
  assert.ok(cap.laneb_author_pub_key_pem.includes("PUBLIC KEY"));
  assert.equal(cap.child_input_profile.operator_private_state_visible, false);
  assert.equal(cap.child_input_profile.evidence_input, "capsule_public_projection_only");
  assert.match(cap.component_hashes.narrative, /^sha256:[a-f0-9]{64}$/);
});
