// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3A-alpha LLM Shield routes. Input-only: classifies user input before any
// model invocation, calls the deterministic mock only for safe input, and emits a
// metadata-only receipt linked to a per-session HMAC chain. No contexts, no tools,
// no live model — see docs/research/llm-shield/LLM_SHIELD_STAGE_3A.md.
import { Router } from "express";
import crypto from "node:crypto";
import { createChain, verifyChain } from "../audit/hmacChain.js";
import { getStore } from "../storage/memoryStore.js";
import { issueSessionToken, verifySessionToken, extractBearer } from "../security/sessionToken.js";
import { stagingConfig } from "../config/env.js";
import { normalisePrompt, hashPrompt } from "./promptNormalise.js";
import { classifyPrompt } from "./promptFirewall.js";
import { callMockProvider } from "./mockLlmProvider.js";
import { buildSafeReceipt, buildBlockedReceipt, hashReceipt } from "./safetyReceipt.js";
import {
  recordSessionCreated,
  recordSafeRun,
  recordBlockedRun,
  recordReceiptExported,
} from "./llmShieldAudit.js";

const router = Router();
const store = getStore("llm-shield-sessions");
const BODY_LIMIT_BYTES = 16 * 1024;
const MAX_SESSIONS = Number(process.env.SIMURGH_LLM_SHIELD_MAX_SESSIONS || 5000);

function getSecret() {
  const s = process.env.SIMURGH_LLM_SHIELD_SECRET;
  if (!s) throw new Error("SIMURGH_LLM_SHIELD_SECRET not set");
  return s;
}
function deriveKey(label) {
  return crypto.createHmac("sha256", getSecret()).update(label).digest();
}
const tokenKey = () => deriveKey("llm-shield-token-v1");
const auditKey = () => deriveKey("llm-shield-audit-chain-v1");

function requireConfig(_req, res, next) {
  if (!process.env.SIMURGH_LLM_SHIELD_SECRET) {
    return res.status(503).json({ ok: false, error: "llm_shield_not_configured" });
  }
  next();
}
function contentLengthWithinLimit(req, res, next) {
  const length = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(length) && length > BODY_LIMIT_BYTES) {
    return res.status(413).json({ ok: false, error: "payload_too_large" });
  }
  next();
}
function requireToken(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ ok: false, error: "token_missing" });
  const result = verifySessionToken(token, tokenKey());
  if (!result.valid) {
    return res.status(401).json({ ok: false, error: "token_invalid", reason: result.reason });
  }
  req.llmSessionId = result.sessionId;
  next();
}
function requirePathMatch(req, res, next) {
  if (req.llmSessionId !== req.params.sessionId) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
  next();
}

router.use(contentLengthWithinLimit);
router.use(requireConfig);

router.post("/sessions", (_req, res) => {
  if (store.size >= MAX_SESSIONS) {
    return res.status(503).json({ ok: false, error: "llm_shield_session_capacity_reached" });
  }
  const sessionId = "llmsess_" + crypto.randomBytes(12).toString("hex");
  const record = { auditChain: createChain(), runCounter: 0 };
  recordSessionCreated(record.auditChain, auditKey());
  store.set(sessionId, record);
  const token = issueSessionToken(sessionId, tokenKey(), stagingConfig.sessionTokenTtlMs);
  res.json({
    ok: true,
    session_id: sessionId,
    session_token: token,
    privacy_mode: "metadata_only",
  });
});

router.post("/:sessionId/run", requireToken, requirePathMatch, (req, res) => {
  const record = store.get(req.params.sessionId);
  if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });

  const body = req.body ?? {};
  const taskType = typeof body.task_type === "string" ? body.task_type : "unknown";
  record.runCounter += 1;
  const runId = `run_${String(record.runCounter).padStart(3, "0")}`;
  const sessionIdHash = hashPrompt(req.params.sessionId);
  const timestamp = new Date().toISOString();
  const key = auditKey();

  // Fail-closed: alpha has no provenance guard, so any contexts channel is rejected.
  if (Object.hasOwn(body, "contexts")) {
    return finishBlocked(res, {
      record,
      key,
      runId,
      sessionIdHash,
      timestamp,
      inputHash: hashPrompt(""),
      normalisedInputHash: hashPrompt(""),
      reasonCodes: ["contexts_not_supported_alpha"],
      detectedAttackClasses: [],
      ok: false,
    });
  }

  if (typeof body.input !== "string" || body.input.length === 0) {
    return res.status(400).json({ ok: false, error: "invalid_input" });
  }

  const rawInput = body.input;
  const normalised = normalisePrompt(rawInput);
  const inputHash = hashPrompt(rawInput);
  const normalisedInputHash = hashPrompt(normalised);
  const verdict = classifyPrompt(normalised);

  if (verdict.verdict === "blocked") {
    return finishBlocked(res, {
      record,
      key,
      runId,
      sessionIdHash,
      timestamp,
      inputHash,
      normalisedInputHash,
      reasonCodes: verdict.reason_codes,
      detectedAttackClasses: verdict.detected_attack_classes,
      ok: true,
    });
  }

  // Safe path: deterministic mock model is invoked.
  callMockProvider({ task_type: taskType, input: rawInput });
  const auditEntryHash = recordSafeRun(record.auditChain, key, {
    verdict: "safe",
    reasonCodes: [],
    detectedAttackClasses: [],
    inputHash,
    normalisedInputHash,
    modelCalled: true,
  });
  const receipt = buildSafeReceipt({
    sessionIdHash,
    runId,
    inputHash,
    normalisedInputHash,
    auditEntryHash,
    timestamp,
  });
  recordReceiptExported(record.auditChain, key, hashReceipt(receipt));
  res.json({ ok: true, verdict: "safe", model_called: true, reason_codes: [], receipt });
});

function finishBlocked(res, ctx) {
  const auditEntryHash = recordBlockedRun(ctx.record.auditChain, ctx.key, {
    verdict: "blocked",
    reasonCodes: ctx.reasonCodes,
    detectedAttackClasses: ctx.detectedAttackClasses,
    inputHash: ctx.inputHash,
    normalisedInputHash: ctx.normalisedInputHash,
    modelCalled: false,
  });
  const receipt = buildBlockedReceipt({
    sessionIdHash: ctx.sessionIdHash,
    runId: ctx.runId,
    inputHash: ctx.inputHash,
    normalisedInputHash: ctx.normalisedInputHash,
    reasonCodes: ctx.reasonCodes,
    detectedAttackClasses: ctx.detectedAttackClasses,
    auditEntryHash,
    timestamp: ctx.timestamp,
  });
  recordReceiptExported(ctx.record.auditChain, ctx.key, hashReceipt(receipt));
  return res.json({
    ok: ctx.ok,
    verdict: "blocked",
    model_called: false,
    reason_codes: ctx.reasonCodes,
    receipt,
  });
}

router.get("/:sessionId/verify", requireToken, requirePathMatch, (req, res) => {
  const record = store.get(req.params.sessionId);
  if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
  const { valid, errors } = verifyChain(record.auditChain, auditKey());
  res.json({ ok: true, valid, errors });
});

export default router;
