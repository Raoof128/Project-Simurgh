import { randomUUID, createHmac } from "node:crypto";
import { createChain, appendEntry } from "../audit/hmacChain.js";
import { VOTING_PILOT_EVENTS } from "./events.js";

export function createConsentStore() {
  const store = new Map();

  function accept({ anonymousCode, integrityTier, pepper, hmacKey }) {
    const pilot_session_id = "vp_" + randomUUID();

    const participant_code_hash =
      "hmac-sha256:" +
      createHmac("sha256", pepper).update(anonymousCode).digest("hex");

    const _chain = createChain();
    appendEntry(_chain, hmacKey, VOTING_PILOT_EVENTS.CONSENT_ACCEPTED, {});

    const record = {
      pilot_session_id,
      participant_code_hash,
      consent_version: "2026-05-v1",
      accepted: true,
      accepted_at: new Date().toISOString(),
      withdrawn: false,
      withdrawn_at: null,
      integrity_tier: integrityTier,
      _chain,
      _hmacKey: hmacKey,
      _submitted: false,
      _forbidden_fields_rejected: 0,
      _daemon_connected: false,
      _daemon_platform: "none",
    };

    store.set(pilot_session_id, record);
    return { pilot_session_id, record };
  }

  function get(pilot_session_id) {
    return store.get(pilot_session_id);
  }

  function withdraw(pilot_session_id) {
    const record = store.get(pilot_session_id);
    if (!record) return { ok: false, reason: "not_found" };
    if (record.withdrawn) return { ok: false, reason: "already_withdrawn" };
    record.withdrawn = true;
    record.withdrawn_at = new Date().toISOString();
    return { ok: true };
  }

  function markSubmitted(pilot_session_id) {
    const record = store.get(pilot_session_id);
    if (!record) return { ok: false, reason: "not_found" };
    if (record.withdrawn) return { ok: false, reason: "withdrawn" };
    record._submitted = true;
    return { ok: true };
  }

  return { accept, get, withdraw, markSubmitted };
}
