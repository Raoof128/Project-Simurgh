import { Router } from "express";
import crypto from "node:crypto";
import { createConsentStore } from "./consentStore.js";
import { buildPilotReport } from "./reportBuilder.js";
import { VOTING_PILOT_EVENTS } from "./events.js";
import { appendEntry } from "../audit/hmacChain.js";
import { issueSessionToken, verifySessionToken, extractBearer } from "../security/sessionToken.js";

const router = Router();
const store = createConsentStore();

const FORBIDDEN_BALLOT_FIELDS = new Set([
  "choice",
  "selected_choice",
  "selected_option",
  "candidate",
  "candidate_id",
  "vote",
  "vote_choice",
  "ballot_choice",
  "ballot_content",
  "ballot_answer",
  "ballot",
  "selected_candidate",
]);

const PILOT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getEnv(key) {
  const val = process.env[key];
  if (!val) throw new Error(`${key} env var not set`);
  return val;
}

function requirePilotToken(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "pilot_token_missing" });
  const result = verifySessionToken(token, getEnv("SIMURGH_VOTING_PILOT_TOKEN_SECRET"));
  if (!result.valid)
    return res.status(401).json({ error: "pilot_token_invalid", reason: result.reason });
  req.pilotSessionId = result.sessionId;
  next();
}

// POST /consent/accept — atomic consent + session creation
router.post("/consent/accept", (req, res) => {
  const pepper = getEnv("SIMURGH_VOTING_PILOT_PEPPER");
  const anonymousCode = crypto.randomBytes(8).toString("hex");
  const { pilot_session_id, record } = store.accept({
    anonymousCode,
    integrityTier: "browser_only",
    pepper,
    hmacKey: pepper,
  });
  appendEntry(record._chain, pepper, VOTING_PILOT_EVENTS.STARTED, {});

  const token = issueSessionToken(
    pilot_session_id,
    getEnv("SIMURGH_VOTING_PILOT_TOKEN_SECRET"),
    PILOT_TOKEN_TTL_MS
  );
  res.json({
    pilot_session_id,
    participant_code: anonymousCode,
    token,
    integrity_tier: record.integrity_tier,
    consent_version: record.consent_version,
  });
});

// POST /submit — submit intent only; forbidden ballot fields rejected
router.post("/submit", requirePilotToken, (req, res) => {
  const body = req.body ?? {};

  if (body.pilot_session_id && body.pilot_session_id !== req.pilotSessionId) {
    return res.status(409).json({ error: "session_token_body_mismatch" });
  }

  const record = store.get(req.pilotSessionId);
  if (!record) return res.status(404).json({ error: "session_not_found" });
  if (record.withdrawn) return res.status(403).json({ error: "session_withdrawn" });

  const forbidden = Object.keys(body).filter((k) => FORBIDDEN_BALLOT_FIELDS.has(k));
  if (forbidden.length > 0) {
    record._forbidden_fields_rejected += 1;
    appendEntry(record._chain, record._hmacKey, VOTING_PILOT_EVENTS.BALLOT_FIELD_REJECTED, {
      field_names: forbidden,
    });
    return res
      .status(400)
      .json({ error: "ballot_choice_field_rejected", forbidden_fields: forbidden });
  }

  const submitResult = store.markSubmitted(req.pilotSessionId);
  if (!submitResult.ok) return res.status(409).json({ error: "already_submitted_or_withdrawn" });

  const submittedAt = new Date().toISOString();
  appendEntry(record._chain, record._hmacKey, VOTING_PILOT_EVENTS.SUBMITTED, { ts: submittedAt });

  res.json({
    ballot_presented: true,
    ballot_submitted: true,
    ballot_choice_recorded_by_simurgh: false,
    submitted_at: submittedAt,
  });
});

// POST /withdraw
router.post("/withdraw", requirePilotToken, (req, res) => {
  const record = store.get(req.pilotSessionId);
  if (!record) return res.status(404).json({ error: "session_not_found" });
  if (record.withdrawn) return res.status(409).json({ error: "already_withdrawn" });

  appendEntry(record._chain, record._hmacKey, VOTING_PILOT_EVENTS.WITHDRAWN, {
    ts: new Date().toISOString(),
  });
  store.withdraw(req.pilotSessionId);

  res.json({ withdrawn: true, withdrawn_at: record.withdrawn_at });
});

// GET /:sessionId/report — requires pilot token; blocked for withdrawn sessions
router.get("/:sessionId/report", requirePilotToken, (req, res) => {
  if (req.pilotSessionId !== req.params.sessionId) {
    return res.status(403).json({ error: "session_token_mismatch" });
  }
  const record = store.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session_not_found" });
  if (record.withdrawn) return res.status(403).json({ error: "report_blocked_session_withdrawn" });

  appendEntry(record._chain, record._hmacKey, VOTING_PILOT_EVENTS.REPORT_EXPORTED, {
    ts: new Date().toISOString(),
  });

  const dataSource = req.query.data_source ?? "researcher_self_pilot";
  const synthetic = req.query.synthetic === "true";
  const report = buildPilotReport(record, { dataSource, synthetic });

  res.json(report);
});

export default router;
