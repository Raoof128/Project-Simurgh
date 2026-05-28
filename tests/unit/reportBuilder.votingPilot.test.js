import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createConsentStore } from "../../src/votingPilot/consentStore.js";
import { buildPilotReport } from "../../src/votingPilot/reportBuilder.js";

const PEPPER = "test-pepper-32-chars-long-enough!";
const HMAC_KEY = "test-hmac-key-also-32-chars-long!";

function makeRecord(opts = {}) {
  const store = createConsentStore();
  const { record } = store.accept({
    anonymousCode: "abc",
    integrityTier: opts.tier ?? "browser_only",
    pepper: PEPPER,
    hmacKey: HMAC_KEY,
  });
  return { store, record };
}

describe("buildPilotReport", () => {
  test("returns required top-level fields", () => {
    const { record } = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.schema_version, "2026-05-v1");
    assert.equal(report.pilot_mode, "mq_persian_society_voting_shadow");
    assert.equal(report.official_vote_impact, false);
    assert.equal(report.synthetic, false);
    assert.equal(report.data_source, "researcher_self_pilot");
  });

  test("consent block reflects record state", () => {
    const { record } = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.consent.accepted, true);
    assert.equal(report.consent.withdrawn, false);
    assert.equal(report.consent.version, "2026-05-v1");
  });

  test("privacy_contract has no true collection fields", () => {
    const { record } = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.privacy_contract.ballot_choice_recorded_by_simurgh, false);
    assert.equal(report.privacy_contract.screen_capture_collected, false);
    assert.equal(report.privacy_contract.webcam_audio_collected, false);
    assert.equal(report.privacy_contract.typed_content_collected, false);
    assert.equal(report.privacy_contract.pasted_content_collected, false);
    assert.equal(report.privacy_contract.forbidden_fields_rejected, 0);
  });

  test("device_integrity defaults to no daemon", () => {
    const { record } = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.device_integrity.daemon_connected, false);
    assert.equal(report.device_integrity.daemon_platform, "none");
  });

  test("audit.chain_valid is true for fresh chain", () => {
    const { record } = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.audit.chain_valid, true);
    assert.ok(
      report.audit.event_count >= 1,
      "chain should have at least the CONSENT_ACCEPTED event"
    );
  });

  test("synthetic flag is passed through", () => {
    const { record } = makeRecord();
    const report = buildPilotReport(record, { synthetic: true, dataSource: "synthetic_persona" });
    assert.equal(report.synthetic, true);
    assert.equal(report.data_source, "synthetic_persona");
  });

  test("session_result reflects submitted state", () => {
    const { store, record } = makeRecord();
    store.markSubmitted(record.pilot_session_id);
    const report = buildPilotReport(record);
    assert.equal(report.session_result.submitted, true);
    assert.equal(report.session_result.completed, true);
    assert.equal(report.session_result.withdrawn, false);
  });
});
