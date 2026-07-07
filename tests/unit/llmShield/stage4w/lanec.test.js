import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLaneCCapture } from "../../../../tools/simurgh-attestation/stage4w/lanec/validateLaneCCapture.mjs";

const good = {
  schema: "simurgh.vsn.lane_c_capture.v1",
  model_id: "claude-fable-5",
  mode: "standard",
  prompt_digest: "sha256:" + "a".repeat(64),
  completion_digest: "sha256:" + "b".repeat(64),
  verify_result: { raw: 0 },
};

test("capture schema: good passes, raw transcript rejected, bad mode rejected", () => {
  assert.equal(validateLaneCCapture(good), null);
  assert.ok(validateLaneCCapture({ ...good, transcript: "raw!" }).error);
  assert.ok(validateLaneCCapture({ ...good, mode: "sneaky" }).error);
  assert.ok(validateLaneCCapture({ ...good, verify_result: { raw: 42 } }).error);
  assert.equal(
    validateLaneCCapture({ ...good, verify_result: undefined, model_refused: true }),
    null
  );
  // adversarial mode is legal; a caught 170 is a successful demonstration, not an error.
  assert.equal(
    validateLaneCCapture({ ...good, mode: "adversarial", verify_result: { raw: 170 } }),
    null
  );
});
