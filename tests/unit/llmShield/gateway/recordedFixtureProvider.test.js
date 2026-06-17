import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashPrompt } from "../../../../src/llmShield/promptNormalise.js";
import {
  RECORDED_CASE_ID_RE,
  selectFixtureEntry,
  validateRecordedFixture,
  generateFromFixture,
} from "../../../../src/llmShield/gateway/recordedFixtureProvider.js";

const manifest = { "3e_recorded_001": "recorded_fixture/3e_recorded_001.json" };
const SYNTH = "SYSTEM PROMPT: synthetic marker";
const goodFixture = {
  case_id: "3e_recorded_001",
  provenance: "synthetic",
  provider_response_kind: "leaky_text",
  synthetic_provider_output: SYNTH,
  provider_output_hash: hashPrompt(SYNTH),
};

describe("recordedFixtureProvider", () => {
  test("case_id pattern accepts opaque ids, rejects paths", () => {
    assert.ok(RECORDED_CASE_ID_RE.test("3e_recorded_001"));
    assert.ok(!RECORDED_CASE_ID_RE.test("../secret"));
    assert.ok(!RECORDED_CASE_ID_RE.test("recorded_fixture/3e_recorded_001.json"));
  });
  test("selectFixtureEntry rejects path-like selectors", () => {
    assert.throws(() => selectFixtureEntry("../x", manifest), /gateway_fixture_selector_invalid/);
  });
  test("selectFixtureEntry rejects unknown case_id", () => {
    assert.throws(
      () => selectFixtureEntry("3e_recorded_999", manifest),
      /gateway_fixture_not_found/
    );
  });
  test("validateRecordedFixture rejects non-synthetic provenance", () => {
    assert.throws(
      () => validateRecordedFixture({ ...goodFixture, provenance: "real" }),
      /gateway_fixture_provenance_invalid/
    );
  });
  test("validateRecordedFixture rejects output-hash mismatch", () => {
    assert.throws(
      () => validateRecordedFixture({ ...goodFixture, provider_output_hash: "sha256:deadbeef" }),
      /gateway_fixture_hash_mismatch/
    );
  });
  test("generateFromFixture returns no-network leaky_text output", () => {
    validateRecordedFixture(goodFixture);
    const r = generateFromFixture(goodFixture);
    assert.equal(r.provider_mode, "recorded_fixture");
    assert.equal(r.network_egress_used, false);
    assert.equal(r.provider_response_kind, "leaky_text");
    assert.equal(r.output_text, SYNTH);
  });
});
