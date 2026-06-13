// SPDX-License-Identifier: AGPL-3.0-or-later
import { Router } from "express";
import crypto from "node:crypto";
import { appendEntry } from "../audit/hmacChain.js";
import { extractBearer } from "../security/sessionToken.js";
import { createRateLimiter, keyByIp } from "../security/rateLimit.js";
import { BANKING_PILOT_EVENTS, buildRejectedAttemptAuditPayload } from "./bankingAudit.js";
import { rejectBankingWritesIfClosed } from "./bankingCollectionClosed.js";
import { issueBankingSessionToken, verifyBankingSessionToken } from "./bankingConsentToken.js";
import { createBankingSessionStore } from "./bankingSessionStore.js";
import { validateBankingScenarioPayload } from "./bankingScenarioPolicy.js";
import {
  containsForbiddenBankingFieldDeep,
  isStructuralPollutionKey,
  MAX_DEPTH_SENTINEL,
} from "./forbiddenBankingFields.js";
import { scoreBankingRisk } from "./bankingRiskScoring.js";
import {
  buildBankingAuditExport,
  buildBankingReport,
  buildBankingVerifyExport,
} from "./bankingReportBuilder.js";
import { buildBankingAiExplanation, isAiExplainEnabled } from "./bankingAiExplain.js";
import { buildDisabledReceipt } from "./bankingAiPrivacyReceipt.js";

const router = Router();
const store = createBankingSessionStore();
const BANKING_BODY_LIMIT_BYTES = 16 * 1024;
const MAX_BANKING_SESSIONS = Number(process.env.SIMURGH_BANKING_PILOT_MAX_SESSIONS || 5000);
const BANKING_RATE_WINDOW_MS = 60_000;

const limitBankingConsent = createRateLimiter({
  windowMs: BANKING_RATE_WINDOW_MS,
  max: Number(process.env.SIMURGH_BANKING_PILOT_CONSENT_RATE_MAX || 60),
  keyFn: keyByIp,
  name: "banking-consent",
});
const limitBankingWrite = createRateLimiter({
  windowMs: BANKING_RATE_WINDOW_MS,
  max: Number(process.env.SIMURGH_BANKING_PILOT_WRITE_RATE_MAX || 120),
  keyFn: keyByIp,
  name: "banking-write",
});
const limitBankingRead = createRateLimiter({
  windowMs: BANKING_RATE_WINDOW_MS,
  max: Number(process.env.SIMURGH_BANKING_PILOT_READ_RATE_MAX || 240),
  keyFn: keyByIp,
  name: "banking-read",
});

function getEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} env var not set`);
  return value;
}

// Domain separation: the pepper itself never keys anything directly; each use
// gets its own derived key so participant-code hashes and audit-chain
// signatures cannot be cross-validated against each other.
function deriveBankingKey(pepper, label) {
  return crypto.createHmac("sha256", pepper).update(label).digest();
}

function requireBankingConfig(_req, res, next) {
  if (
    !process.env.SIMURGH_BANKING_PILOT_PEPPER ||
    !process.env.SIMURGH_BANKING_PILOT_TOKEN_SECRET
  ) {
    return res.status(503).json({ ok: false, error: "banking_pilot_not_configured" });
  }
  next();
}

function contentLengthWithinLimit(req, res, next) {
  const length = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(length) && length > BANKING_BODY_LIMIT_BYTES) {
    return res.status(413).json({ ok: false, error: "payload_too_large" });
  }
  next();
}

function requireBankingToken(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ ok: false, error: "banking_token_missing" });
  const result = verifyBankingSessionToken(token, getEnv("SIMURGH_BANKING_PILOT_TOKEN_SECRET"));
  if (!result.valid) {
    return res
      .status(401)
      .json({ ok: false, error: "banking_token_invalid", reason: result.reason });
  }
  req.bankingSessionId = result.bankingSessionId;
  req.participantCodeHash = result.participantCodeHash;
  next();
}

function requirePathTokenMatch(req, res, next) {
  if (req.bankingSessionId !== req.params.sessionId) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
  next();
}

function scenarioMetadata(body) {
  const metadata = { scenario_type: body.scenario_type };
  for (const field of [
    "submit_intent",
    "consent_scope_hash",
    "consent_duration_category",
    "withdrawal_option_shown",
    "mock_cop_result_category",
    "risk_prompt_shown",
    "user_action",
    "user_selected_context",
    "agent_action_type",
    "user_decision",
    "financial_payload_recorded_by_simurgh",
  ]) {
    if (Object.hasOwn(body, field)) metadata[field] = body[field];
  }
  return metadata;
}

function scenarioBody(body) {
  const { banking_session_id: _bankingSessionId, ...scenario } = body;
  return scenario;
}

function mapValidationError(validation) {
  if (validation.reason === "forbidden_field") {
    return {
      status: 400,
      body: { ok: false, error: "forbidden_banking_field", field: validation.field },
    };
  }
  if (validation.reason === "invalid_payload_key") {
    return {
      status: 400,
      body: { ok: false, error: "invalid_payload_key", field: validation.field },
    };
  }
  if (validation.reason === "unknown_field") {
    return { status: 400, body: { ok: false, error: "unknown_field", field: validation.field } };
  }
  if (validation.reason === "invalid_scenario_type") {
    return {
      status: 400,
      body: { ok: false, error: "invalid_scenario_type", field: "scenario_type" },
    };
  }
  return { status: 400, body: { ok: false, error: validation.reason, field: validation.field } };
}

function appendRejectedAttempt(record, { route, reason, fieldName }) {
  record.forbidden_fields_rejected += reason === "forbidden_banking_field" ? 1 : 0;
  appendEntry(
    record.auditChain,
    record.hmacKey,
    reason === "unknown_field"
      ? BANKING_PILOT_EVENTS.UNKNOWN_FIELD_REJECTED
      : BANKING_PILOT_EVENTS.FORBIDDEN_FIELD_REJECTED,
    buildRejectedAttemptAuditPayload({ route, reason, fieldName })
  );
}

router.use(contentLengthWithinLimit);
router.use(requireBankingConfig);

router.post("/consent/accept", rejectBankingWritesIfClosed, limitBankingConsent, (_req, res) => {
  if (store.size() >= MAX_BANKING_SESSIONS) {
    return res.status(503).json({ ok: false, error: "banking_session_capacity_reached" });
  }
  const pepper = getEnv("SIMURGH_BANKING_PILOT_PEPPER");
  const anonymousCode = crypto.randomBytes(8).toString("hex");
  const { banking_session_id, record } = store.accept({
    anonymousCode,
    pepper: deriveBankingKey(pepper, "banking-pilot-participant-code-v1"),
    hmacKey: deriveBankingKey(pepper, "banking-pilot-audit-chain-v1"),
  });
  const token = issueBankingSessionToken(
    {
      bankingSessionId: banking_session_id,
      participantCodeHash: record.participant_code_hash,
    },
    getEnv("SIMURGH_BANKING_PILOT_TOKEN_SECRET")
  );

  res.json({
    ok: true,
    banking_session_id,
    participant_code: anonymousCode,
    token,
    phase: record.phase,
    consent_version: record.consent_version,
  });
});

router.post(
  "/submit",
  rejectBankingWritesIfClosed,
  limitBankingWrite,
  requireBankingToken,
  (req, res) => {
    const body = req.body ?? {};
    if (body.banking_session_id && body.banking_session_id !== req.bankingSessionId) {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }

    const record = store.get(req.bankingSessionId);
    if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
    if (record.withdrawn || record.submitted) {
      return res.status(409).json({ ok: false, error: "already_submitted_or_withdrawn" });
    }

    // Defense in depth: this scan covers the full body (including keys stripped
    // before scenario validation); validateBankingScenarioPayload re-scans the
    // scenario subset independently.
    const forbiddenField = containsForbiddenBankingFieldDeep(body);
    if (forbiddenField === MAX_DEPTH_SENTINEL) {
      appendRejectedAttempt(record, {
        route: "submit",
        reason: "payload_too_deep",
        fieldName: null,
      });
      return res.status(400).json({ ok: false, error: "payload_too_deep" });
    }
    if (forbiddenField) {
      const error = isStructuralPollutionKey(forbiddenField)
        ? "invalid_payload_key"
        : "forbidden_banking_field";
      appendRejectedAttempt(record, { route: "submit", reason: error, fieldName: forbiddenField });
      return res.status(400).json({ ok: false, error, field: forbiddenField });
    }

    const scenario = scenarioBody(body);
    const validation = validateBankingScenarioPayload(scenario);
    if (!validation.ok) {
      const mapped = mapValidationError(validation);
      appendRejectedAttempt(record, {
        route: "submit",
        reason: mapped.body.error,
        fieldName: mapped.body.field,
      });
      return res.status(mapped.status).json(mapped.body);
    }

    const metadata = scenarioMetadata(scenario);
    const risk = scoreBankingRisk({
      ...metadata,
      forbiddenPayloadAttempt: record.forbidden_fields_rejected > 0,
    });
    const result = store.markSubmitted(req.bankingSessionId, { scenarioMetadata: metadata, risk });
    if (!result.ok) return res.status(409).json({ ok: false, error: result.reason });

    appendEntry(record.auditChain, record.hmacKey, BANKING_PILOT_EVENTS.SCENARIO_SUBMITTED, {
      scenario_type: metadata.scenario_type,
      risk_score: risk.risk_score,
      verdict: risk.verdict,
    });

    res.json({
      ok: true,
      banking_session_id: req.bankingSessionId,
      scenario_type: metadata.scenario_type,
      submitted_at: record.submitted_at,
      risk_score: risk.risk_score,
      verdict: risk.verdict,
      banking_payload_recorded_by_simurgh: false,
    });
  }
);

router.post(
  "/withdraw",
  rejectBankingWritesIfClosed,
  limitBankingWrite,
  requireBankingToken,
  (req, res) => {
    const record = store.get(req.bankingSessionId);
    if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
    if (record.withdrawn) return res.status(409).json({ ok: false, error: "already_withdrawn" });
    appendEntry(record.auditChain, record.hmacKey, BANKING_PILOT_EVENTS.WITHDRAWN, {
      ts: new Date().toISOString(),
    });
    store.withdraw(req.bankingSessionId);
    res.json({ ok: true, withdrawn: true, withdrawn_at: record.withdrawn_at });
  }
);

router.get(
  "/:sessionId/report",
  limitBankingRead,
  requireBankingToken,
  requirePathTokenMatch,
  (req, res) => {
    const record = store.get(req.params.sessionId);
    if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
    if (record.withdrawn)
      return res.status(403).json({ ok: false, error: "report_blocked_session_withdrawn" });
    appendEntry(record.auditChain, record.hmacKey, BANKING_PILOT_EVENTS.REPORT_EXPORTED, {
      ts: new Date().toISOString(),
    });
    res.json(buildBankingReport(record));
  }
);

router.get(
  "/:sessionId/audit",
  limitBankingRead,
  requireBankingToken,
  requirePathTokenMatch,
  (req, res) => {
    const record = store.get(req.params.sessionId);
    if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
    appendEntry(record.auditChain, record.hmacKey, BANKING_PILOT_EVENTS.AUDIT_EXPORTED, {
      ts: new Date().toISOString(),
    });
    res.json(buildBankingAuditExport(record));
  }
);

router.get(
  "/:sessionId/verify",
  limitBankingRead,
  requireBankingToken,
  requirePathTokenMatch,
  (req, res) => {
    const record = store.get(req.params.sessionId);
    if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
    appendEntry(record.auditChain, record.hmacKey, BANKING_PILOT_EVENTS.VERIFY_EXPORTED, {
      ts: new Date().toISOString(),
    });
    res.json(buildBankingVerifyExport(record));
  }
);

router.get(
  "/:sessionId/ai-privacy-explain",
  limitBankingRead,
  requireBankingToken,
  requirePathTokenMatch,
  (req, res) => {
    if (!isAiExplainEnabled()) {
      return res.status(503).json({
        ok: false,
        error: "ai_explain_disabled",
        ...buildDisabledReceipt("ai_explain_disabled"),
      });
    }
    const record = store.get(req.params.sessionId);
    if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
    if (record.withdrawn) {
      return res.status(403).json({
        ok: false,
        error: "ai_explain_blocked_session_withdrawn",
        ...buildDisabledReceipt("ai_explain_blocked_session_withdrawn"),
      });
    }
    if (!record.submitted) {
      return res.status(409).json({ ok: false, error: "no_scenario_submitted" });
    }
    const result = buildBankingAiExplanation(record);
    if (!result.ok) {
      return res
        .status(result.status)
        .json({ ok: false, error: "ai_explain_firewall_failed", receipt: result.receipt });
    }
    appendEntry(record.auditChain, record.hmacKey, BANKING_PILOT_EVENTS.AI_EXPLANATION_EXPORTED, {
      ts: new Date().toISOString(),
      narrative_hash: result.receipt.narrative_hash,
    });
    return res.json({
      ai_privacy_layer_enabled: true,
      provider: "deterministic_mock",
      narrative: result.narrative,
      receipt: result.receipt,
    });
  }
);

export default router;
