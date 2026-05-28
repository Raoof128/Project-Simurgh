import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createConsentStore } from "../../src/votingPilot/consentStore.js";

const PEPPER = "test-pepper-32-chars-padding-here";
const HMAC_KEY = "test-hmac-key-32-chars-padding-xx";

describe("consentStore", () => {
  test("accept() creates record with correct public fields", () => {
    const store = createConsentStore();
    const { pilot_session_id, record } = store.accept({
      anonymousCode: "voter-abc",
      integrityTier: "browser_only",
      pepper: PEPPER,
      hmacKey: HMAC_KEY,
    });
    assert.ok(pilot_session_id.startsWith("vp_"), "id must start with vp_");
    assert.equal(record.consent_version, "2026-05-v1");
    assert.equal(record.accepted, true);
    assert.equal(record.withdrawn, false);
    assert.equal(record.withdrawn_at, null);
    assert.equal(record.integrity_tier, "browser_only");
    assert.ok(record.accepted_at, "accepted_at must be set");
  });

  test('accept() stores participant_code_hash as "hmac-sha256:<hex>" (never raw code)', () => {
    const store = createConsentStore();
    const anonymousCode = "voter-secret";
    const { record } = store.accept({
      anonymousCode,
      integrityTier: "browser_only",
      pepper: PEPPER,
      hmacKey: HMAC_KEY,
    });
    const expectedHex = createHmac("sha256", PEPPER).update(anonymousCode).digest("hex");
    assert.equal(record.participant_code_hash, "hmac-sha256:" + expectedHex);
    assert.ok(
      !record.participant_code_hash.includes(anonymousCode),
      "raw code must not appear in hash"
    );
  });

  test("get() returns record after accept", () => {
    const store = createConsentStore();
    const { pilot_session_id, record } = store.accept({
      anonymousCode: "voter-xyz",
      integrityTier: "browser_plus_daemon",
      pepper: PEPPER,
      hmacKey: HMAC_KEY,
    });
    const fetched = store.get(pilot_session_id);
    assert.strictEqual(fetched, record);
  });

  test("withdraw() marks record as withdrawn", () => {
    const store = createConsentStore();
    const { pilot_session_id } = store.accept({
      anonymousCode: "voter-w1",
      integrityTier: "browser_only",
      pepper: PEPPER,
      hmacKey: HMAC_KEY,
    });
    const result = store.withdraw(pilot_session_id);
    assert.deepEqual(result, { ok: true });
    const record = store.get(pilot_session_id);
    assert.equal(record.withdrawn, true);
    assert.ok(record.withdrawn_at, "withdrawn_at must be set");
  });

  test("withdraw() returns already_withdrawn on second call", () => {
    const store = createConsentStore();
    const { pilot_session_id } = store.accept({
      anonymousCode: "voter-w2",
      integrityTier: "browser_only",
      pepper: PEPPER,
      hmacKey: HMAC_KEY,
    });
    store.withdraw(pilot_session_id);
    const result = store.withdraw(pilot_session_id);
    assert.deepEqual(result, { ok: false, reason: "already_withdrawn" });
  });

  test("markSubmitted() sets _submitted to true", () => {
    const store = createConsentStore();
    const { pilot_session_id } = store.accept({
      anonymousCode: "voter-s1",
      integrityTier: "browser_only",
      pepper: PEPPER,
      hmacKey: HMAC_KEY,
    });
    const result = store.markSubmitted(pilot_session_id);
    assert.deepEqual(result, { ok: true });
    const record = store.get(pilot_session_id);
    assert.equal(record._submitted, true);
  });

  test("markSubmitted() returns withdrawn error if session withdrawn", () => {
    const store = createConsentStore();
    const { pilot_session_id } = store.accept({
      anonymousCode: "voter-s2",
      integrityTier: "browser_only",
      pepper: PEPPER,
      hmacKey: HMAC_KEY,
    });
    store.withdraw(pilot_session_id);
    const result = store.markSubmitted(pilot_session_id);
    assert.deepEqual(result, { ok: false, reason: "withdrawn" });
  });
});
