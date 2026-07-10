import test from "node:test";
import assert from "node:assert/strict";
import { validateCampaign } from "../../../../tools/simurgh-attestation/stage5g/core/campaignOutcome.mjs";

test("completed is valid", () => {
  assert.equal(
    validateCampaign({ status: "completed", producer_transcript_present: true }),
    "completed"
  );
});
test("no_show without a transcript is valid", () => {
  assert.equal(
    validateCampaign({ status: "no_show", producer_transcript_present: false }),
    "no_show"
  );
});
test("no_show WITH a transcript throws", () => {
  assert.throws(() => validateCampaign({ status: "no_show", producer_transcript_present: true }));
});
test("unknown status throws", () => {
  assert.throws(() => validateCampaign({ status: "made_up" }));
});
