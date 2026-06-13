// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { createChain, appendEntry } from "../audit/hmacChain.js";
import { BANKING_PILOT_EVENTS } from "./bankingAudit.js";

export function createBankingSessionStore() {
  const store = new Map();

  function accept({ anonymousCode, pepper, hmacKey }) {
    const banking_session_id = "bp_" + crypto.randomUUID();
    const participant_code_hash =
      "hmac-sha256:" + crypto.createHmac("sha256", pepper).update(anonymousCode).digest("hex");
    const auditChain = createChain();
    appendEntry(auditChain, hmacKey, BANKING_PILOT_EVENTS.CONSENT_ACCEPTED, {});
    appendEntry(auditChain, hmacKey, BANKING_PILOT_EVENTS.STARTED, {});

    const record = {
      banking_session_id,
      participant_code_hash,
      phase: "phase_a_synthetic",
      consent_version: "2026-06-b1-v1",
      accepted: true,
      accepted_at: new Date().toISOString(),
      withdrawn: false,
      withdrawn_at: null,
      submitted: false,
      submitted_at: null,
      scenario_metadata: null,
      risk: null,
      forbidden_fields_rejected: 0,
      auditChain,
      hmacKey,
    };

    store.set(banking_session_id, record);
    return { banking_session_id, record };
  }

  function get(bankingSessionId) {
    return store.get(bankingSessionId);
  }

  function markSubmitted(bankingSessionId, { scenarioMetadata, risk }) {
    const record = store.get(bankingSessionId);
    if (!record) return { ok: false, reason: "not_found" };
    if (record.withdrawn || record.submitted) {
      return { ok: false, reason: "already_submitted_or_withdrawn" };
    }
    record.submitted = true;
    record.submitted_at = new Date().toISOString();
    record.scenario_metadata = scenarioMetadata;
    record.risk = risk;
    return { ok: true, record };
  }

  function withdraw(bankingSessionId) {
    const record = store.get(bankingSessionId);
    if (!record) return { ok: false, reason: "not_found" };
    if (record.withdrawn) return { ok: false, reason: "already_withdrawn" };
    record.withdrawn = true;
    record.withdrawn_at = new Date().toISOString();
    return { ok: true, record };
  }

  function size() {
    return store.size;
  }

  return { accept, get, markSubmitted, withdraw, size };
}
