// SPDX-License-Identifier: AGPL-3.0-or-later
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stagingConfig } from "./src/config/env.js";
import { normaliseTelemetry } from "./src/privacy/normaliseTelemetry.js";
import { scoreAcademicRisk } from "./src/academic/riskScoring.js";
import { EVENTS, eventTimeline } from "./src/academic/academicEvents.js";
import { createExam, getExam, listExams } from "./src/academic/exams.js";
import { STATES, createSessionRecord, transitionState } from "./src/academic/sessions.js";
import { hashStudentId } from "./src/privacy/hashIdentity.js";
import { buildReport } from "./src/academic/reportBuilder.js";
import { validateProof } from "./src/integrity/proofValidator.js";
import { createNonceGuard } from "./src/integrity/nonceGuard.js";
import { createIntegrityState } from "./src/integrity/integrityState.js";
import { validatePairingProof } from "./src/integrity/pairingValidator.js";
import { createPairingRegistry } from "./src/integrity/pairingRegistry.js";
import { safeParsedPairingHints } from "./src/integrity/pairingAuditHints.js";
import { createDaemonPairingRegistry } from "./src/device/daemonPairing.js";
import { validateDaemonProof } from "./src/device/daemonProof.js";
import {
  createDaemonStateRegistry,
  createDisplayServerLock,
  scoreDaemonRisk,
} from "./src/device/daemonState.js";
import { verifyAuditExport } from "./src/audit/verifyAudit.js";
import { appendEntry, CHAIN_CAP } from "./src/audit/hmacChain.js";
import {
  issueSessionToken,
  verifySessionToken,
  extractBearer,
} from "./src/security/sessionToken.js";
import { createReplayGuard } from "./src/security/replayGuard.js";
import votingPilotRouter from "./src/votingPilot/index.js";
import bankingPilotRouter from "./src/bankingPilot/index.js";
import llmShieldRouter from "./src/llmShield/llmShieldRouter.js";
import gatewayRouter from "./src/llmShield/gateway/gatewayRouter.js";
import {
  createRateLimiter,
  keyByIp,
  keyByHelperSecret,
  keyByInstructorToken,
  keyBySessionToken,
} from "./src/security/rateLimit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
//  .env loader — strips inline `#` comments outside quotes
//  SIMURGH_SKIP_DOTENV=1 skips the file so tests can prove the
//  fail-closed guards against a genuinely empty environment.
// ─────────────────────────────────────────────────────────────
const envPath = join(__dirname, ".env");
if (process.env.SIMURGH_SKIP_DOTENV !== "1" && existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let val = m[2];
    // strip trailing inline `#` comment (only when not inside quotes)
    const quoted = /^\s*(['"])(.*?)\1\s*(?:#.*)?$/.exec(val);
    if (quoted) val = quoted[2];
    else {
      const hashIdx = val.indexOf("#");
      if (hashIdx >= 0) val = val.slice(0, hashIdx);
    }
    process.env[m[1]] = val.trim();
  }
}

const PORT = Number(process.env.PORT) || 3030;
const MODEL = process.env.SIMURGH_MODEL || "claude-sonnet-4-6";

const apiKey = process.env.ANTHROPIC_API_KEY;
const DEMO_MODE = process.env.SIMURGH_DEMO_MODE === "1";
if (!apiKey && !DEMO_MODE) {
  console.error(
    "[simurgh] FATAL: ANTHROPIC_API_KEY must be set in non-demo mode. Refusing to start."
  );
  process.exit(78);
}
if (!apiKey && DEMO_MODE) {
  console.warn(
    "[simurgh] ANTHROPIC_API_KEY not set — using local heuristic in explicit demo mode."
  );
}
const client = apiKey ? new Anthropic({ apiKey }) : null;

// ─────────────────────────────────────────────────────────────
//  Secret bootstrap — fail fast in production, warn in demo
// ─────────────────────────────────────────────────────────────
const HELPER_SHARED_SECRET = process.env.SIMURGH_HELPER_SECRET;
if (!HELPER_SHARED_SECRET) {
  if (DEMO_MODE) {
    console.warn(
      "[simurgh] SIMURGH_HELPER_SECRET not set — /api/affinity helper ingest is DISABLED in this demo session."
    );
  } else {
    console.error(
      "[simurgh] FATAL: SIMURGH_HELPER_SECRET must be set in non-demo mode. Refusing to start."
    );
    process.exit(78);
  }
}

const AUDIT_HMAC_SECRET = process.env.SIMURGH_AUDIT_SECRET;
const AUDIT_KEY_EPHEMERAL = !AUDIT_HMAC_SECRET;
const AUDIT_KEY = AUDIT_HMAC_SECRET || crypto.randomBytes(32).toString("hex");
if (AUDIT_KEY_EPHEMERAL) {
  if (!DEMO_MODE) {
    console.error(
      "[simurgh] FATAL: SIMURGH_AUDIT_SECRET must be set in non-demo mode. Audit chains cannot be verified across restarts. Refusing to start."
    );
    process.exit(78);
  }
  console.warn("[simurgh] ⚠ SIMURGH_AUDIT_SECRET not set — audit chain HMAC key is ephemeral.");
  console.warn(
    "[simurgh] ⚠ Every restart invalidates previously exported audit chains. Set SIMURGH_AUDIT_SECRET in production."
  );
}

// Separate signing key for student session tokens. In production this MUST be set.
// In demo mode an ephemeral key is generated; tokens issued under one demo run will
// not validate after a restart (acceptable for demo).
const SESSION_SIGNING_SECRET =
  process.env.SIMURGH_SESSION_SIGNING_SECRET ||
  (DEMO_MODE ? crypto.randomBytes(32).toString("hex") : null);
if (!SESSION_SIGNING_SECRET) {
  console.error(
    "[simurgh] FATAL: SIMURGH_SESSION_SIGNING_SECRET must be set in non-demo mode. Refusing to start."
  );
  process.exit(78);
}
if (!process.env.SIMURGH_SESSION_SIGNING_SECRET && DEMO_MODE) {
  console.warn(
    "[simurgh] ⚠ SIMURGH_SESSION_SIGNING_SECRET not set — student tokens are signed with an ephemeral key (demo only)."
  );
}

const INSTRUCTOR_TOKEN = process.env.SIMURGH_INSTRUCTOR_TOKEN || (DEMO_MODE ? "demo" : null);
if (!process.env.SIMURGH_INSTRUCTOR_TOKEN && !DEMO_MODE) {
  console.error("[simurgh] FATAL: SIMURGH_INSTRUCTOR_TOKEN must be set in non-demo mode.");
  process.exit(78);
}

const ALLOWED_ORIGIN = process.env.SIMURGH_ALLOWED_ORIGIN || "*";
if (!process.env.SIMURGH_ALLOWED_ORIGIN && !DEMO_MODE) {
  console.warn(
    "[simurgh] ⚠ SIMURGH_ALLOWED_ORIGIN not set — CORS is open to all origins (*). Set this in production."
  );
}

// ─────────────────────────────────────────────────────────────
//  System prompt — sent (cached) to Claude for behavioural classification
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Simurgh, an AI security behavioral analyst monitoring a candidate during a high-stakes proctored exam. You receive 5-second telemetry windows from the candidate's browser and must classify the behavioral footprint.

THREAT MODEL (Abedini, 2026 — "The Invisible Window")
The exam runs in a browser. Traditional proctoring relies on the W3C getDisplayMedia() API to capture the candidate's screen. The disclosure paper formalises a display-fidelity violation: documented OS-level display-affinity APIs — Windows SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) and macOS NSWindow.SharingType.none — let an attacker render application windows that are fully visible on the physical display but absent from any frame returned by getDisplayMedia(). Visual surveillance is therefore unreliable on Windows 10/11 and macOS 14–26.

Simurgh implements Countermeasure C from §VI-C of the paper: detect the BEHAVIORAL footprint of cheating from input timing, focus events, and paste payloads. You do NOT see the screen, the camera, or the keystroke contents.

WHAT TO LOOK FOR (signals the paper confirms leak through, §V-C-2)
1. Impossible cognitive cadence — paste payloads (> 200 chars) with little to no manual typing in the same window, or sudden bursts of typed characters at superhuman WPM (> 250 effective WPM).
2. Suspicious context switching — the window losing focus immediately followed by a paste on refocus (classic alt-tab → copy from another source → paste workflow).
3. Repeated tab-out behavior — many short blur/focus cycles indicating consultation with another window.
4. Idle followed by paste — long zero-input gap followed by paste with no manual edits.
5. Normal studying — steady typing, occasional small pastes (< 50 chars), brief focus loss to read a question.

KNOWN BLIND SPOTS (§VI-C, must be disclosed when relevant)
You CANNOT detect the following two evasion classes from telemetry alone — the paper names them explicitly:
- Click-through overlays using WS_EX_TRANSPARENT (Windows) or ignoresMouseEvents (macOS), or GPU-layer overlays (e.g., DirectX/Metal hooks as in Cluely) — these never receive focus, so no blur fires.
- Read-don't-paste workflows where the candidate silently transcribes content from an invisible overlay — no paste, human-cadence WPM, no anomaly.
If telemetry is "too clean" for the elapsed session length (substantive answer accumulating with zero focus losses, zero pastes, and no idle gaps for an extended period), you MAY emit Warning with reasoning that explicitly notes "no behavioral signal — click-through overlay cannot be ruled out from telemetry alone (paper §VI-C); recommend pairing with Countermeasure A native helper."

OUTPUT FORMAT
Respond with ONLY a single JSON object, no prose, no code fences:
{"risk_level":"Safe|Warning|Critical","reasoning":"one short sentence citing the specific signal or naming the blind spot"}

Risk levels:
- Safe: normal exam-taking behavior with at least some natural variance
- Warning: one suspicious signal that could be benign (single medium paste, one tab-out), OR a "too clean" telemetry pattern that cannot rule out a click-through overlay
- Critical: clear evidence of external assistance (large paste after blur, superhuman cadence, repeated alt-tab + paste pattern, idle-then-paste)

Be calibrated. Most windows are Safe. Do not raise Critical for ambiguous cases. When raising the §VI-C blind-spot Warning, cite it as such.`;

// ─────────────────────────────────────────────────────────────
//  Local rule-based fallback that mirrors the system prompt.
// ─────────────────────────────────────────────────────────────
function localHeuristic(t) {
  const reasons = [];
  let level = "Safe";

  const paste = t.paste_payload_chars ?? 0;
  const pastes = t.pastes ?? 0;
  const blurs = t.focus_losses ?? 0;
  const off = t.time_off_window_ms ?? 0;
  const idle = t.max_idle_gap_ms ?? 0;
  const wpm = t.effective_wpm ?? 0;
  const typed = t.chars_typed ?? 0;

  if (paste >= 200 && typed < 20) {
    level = "Critical";
    reasons.push(`large paste of ${paste} chars with negligible manual typing`);
  } else if (blurs >= 1 && paste >= 80) {
    level = "Critical";
    reasons.push(`tab-out followed by ${paste}-char paste — classic alt-tab pattern`);
  } else if (wpm >= 250 && typed > 40) {
    level = "Critical";
    reasons.push(`superhuman typing cadence at ${wpm} WPM`);
  } else if (idle >= 8000 && paste >= 80) {
    level = "Critical";
    reasons.push(`${(idle / 1000).toFixed(1)}s idle gap then ${paste}-char paste`);
  } else if (paste >= 80 || blurs >= 2 || off >= 3000) {
    level = "Warning";
    if (paste >= 80) reasons.push(`medium paste of ${paste} chars`);
    if (blurs >= 2) reasons.push(`${blurs} focus losses in window`);
    if (off >= 3000) reasons.push(`${(off / 1000).toFixed(1)}s spent off-window`);
  } else if (blurs === 1 || (paste > 0 && paste < 80)) {
    level = "Warning";
    reasons.push(blurs ? "single tab-out — could be benign" : `small paste of ${paste} chars`);
  } else if (typed >= 60 && blurs === 0 && pastes === 0 && idle < 4000) {
    level = "Warning";
    reasons.push(
      "no behavioral signal — click-through overlay cannot be ruled out from telemetry alone (paper §VI-C)"
    );
  } else {
    reasons.push(typed > 0 ? "steady typing, no anomalies" : "idle window, no signal");
  }

  return { risk_level: level, reasoning: reasons.join("; ") };
}

// ─────────────────────────────────────────────────────────────
//  Telemetry sanitisation — strict allowlist + range clamps
//  Defends against prompt injection and oversized payloads.
// ─────────────────────────────────────────────────────────────
const TELEMETRY_SCHEMA = {
  keystrokes: { type: "int", min: 0, max: 5000 },
  chars_typed: { type: "int", min: 0, max: 5000 },
  effective_wpm: { type: "int", min: 0, max: 1000 },
  focus_losses: { type: "int", min: 0, max: 200 },
  time_off_window_ms: { type: "int", min: 0, max: 600_000 },
  pastes: { type: "int", min: 0, max: 200 },
  paste_payload_chars: { type: "int", min: 0, max: 200_000 },
  max_idle_gap_ms: { type: "int", min: 0, max: 600_000 },
  window_seconds: { type: "num", min: 0, max: 60 },
};
function sanitiseTelemetry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {};
  for (const [k, spec] of Object.entries(TELEMETRY_SCHEMA)) {
    if (!(k in raw)) {
      out[k] = 0;
      continue;
    }
    const v = Number(raw[k]);
    // Hard reject blatantly invalid inputs (NaN, Infinity, negative).
    // Clamp only for over-range positive values (browser bookkeeping drift).
    if (!Number.isFinite(v)) return null;
    if (v < 0) return null;
    if (v > spec.max * 2) return null; // 2x the documented max → caller is doing something wrong
    const clamped = Math.min(spec.max, Math.max(spec.min, v));
    out[k] = spec.type === "int" ? Math.round(clamped) : clamped;
  }
  // key_intervals (optional array) — reject if oversized
  if (Array.isArray(raw.key_intervals)) {
    if (raw.key_intervals.length > 1000) return null;
    out.key_intervals = raw.key_intervals.slice(0, 200);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  Sessions — in-memory with TTL eviction
// ─────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours of inactivity
const MAX_SESSIONS = Number(process.env.SIMURGH_MAX_SESSIONS) || 10_000;
const sessions = new Map();
const timeline = eventTimeline();
const examSessions = new Map(); // sessionId → sessionRecord (Stage 1 lifecycle)

// Stage 2: nonce guard for /api/integrity/proofs submissions
const proofNonceGuard = createNonceGuard();

// Stage 2.1: per-session integrity state with N1 strict node continuity.
const integrityState = createIntegrityState();
const pairingRegistry = createPairingRegistry({ challengeTtlMs: 60_000 });
const daemonPairingRegistry = createDaemonPairingRegistry({ challengeTtlMs: 30_000 });
const daemonStateRegistry = createDaemonStateRegistry({ staleAfterMs: 10_000 });
const displayServerLock = createDisplayServerLock();

// Replay guard for /api/telemetry submissions
const replayGuard = createReplayGuard({
  skewMs: stagingConfig.telemetryTimestampSkewMs,
  futureMs: stagingConfig.telemetryTimestampFutureMs,
});
function getSession(id, { allowCreate = true } = {}) {
  if (!sessions.has(id)) {
    if (!allowCreate) return null;
    if (sessions.size >= MAX_SESSIONS) return null;
    sessions.set(id, {
      createdAt: Date.now(),
      lastActivity: Date.now(),
      latest: null,
      history: [],
      affinity: { hostile: [], lastHeartbeat: null, source: null, forensic: null },
      auditChain: { prevHash: "GENESIS", entries: [], truncated: false },
      rate: { tokens: 3, lastRefill: Date.now() },
      // Stage 1 Academic Shield fields
      state: "active",
      examId: null,
      studentIdHash: null,
      reconnects: 0,
      startedAt: Date.now(),
      latestRiskScore: null,
      latestCategories: null,
    });
  }
  const s = sessions.get(id);
  s.lastActivity = Date.now();
  return s;
}
const evictionTimer = setInterval(
  () => {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, s] of sessions.entries()) {
      if (s.lastActivity < cutoff) sessions.delete(id);
    }
  },
  5 * 60 * 1000
).unref?.();

// Evict examSessions entries whose telemetry session has been evicted.
const examEvictionTimer = setInterval(
  () => {
    for (const [id] of examSessions.entries()) {
      if (!sessions.has(id)) examSessions.delete(id);
    }
    const activeIds = new Set(sessions.keys());
    timeline.evictMissing(activeIds);
    integrityState.evictMissing(activeIds);
    pairingRegistry.evictMissing(activeIds);
    daemonPairingRegistry.evictMissing(activeIds);
    daemonStateRegistry.evictMissing(activeIds);
    displayServerLock.evictMissing(activeIds);
  },
  5 * 60 * 1000
).unref?.();

// Token-bucket rate limit per session: 1 telemetry POST / 2.5s burst 3.
function consumeRateToken(sess) {
  const now = Date.now();
  const refill = Math.floor((now - sess.rate.lastRefill) / 2500);
  if (refill > 0) {
    sess.rate.tokens = Math.min(3, sess.rate.tokens + refill);
    sess.rate.lastRefill = now;
  }
  if (sess.rate.tokens <= 0) return false;
  sess.rate.tokens -= 1;
  return true;
}

// ─────────────────────────────────────────────────────────────
//  Server-Sent Events broadcast (instructor view)
// ─────────────────────────────────────────────────────────────
const sseClients = new Set();
function sseBroadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
      try {
        res.destroy?.();
      } catch {}
    }
  }
}

const ONE_HOUR = 3600_000;
function sessionSummary(id) {
  const s = sessions.get(id);
  if (!s) return null;
  const cutoff = Date.now() - ONE_HOUR;
  const recent = s.history.filter((v) => (v.ts || 0) >= cutoff);
  const counts = recent.reduce((a, v) => {
    const k = String(v.risk_level || "Safe").toLowerCase();
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
  return {
    sessionId: id,
    createdAt: s.createdAt,
    latest: s.latest,
    hostile_count: s.affinity.hostile.length,
    helper_active: s.affinity.lastHeartbeat != null && Date.now() - s.affinity.lastHeartbeat < 8000,
    daemon: daemonStateRegistry.get(id),
    fidelity_deficit_pct: s.affinity.forensic?.fidelity_deficit_pct ?? 0,
    counts,
    history_count: s.history.length,
  };
}

function persistVerdict(sessionId, verdict) {
  const sess = sessions.get(sessionId); // session must already exist at this point
  verdict.affinity_snapshot = {
    hostile_count: sess.affinity.hostile.length,
    hostile: sess.affinity.hostile.map((w) => ({ pid: w.pid, name: w.name, type: w.type })),
    helper_active:
      sess.affinity.lastHeartbeat != null && Date.now() - sess.affinity.lastHeartbeat < 8000,
    source: sess.affinity.source,
    forensic: sess.affinity.forensic ?? null,
  };
  verdict.device_integrity = daemonStateRegistry.get(sessionId);
  if (verdict.affinity_snapshot.hostile_count > 0 && verdict.risk_level !== "Critical") {
    verdict.risk_level = "Critical";
    const names = verdict.affinity_snapshot.hostile
      .map((w) => w.name)
      .slice(0, 2)
      .join(", ");
    verdict.reasoning =
      `Countermeasure A native helper flagged ${verdict.affinity_snapshot.hostile_count} capture-invisible window(s): ${names}. ` +
      (verdict.reasoning || "");
    verdict.reasoning = verdict.reasoning.slice(0, 280);
  }
  sess.latest = verdict;
  sess.history.unshift(verdict);
  if (sess.history.length > 50) sess.history.pop();
  appendAudit(sess, "verdict", verdict);
  sseBroadcast("verdict", { sessionId, summary: sessionSummary(sessionId), verdict });
}

function helperInfoForSession(sess, sessionId) {
  const daemonRisk = scoreDaemonRisk(daemonStateRegistry.get(sessionId));
  return {
    connected:
      sess.affinity.lastHeartbeat != null && Date.now() - sess.affinity.lastHeartbeat < 8000,
    hostileCount: sess.affinity.hostile.length,
    daemonRisk: daemonRisk.daemon_risk,
    daemonForceCritical: daemonRisk.forceCritical,
  };
}

function appendAudit(sess, type, payload) {
  appendEntry(sess.auditChain, AUDIT_KEY, type, payload);
}

// ─────────────────────────────────────────────────────────────
//  Express app
// ─────────────────────────────────────────────────────────────
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: stagingConfig.jsonBodyLimit }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!DEMO_MODE) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  next();
});

// Minimal CORS — locked to ALLOWED_ORIGIN (default same-origin "*" deny would
// break local dev; we explicitly list * for now and recommend overriding).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, authorization, x-simurgh-helper-secret"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.static(join(__dirname, "public")));
app.use("/api/voting-pilot", votingPilotRouter);
app.use("/api/banking-pilot", bankingPilotRouter);
app.use("/api/llm-shield/gateway", gatewayRouter);
app.use("/api/llm-shield", llmShieldRouter);

// Instructor route — serves the shell page. Data APIs below remain bearer-gated
// outside explicit demo mode, keeping long-lived tokens out of URLs and logs.
app.get("/instructor", (req, res) => {
  res.sendFile(join(__dirname, "public", "instructor.html"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now(), demo_mode: !!DEMO_MODE, sessions: sessions.size });
});

// Auth gate for instructor endpoints (dashboard, sessions list, audit, SSE).
function requireInstructorAuth(req, res, next) {
  if (DEMO_MODE) return next();
  const auth = req.headers.authorization;
  const bearer = auth && /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, "") : null;
  if (bearer !== INSTRUCTOR_TOKEN) return res.status(401).json({ error: "auth_required" });
  next();
}

function privacySafeDaemonRejectReason(reason) {
  return reason === "forbidden_local_field" || String(reason).startsWith("forbidden_field:")
    ? "forbidden_local_field"
    : reason;
}

// Auth gate for student session endpoints. Token is issued at /join and must
// bind to the sessionId in the URL or body. The bearer token is the canonical
// source; ?token= query is NOT accepted to avoid leaking via logs.
function requireSessionToken(req, res, next) {
  const sessionIdFromUrl = req.params?.sessionId;
  const sessionIdFromBody = req.body?.sessionId;
  const claimedSessionId = sessionIdFromUrl || sessionIdFromBody;
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "session_token_required" });
  const result = verifySessionToken(token, SESSION_SIGNING_SECRET);
  if (!result.valid) return res.status(401).json({ error: result.reason });
  if (claimedSessionId && result.sessionId !== claimedSessionId) {
    return res.status(401).json({ error: "token_session_mismatch" });
  }
  req.sessionTokenSessionId = result.sessionId;
  next();
}

// Pre-configured rate limiters
const limitJoin = createRateLimiter({ windowMs: 60_000, max: 10, keyFn: keyByIp, name: "join" });
const limitAffinity = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  keyFn: keyByHelperSecret,
  name: "affinity",
});
const limitReport = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  keyFn: keyByInstructorToken,
  name: "report",
});
const limitVerify = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  keyFn: keyByInstructorToken,
  name: "verify",
});
const limitSessions = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  keyFn: keyByInstructorToken,
  name: "sessions",
});
const limitIntegrityProof = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  keyFn: keyBySessionToken,
  name: "integrity_proof",
});
const limitPairingChallenge = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  keyFn: keyBySessionToken,
  name: "pairing_challenge",
});
const limitPairingComplete = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  keyFn: keyBySessionToken,
  name: "pairing_complete",
});
const limitDeviceChallenge = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  keyFn: keyBySessionToken,
  name: "device_challenge",
});
const limitDevicePair = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  keyFn: keyBySessionToken,
  name: "device_pair",
});

// ─────────────────────────────────────────────────────────────
//  Stage 2.3 — device daemon challenge + pairing
// ─────────────────────────────────────────────────────────────
app.post("/api/device/challenge", limitDeviceChallenge, requireSessionToken, (req, res) => {
  const sessionId = req.sessionTokenSessionId;
  const sess = sessions.get(sessionId);
  if (!sess) return res.status(409).json({ error: "session_expired_or_evicted" });
  const purpose = String(req.body?.purpose ?? "");
  const result = daemonPairingRegistry.createChallenge(sessionId, purpose, Date.now());
  if (!result.ok) return res.status(400).json({ error: result.reason });
  appendAudit(sess, EVENTS.DAEMON_PAIRING_CHALLENGE_ISSUED, {
    purpose,
    challenge_id_hash: result.challenge_hash,
    expires_at: new Date(result.expires_at).toISOString(),
  });
  res.json({
    challenge: result.challenge,
    expires_in_ms: result.expires_in_ms,
    purpose,
  });
});

app.post("/api/device/pair", limitDevicePair, requireSessionToken, (req, res) => {
  const sessionId = req.sessionTokenSessionId;
  const sess = sessions.get(sessionId);
  const record = examSessions.get(sessionId);
  if (!sess || !record) return res.status(409).json({ error: "session_expired_or_evicted" });
  const result = daemonPairingRegistry.completePairing(req.body, {
    sessionId,
    examId: record.examId,
    now: Date.now(),
  });
  if (!result.ok) {
    const safeReason = privacySafeDaemonRejectReason(result.reason);
    daemonStateRegistry.recordRejected(sessionId, { reason: safeReason });
    appendAudit(sess, EVENTS.DAEMON_PROOF_REJECTED, {
      reason: safeReason,
      stage: "pair",
    });
    return res.status(result.reason === "invalid_signature" ? 401 : 409).json({
      error: result.reason,
    });
  }
  daemonStateRegistry.recordPaired(sessionId, {
    node_id_hash: result.node_id_hash,
    public_key: result.public_key,
    daemon_version: result.daemon_version,
    platform: result.platform,
    now: result.paired_at,
  });
  appendAudit(sess, EVENTS.DAEMON_PAIRED, {
    node_id_hash: result.node_id_hash,
    daemon_version: result.daemon_version,
    platform: result.platform,
    challenge_id_hash: result.challenge_hash,
  });
  timeline.add(sessionId, EVENTS.DAEMON_PAIRED, {
    node_id_hash: result.node_id_hash,
    daemon_version: result.daemon_version,
  });
  sseBroadcast("daemon", { sessionId, summary: sessionSummary(sessionId) });
  res.json({
    status: "paired",
    session_id: sessionId,
    node_id_hash: result.node_id_hash,
    daemon_version: result.daemon_version,
    paired_at: new Date(result.paired_at).toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
//  /api/telemetry — candidate-side ingest (rate-limited, validated)
// ─────────────────────────────────────────────────────────────
app.post("/api/telemetry", async (req, res) => {
  const sessionId = String(req.body?.sessionId ?? "").slice(0, 64);
  if (!sessionId || !/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    return res.status(400).json({ error: "valid sessionId required" });
  }

  // Session token enforcement:
  //   - If the session was created via /api/exams/:id/join, token is REQUIRED.
  //   - If not (legacy direct-telemetry session), token is OPTIONAL (no identity bound).
  // This protects authenticated exam sessions while preserving direct-test workflows.
  const examRecord = examSessions.get(sessionId);
  if (examRecord) {
    const bearer = extractBearer(req);
    if (!bearer) return res.status(401).json({ error: "session_token_required" });
    const ver = verifySessionToken(bearer, SESSION_SIGNING_SECRET);
    if (!ver.valid) return res.status(401).json({ error: ver.reason });
    if (ver.sessionId !== sessionId)
      return res.status(401).json({ error: "token_session_mismatch" });
  }

  const telemetry = sanitiseTelemetry(req.body?.telemetry);
  if (!telemetry) return res.status(400).json({ error: "telemetry_payload_invalid" });

  const sess = getSession(sessionId);
  if (!sess) return res.status(503).json({ error: "server_capacity_exceeded" });

  // Block telemetry on closed/submitted sessions to protect the audit record.
  const closedStates = new Set([STATES.SUBMITTED, STATES.REPORT_GENERATED, STATES.CLOSED]);
  if (examRecord && closedStates.has(examRecord.state)) {
    return res.status(403).json({ error: "session_closed", state: examRecord.state });
  }

  if (!consumeRateToken(sess)) {
    return res.status(429).json({ error: "rate_limited", retry_after_ms: 2500 });
  }

  if (
    (stagingConfig.requireDaemonProof || req.body?.daemon_required === true) &&
    !req.body?.daemon_proof
  ) {
    daemonStateRegistry.recordMissing(sessionId);
    appendAudit(sess, EVENTS.DAEMON_MISSING, {
      daemon_state: "missing",
      reason: stagingConfig.requireDaemonProof
        ? "daemon_proof_required"
        : "telemetry_without_daemon_proof",
    });
    if (stagingConfig.requireDaemonProof) {
      return res.status(428).json({ error: "daemon_proof_required" });
    }
  }

  // Replay protection — required when sequence + timestamp are provided.
  // For backward compatibility, telemetry without these fields uses only the
  // legacy token-bucket rate limiter below. New clients send both.
  const sequence = req.body?.sequence;
  const clientTs = req.body?.timestamp;
  if (sequence !== undefined || clientTs !== undefined) {
    const ts = typeof clientTs === "number" ? clientTs : Date.parse(clientTs);
    const result = replayGuard.check(sessionId, sequence, ts);
    if (!result.ok) return res.status(400).json({ error: result.reason });
  }

  if (req.body?.daemon_proof) {
    const pairedDaemon = daemonPairingRegistry.getPairedNode(sessionId);
    const daemonValidation = validateDaemonProof(req.body.daemon_proof, {
      now: Date.now(),
      expectedSessionId: sessionId,
      expectedExamId: examRecord?.examId ?? null,
      pairedNode: pairedDaemon,
    });
    if (!daemonValidation.ok) {
      const safeReason = privacySafeDaemonRejectReason(daemonValidation.reason);
      daemonStateRegistry.recordRejected(sessionId, { reason: safeReason });
      appendAudit(sess, EVENTS.DAEMON_PROOF_REJECTED, {
        reason: safeReason,
        node_id_hash_if_paired: pairedDaemon?.node_id_hash ?? null,
      });
      if (daemonValidation.reason === "forbidden_local_field") {
        appendAudit(sess, EVENTS.SCANNER_PRIVACY_REJECTED, {
          reason: safeReason,
          privacy_mode: "metadata_only",
        });
      }
      return res.status(daemonValidation.reason === "invalid_signature" ? 401 : 409).json({
        error: daemonValidation.reason,
      });
    }
    const consumed = daemonPairingRegistry.consumeChallenge(
      sessionId,
      daemonValidation.proof.challenge,
      "proof",
      Date.now()
    );
    if (!consumed.ok) {
      daemonStateRegistry.recordRejected(sessionId, { reason: consumed.reason });
      appendAudit(sess, EVENTS.DAEMON_PROOF_REJECTED, {
        reason: consumed.reason,
        node_id_hash: daemonValidation.proof.node_id_hash,
      });
      return res.status(409).json({ error: consumed.reason });
    }
    if (daemonValidation.proof.platform === "linux" && daemonValidation.proof.display_server) {
      const lockResult = displayServerLock.observe(
        sessionId,
        daemonValidation.proof.display_server
      );
      if (!lockResult.ok) {
        appendAudit(sess, EVENTS.DAEMON_PROOF_REJECTED, {
          reason: "display_server_mismatch",
          locked_display_server: lockResult.locked_display_server,
          observed_display_server: lockResult.observed_display_server,
          node_id_hash: daemonValidation.proof.node_id_hash,
        });
        return res.status(409).json({ error: "display_server_mismatch" });
      }
    }
    daemonStateRegistry.recordProofVerified(sessionId, {
      sequence: daemonValidation.proof.sequence,
      platform: daemonValidation.proof.platform,
      capture_excluded_window_count: daemonValidation.proof.capture_excluded_window_count,
      capture_restricted_window_count: daemonValidation.proof.capture_restricted_window_count,
      monitor_only_window_count: daemonValidation.proof.monitor_only_window_count,
      helper_state: daemonValidation.proof.helper_state,
      scanner_state: daemonValidation.proof.scanner_state,
      scanner_version: daemonValidation.proof.scanner_version,
      scan_timestamp: daemonValidation.proof.scan_timestamp,
      scan_duration_ms: daemonValidation.proof.scan_duration_ms,
      scan_error_count: daemonValidation.proof.scan_error_count,
      suspicious_window_count: daemonValidation.proof.suspicious_window_count,
      visible_window_count: daemonValidation.proof.visible_window_count,
      timestamp: daemonValidation.proof.timestamp,
      challenge_id_hash: daemonValidation.proof.challenge_id_hash,
      // Stage 2.8B: forward Linux-specific scanner fields. The recorder
      // defaults them to 0/null when absent (macOS/Windows path is unaffected).
      x11_managed_window_count: daemonValidation.proof.x11_managed_window_count,
      x11_override_redirect_window_count: daemonValidation.proof.x11_override_redirect_window_count,
      x11_above_window_count: daemonValidation.proof.x11_above_window_count,
      x11_fullscreen_window_count: daemonValidation.proof.x11_fullscreen_window_count,
      x11_skip_taskbar_window_count: daemonValidation.proof.x11_skip_taskbar_window_count,
      xwayland_window_count: daemonValidation.proof.xwayland_window_count,
      display_server: daemonValidation.proof.display_server,
      coverage: daemonValidation.proof.coverage,
      portal_advertised: daemonValidation.proof.portal_advertised,
      portal_active: daemonValidation.proof.portal_active,
    });
    appendAudit(sess, EVENTS.DAEMON_PROOF_VERIFIED, {
      node_id_hash: daemonValidation.proof.node_id_hash,
      daemon_version: daemonValidation.proof.daemon_version,
      platform: daemonValidation.proof.platform,
      proof_timestamp: daemonValidation.proof.timestamp,
      capture_excluded_window_count: daemonValidation.proof.capture_excluded_window_count,
      capture_restricted_window_count: daemonValidation.proof.capture_restricted_window_count,
      monitor_only_window_count: daemonValidation.proof.monitor_only_window_count,
      helper_state: daemonValidation.proof.helper_state,
      scanner_state: daemonValidation.proof.scanner_state,
      scanner_version: daemonValidation.proof.scanner_version,
      visible_window_count: daemonValidation.proof.visible_window_count,
      suspicious_window_count: daemonValidation.proof.suspicious_window_count,
      scan_duration_ms: daemonValidation.proof.scan_duration_ms,
      scan_error_count: daemonValidation.proof.scan_error_count,
      privacy_mode: daemonValidation.proof.privacy_mode,
      challenge_id_hash: daemonValidation.proof.challenge_id_hash,
    });
    appendAudit(sess, EVENTS.SCANNER_SCAN_COMPLETED, {
      scanner_state: daemonValidation.proof.scanner_state,
      capture_excluded_window_count: daemonValidation.proof.capture_excluded_window_count,
      capture_restricted_window_count: daemonValidation.proof.capture_restricted_window_count,
      monitor_only_window_count: daemonValidation.proof.monitor_only_window_count,
      visible_window_count: daemonValidation.proof.visible_window_count,
      scan_duration_ms: daemonValidation.proof.scan_duration_ms,
      privacy_mode: daemonValidation.proof.privacy_mode,
    });
    if (daemonValidation.proof.scanner_state === "permission_denied") {
      appendAudit(sess, EVENTS.SCANNER_PERMISSION_DENIED, {
        scanner_state: daemonValidation.proof.scanner_state,
        scan_error_count: daemonValidation.proof.scan_error_count,
        privacy_mode: daemonValidation.proof.privacy_mode,
      });
    } else if (daemonValidation.proof.scanner_state === "scanner_unavailable") {
      appendAudit(sess, EVENTS.SCANNER_UNAVAILABLE, {
        scanner_state: daemonValidation.proof.scanner_state,
        scan_error_count: daemonValidation.proof.scan_error_count,
        privacy_mode: daemonValidation.proof.privacy_mode,
      });
    } else if (daemonValidation.proof.scanner_state === "scan_error") {
      appendAudit(sess, EVENTS.SCANNER_ERROR, {
        scanner_state: daemonValidation.proof.scanner_state,
        scan_error_count: daemonValidation.proof.scan_error_count,
        privacy_mode: daemonValidation.proof.privacy_mode,
      });
    }
    if (daemonValidation.proof.capture_excluded_window_count > 0) {
      appendAudit(sess, EVENTS.SCANNER_RISK_DETECTED, {
        scanner_state: daemonValidation.proof.scanner_state,
        capture_excluded_window_count: daemonValidation.proof.capture_excluded_window_count,
        visible_window_count: daemonValidation.proof.visible_window_count,
        scan_duration_ms: daemonValidation.proof.scan_duration_ms,
        privacy_mode: daemonValidation.proof.privacy_mode,
      });
      appendAudit(sess, EVENTS.DEVICE_RISK_ESCALATED, {
        daemon_state: "risk_detected",
        capture_excluded_window_count: daemonValidation.proof.capture_excluded_window_count,
      });
      timeline.add(sessionId, EVENTS.DEVICE_RISK_ESCALATED, {
        daemon_state: "risk_detected",
      });
    }
  }

  if (!client || DEMO_MODE) {
    const normed = normaliseTelemetry(telemetry) ?? telemetry;
    const scored = scoreAcademicRisk(normed, helperInfoForSession(sess, sessionId), {
      reconnects: sess.reconnects || 0,
      startedAt: sess.startedAt,
    });
    const verdict = {
      risk_level: scored.risk_level,
      risk_score: scored.risk_score,
      confidence: scored.confidence,
      categories: scored.categories,
      reasoning: scored.reasoning || scored.recommendation,
      recommendation: scored.recommendation,
      source: scored.source,
      ts: Date.now(),
      cache: { creation: 0, read: 0 },
    };
    sess.latestRiskScore = scored.risk_score;
    sess.latestCategories = scored.categories;
    timeline.add(sessionId, EVENTS.TELEMETRY_WINDOW_RECEIVED, {
      risk_level: scored.risk_level,
      risk_score: scored.risk_score,
    });
    if (telemetry.focus_losses > 0)
      timeline.add(sessionId, EVENTS.FOCUS_LOSS, { count: telemetry.focus_losses });
    if (telemetry.paste_payload_chars >= 200)
      timeline.add(sessionId, EVENTS.BULK_PASTE, { chars: telemetry.paste_payload_chars });
    if (telemetry.effective_wpm >= 250)
      timeline.add(sessionId, EVENTS.ABNORMAL_WPM_SPIKE, { wpm: telemetry.effective_wpm });
    if (telemetry.max_idle_gap_ms >= 60000)
      timeline.add(sessionId, EVENTS.LONG_IDLE_GAP, { ms: telemetry.max_idle_gap_ms });
    persistVerdict(sessionId, verdict);
    return res.json(verdict);
  }

  try {
    const normed = normaliseTelemetry(telemetry) ?? telemetry;
    const scored = scoreAcademicRisk(normed, helperInfoForSession(sess, sessionId), {
      reconnects: sess.reconnects || 0,
      startedAt: sess.startedAt,
    });

    // Honour stagingConfig.claudeOnSafe — skip Claude call for Safe verdicts to reduce cost.
    if (scored.risk_level === "Safe" && !stagingConfig.claudeOnSafe) {
      const verdict = {
        risk_level: scored.risk_level,
        risk_score: scored.risk_score,
        confidence: scored.confidence,
        categories: scored.categories,
        reasoning: scored.recommendation,
        recommendation: scored.recommendation,
        source: { score: "local_heuristic", reasoning: "skipped-safe" },
        ts: Date.now(),
        cache: { creation: 0, read: 0 },
      };
      sess.latestRiskScore = scored.risk_score;
      sess.latestCategories = scored.categories;
      timeline.add(sessionId, EVENTS.TELEMETRY_WINDOW_RECEIVED, {
        risk_level: scored.risk_level,
        risk_score: scored.risk_score,
      });
      if (telemetry.focus_losses > 0)
        timeline.add(sessionId, EVENTS.FOCUS_LOSS, { count: telemetry.focus_losses });
      if (telemetry.paste_payload_chars >= 200)
        timeline.add(sessionId, EVENTS.BULK_PASTE, { chars: telemetry.paste_payload_chars });
      if (telemetry.effective_wpm >= 250)
        timeline.add(sessionId, EVENTS.ABNORMAL_WPM_SPIKE, { wpm: telemetry.effective_wpm });
      if (telemetry.max_idle_gap_ms >= 60000)
        timeline.add(sessionId, EVENTS.LONG_IDLE_GAP, { ms: telemetry.max_idle_gap_ms });
      persistVerdict(sessionId, verdict);
      return res.json(verdict);
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Telemetry window (last 5 seconds):\n\`\`\`json\n${JSON.stringify(telemetry, null, 2)}\n\`\`\``,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    let parsed;
    try {
      const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { risk_level: "Safe", reasoning: "Model output unparseable; defaulting to Safe." };
    }

    const claudeReasoning = String(parsed.reasoning ?? "").slice(0, 280);
    const verdict = {
      risk_level: scored.risk_level,
      risk_score: scored.risk_score,
      confidence: scored.confidence,
      categories: scored.categories,
      reasoning: claudeReasoning || scored.recommendation,
      recommendation: scored.recommendation,
      source: { score: "local_heuristic", reasoning: "claude_narrative" },
      ts: Date.now(),
      cache: {
        creation: response.usage?.cache_creation_input_tokens ?? 0,
        read: response.usage?.cache_read_input_tokens ?? 0,
      },
    };
    sess.latestRiskScore = scored.risk_score;
    sess.latestCategories = scored.categories;
    timeline.add(sessionId, EVENTS.TELEMETRY_WINDOW_RECEIVED, {
      risk_level: scored.risk_level,
      risk_score: scored.risk_score,
    });
    if (telemetry.focus_losses > 0)
      timeline.add(sessionId, EVENTS.FOCUS_LOSS, { count: telemetry.focus_losses });
    if (telemetry.paste_payload_chars >= 200)
      timeline.add(sessionId, EVENTS.BULK_PASTE, { chars: telemetry.paste_payload_chars });
    if (telemetry.effective_wpm >= 250)
      timeline.add(sessionId, EVENTS.ABNORMAL_WPM_SPIKE, { wpm: telemetry.effective_wpm });
    if (telemetry.max_idle_gap_ms >= 60000)
      timeline.add(sessionId, EVENTS.LONG_IDLE_GAP, { ms: telemetry.max_idle_gap_ms });
    persistVerdict(sessionId, verdict);
    res.json(verdict);
  } catch (err) {
    const msg = err?.message ?? String(err);
    const lowCredit = /credit balance is too low/i.test(msg);
    if (lowCredit) console.warn("[simurgh] anthropic low-credit — falling back to local heuristic");
    else console.error("[simurgh] anthropic error:", msg);
    const normed = normaliseTelemetry(telemetry) ?? telemetry;
    const scored = scoreAcademicRisk(normed, helperInfoForSession(sess, sessionId), {
      reconnects: sess.reconnects || 0,
      startedAt: sess.startedAt,
    });
    const verdict = {
      risk_level: scored.risk_level,
      risk_score: scored.risk_score,
      confidence: scored.confidence,
      categories: scored.categories,
      reasoning: scored.recommendation,
      recommendation: scored.recommendation,
      source: {
        score: "local_heuristic",
        reasoning: lowCredit ? "fallback-low-credit" : "fallback-error",
      },
      ts: Date.now(),
      cache: { creation: 0, read: 0 },
    };
    sess.latestRiskScore = scored.risk_score;
    sess.latestCategories = scored.categories;
    persistVerdict(sessionId, verdict);
    res.json(verdict);
  }
});

// ─────────────────────────────────────────────────────────────
//  /api/dashboard — instructor endpoint (auth-gated outside demo)
// ─────────────────────────────────────────────────────────────
app.get("/api/dashboard/:sessionId", requireInstructorAuth, (req, res) => {
  const sess = sessions.get(req.params.sessionId);
  res.json({
    latest: sess?.latest ?? null,
    history: sess?.history ?? [],
    affinity: sess?.affinity ?? { hostile: [], lastHeartbeat: null, source: null },
    daemon: daemonStateRegistry.get(req.params.sessionId),
  });
});

// ─────────────────────────────────────────────────────────────
//  Countermeasure A — native helper ingest (paper §VI-A)
// ─────────────────────────────────────────────────────────────
function ingestAffinity(req, res, opts = {}) {
  const sessionId = String(req.body?.sessionId ?? "").slice(0, 64);
  const { hostile, helper, forensic } = req.body ?? {};
  if (!sessionId || !/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    return res.status(400).json({ error: "valid sessionId required" });
  }

  const sess = getSession(sessionId);
  if (!sess) return res.status(503).json({ error: "server_capacity_exceeded" });
  const list = Array.isArray(hostile)
    ? hostile.slice(0, 64).map((w) => ({
        pid: Number(w.pid) || 0,
        name: String(w.name ?? "unknown").slice(0, 80),
        type: String(w.type ?? "unknown").slice(0, 40),
        since: Number(w.since) || Date.now(),
      }))
    : [];

  const prev = sess.affinity.hostile;
  const sigOf = (l) =>
    l
      .map((w) => `${w.pid}|${w.name}|${w.type}`)
      .sort()
      .join(";");
  const transition = sigOf(prev) !== sigOf(list);

  const f =
    forensic && typeof forensic === "object" && !Array.isArray(forensic)
      ? {
          display_width: Number(forensic.display_width) || 0,
          display_height: Number(forensic.display_height) || 0,
          display_pixels: Number(forensic.display_pixels) || 0,
          invisible_pixels: Number(forensic.invisible_pixels) || 0,
          fidelity_deficit_pct: Number(forensic.fidelity_deficit_pct) || 0,
          visible_window_count: Number(forensic.visible_window_count) || 0,
          hostile_window_count: Number(forensic.hostile_window_count) || 0,
        }
      : null;

  const sourceLabel = opts.simulator
    ? "simurgh-helper-simulator/0.1"
    : String(helper ?? "native-helper").slice(0, 40);

  sess.affinity = { hostile: list, lastHeartbeat: Date.now(), source: sourceLabel, forensic: f };

  if (transition) {
    appendAudit(sess, "affinity", {
      hostile_count: list.length,
      hostile: list,
      helper: sourceLabel,
      forensic: f,
    });
    sseBroadcast("affinity", {
      sessionId,
      summary: sessionSummary(sessionId),
      hostile: list,
      forensic: f,
    });
  }
  res.json({ ok: true, transition });
}

// Real helper — secret-gated. Disabled when no secret configured.
app.post("/api/affinity", limitAffinity, (req, res) => {
  if (!HELPER_SHARED_SECRET) return res.status(503).json({ error: "helper_ingest_disabled" });
  const secret = req.headers["x-simurgh-helper-secret"];
  if (secret !== HELPER_SHARED_SECRET)
    return res.status(401).json({ error: "invalid_helper_secret" });
  ingestAffinity(req, res);
});

// Demo simulator — only available in DEMO_MODE.
app.post("/api/affinity/simulate", (req, res) => {
  if (!DEMO_MODE) return res.status(403).json({ error: "simulator_disabled_outside_demo" });
  ingestAffinity(req, res, { simulator: true });
});

// Per-session affinity status — open (only helper-status, no verdict data).
app.get("/api/affinity/:sessionId", (req, res) => {
  const sess = sessions.get(req.params.sessionId);
  if (!sess) return res.json({ hostile: [], lastHeartbeat: null, source: null, forensic: null });
  res.json(sess.affinity);
});

// ─────────────────────────────────────────────────────────────
//  Audit log — tamper-evident HMAC chain (paper §VI-F)
// ─────────────────────────────────────────────────────────────
app.get("/api/audit/:sessionId", requireInstructorAuth, (req, res) => {
  const sess = sessions.get(req.params.sessionId);
  if (!sess) return res.status(404).json({ error: "session not found" });
  res.setHeader(
    "content-disposition",
    `attachment; filename="simurgh-audit-${req.params.sessionId}.json"`
  );
  res.json({
    sessionId: req.params.sessionId,
    generated_at: new Date().toISOString(),
    chain_terminator: sess.auditChain.prevHash,
    entry_count: sess.auditChain.entries.length,
    truncated: !!sess.auditChain.truncated,
    cap: CHAIN_CAP,
    hmac_algorithm: "HMAC-SHA256",
    hmac_key_ephemeral: AUDIT_KEY_EPHEMERAL,
    entries: sess.auditChain.entries,
    notes:
      "HMAC-SHA256 chain. Each entry signs its content + the previous entry's signature. Tampering with any entry invalidates every subsequent signature. Verify with tools/verify-audit.mjs.",
  });
});

// ─────────────────────────────────────────────────────────────
//  Instructor view — multi-session aggregator (auth-gated)
// ─────────────────────────────────────────────────────────────
app.get("/api/sessions", limitSessions, requireInstructorAuth, (_req, res) => {
  const out = [];
  for (const id of sessions.keys()) {
    const s = sessionSummary(id);
    if (s) out.push(s);
  }
  out.sort((a, b) => (b.latest?.ts ?? b.createdAt) - (a.latest?.ts ?? a.createdAt));
  res.json({ sessions: out, model: MODEL });
});

// SSE stream — auth-gated. EventSource cannot send bearer headers, so the
// instructor client falls back to polling outside explicit demo mode.
app.get("/api/stream/instructor", requireInstructorAuth, (req, res) => {
  res.set({
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.flushHeaders?.();
  res.write(`event: hello\ndata: ${JSON.stringify({ ts: Date.now(), model: MODEL })}\n\n`);
  sseClients.add(res);
  const ka = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      sseClients.delete(res);
      clearInterval(ka);
      try {
        res.destroy?.();
      } catch {}
    }
  }, 25_000);
  req.on("close", () => {
    clearInterval(ka);
    sseClients.delete(res);
  });
});

app.get("/api/meta", (_req, res) => {
  res.json({ model: MODEL, demo_mode: !!DEMO_MODE });
});

// ─────────────────────────────────────────────────────────────
//  Stage 1 Academic Shield — exam lifecycle endpoints
// ─────────────────────────────────────────────────────────────

// Create exam (instructor only)
app.post("/api/exams", requireInstructorAuth, (req, res) => {
  const { title, durationMinutes, description } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title required" });
  const exam = createExam({ title, durationMinutes, description });
  res.status(201).json(exam);
});

// List exams (instructor only)
app.get("/api/exams", requireInstructorAuth, (_req, res) => {
  res.json({ exams: listExams() });
});

// Student joins exam — creates session record linked to exam
app.post("/api/exams/:examId/join", limitJoin, (req, res) => {
  const exam = getExam(req.params.examId);
  if (!exam) return res.status(404).json({ error: "exam not found" });
  const rawStudentId = String(req.body?.studentId ?? "").slice(0, 256);
  if (!rawStudentId) return res.status(400).json({ error: "studentId required" });
  const studentIdHash = hashStudentId(rawStudentId);
  const sessionId =
    String(req.body?.sessionId ?? "").slice(0, 64) ||
    `sess_${crypto.randomBytes(6).toString("hex")}`;
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    return res.status(400).json({ error: "invalid sessionId format" });
  }
  if (examSessions.has(sessionId)) {
    return res.status(409).json({ error: "sessionId already in use" });
  }
  let record = createSessionRecord(exam.id, studentIdHash);
  record = { ...record, id: sessionId };
  record = transitionState(record, STATES.JOINED);
  examSessions.set(sessionId, record);
  const telSess = getSession(sessionId); // ensure telemetry session exists
  if (!telSess) {
    examSessions.delete(sessionId);
    return res.status(503).json({ error: "server_capacity_exceeded" });
  }
  const sessionToken = issueSessionToken(
    sessionId,
    SESSION_SIGNING_SECRET,
    stagingConfig.sessionTokenTtlMs
  );
  res.json({ sessionId, examId: exam.id, studentIdHash, state: record.state, sessionToken });
});

// Student accepts privacy notice
app.post("/api/sessions/:sessionId/privacy-accept", requireSessionToken, (req, res) => {
  const record = examSessions.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session not found" });
  try {
    const updated = transitionState(record, STATES.PRIVACY_ACCEPTED);
    examSessions.set(req.params.sessionId, updated);
    timeline.add(req.params.sessionId, EVENTS.PRIVACY_ACCEPTED, {});
    res.json({ state: updated.state });
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

// Start exam
app.post("/api/sessions/:sessionId/start", requireSessionToken, (req, res) => {
  const record = examSessions.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session not found" });
  try {
    const canStart = [STATES.PRIVACY_ACCEPTED, STATES.HELPER_CONNECTED].includes(record.state);
    if (!canStart)
      return res.status(409).json({ error: `Cannot start from state: ${record.state}` });
    let updated = transitionState(record, STATES.EXAM_STARTED);
    updated = { ...updated, startedAt: Date.now() };
    const sess = getSession(req.params.sessionId);
    sess.startedAt = updated.startedAt;
    examSessions.set(req.params.sessionId, updated);
    timeline.add(req.params.sessionId, EVENTS.EXAM_STARTED, { examId: record.examId });
    appendAudit(sess, "exam_started", { examId: record.examId, ts: updated.startedAt });
    res.json({ state: updated.state, startedAt: updated.startedAt });
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

// Submit exam
app.post("/api/sessions/:sessionId/submit", requireSessionToken, (req, res) => {
  let record = examSessions.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session not found" });
  try {
    // If still in exam_started, transition through active first
    if (record.state === STATES.EXAM_STARTED) {
      record = transitionState(record, STATES.ACTIVE);
    }
    let updated = transitionState(record, STATES.SUBMITTED);
    updated = { ...updated, submittedAt: Date.now() };
    examSessions.set(req.params.sessionId, updated);
    const sess = getSession(req.params.sessionId);
    timeline.add(req.params.sessionId, EVENTS.EXAM_SUBMITTED, { ts: updated.submittedAt });
    appendAudit(sess, "exam_submitted", { ts: updated.submittedAt });
    sseBroadcast("session_submitted", { sessionId: req.params.sessionId });
    res.json({ state: updated.state, submittedAt: updated.submittedAt });
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

// Report export — assembles JSON report for a session
app.get("/api/sessions/:sessionId/report", limitReport, requireInstructorAuth, (req, res) => {
  const { sessionId } = req.params;
  const sess = sessions.get(sessionId);
  const record = examSessions.get(sessionId);
  if (!sess && !record) return res.status(404).json({ error: "session not found" });

  const { valid: auditValid } = verifyAuditExport(
    { entries: sess?.auditChain?.entries ?? [], truncated: sess?.auditChain?.truncated ?? false },
    AUDIT_KEY
  );

  const report = buildReport(
    record ?? {
      id: sessionId,
      examId: null,
      studentIdHash: null,
      state: "active",
      createdAt: sess?.createdAt ?? Date.now(),
      startedAt: sess?.startedAt ?? null,
      submittedAt: null,
      reconnects: 0,
    },
    {
      latest: sess?.latest ?? null,
      affinity: sess?.affinity ?? { hostile: [], lastHeartbeat: null, source: null },
      daemon: daemonStateRegistry.get(sessionId),
    },
    timeline.get(sessionId),
    auditValid
  );

  timeline.add(sessionId, EVENTS.REPORT_GENERATED, { report_id: report.report_id });
  if (sess) appendAudit(sess, "report_generated", { report_id: report.report_id });

  res.json(report);
});

// Audit chain verification endpoint
app.get("/api/audit/:sessionId/verify", limitVerify, requireInstructorAuth, (req, res) => {
  const sess = sessions.get(req.params.sessionId);
  if (!sess) return res.status(404).json({ error: "session not found" });

  const result = verifyAuditExport(
    { entries: sess.auditChain.entries, truncated: sess.auditChain.truncated },
    AUDIT_KEY
  );

  timeline.add(req.params.sessionId, EVENTS.AUDIT_VERIFIED, { valid: result.valid });
  sseBroadcast("audit_verified", { sessionId: req.params.sessionId, valid: result.valid });

  res.json({ sessionId: req.params.sessionId, ...result });
});

// Stage 2.2: pairing — issue a one-time challenge for the authenticated session.
app.post(
  "/api/integrity/pairing/challenge",
  limitPairingChallenge,
  requireSessionToken,
  (req, res) => {
    const sessionId = req.sessionTokenSessionId;
    const sess = sessions.get(sessionId);
    if (!sess) return res.status(409).json({ error: "session_expired_or_evicted" });

    const result = pairingRegistry.createChallenge(sessionId, Date.now());
    if (!result.ok) {
      appendAudit(sess, EVENTS.INTEGRITY_PAIRING_REJECTED, {
        reason: result.reason,
        node_id_hash_if_parsed: null,
        challenge_hash_if_parsed: null,
        has_signature: false,
        stage: "challenge_request",
      });
      return res.status(409).json({ error: result.reason });
    }

    appendAudit(sess, EVENTS.INTEGRITY_PAIRING_CHALLENGE_CREATED, {
      challenge_hash: result.challenge_hash,
      expires_at: new Date(result.expires_at).toISOString(),
      platform: "macos",
    });

    return res.status(200).json({
      status: "challenge_created",
      session_id: sessionId,
      challenge: result.challenge,
      expires_at: new Date(result.expires_at).toISOString(),
      note: "Sign this challenge with the macOS Simurgh node and POST the result to /api/integrity/pairing/complete. Expires in 60 s.",
    });
  }
);

// Stage 2.2: pairing — verify a node-signed pairing payload and bind the node to the session.
app.post(
  "/api/integrity/pairing/complete",
  limitPairingComplete,
  requireSessionToken,
  (req, res) => {
    const sessionId = req.sessionTokenSessionId;
    const sess = sessions.get(sessionId);
    if (!sess) return res.status(409).json({ error: "session_expired_or_evicted" });

    function recordReject(reason, parsedHash = null, parsedChallengeHash = null, hasSig = false) {
      appendAudit(sess, EVENTS.INTEGRITY_PAIRING_REJECTED, {
        reason,
        node_id_hash_if_parsed: parsedHash,
        challenge_hash_if_parsed: parsedChallengeHash,
        has_signature: hasSig,
      });
    }

    if (pairingRegistry.isPaired(sessionId)) {
      const hints = safeParsedPairingHints(req.body);
      recordReject("node_already_paired", hints.node_id_hash_if_parsed, null, hints.has_signature);
      return res.status(409).json({ error: "node_already_paired" });
    }

    const validation = validatePairingProof(req.body, {
      now: Date.now(),
      expectedSessionId: sessionId,
    });

    if (!validation.ok) {
      const hints = safeParsedPairingHints(req.body);
      recordReject(validation.reason, hints.node_id_hash_if_parsed, null, hints.has_signature);

      let status = 400;
      if (validation.reason === "invalid_signature") status = 401;
      if (validation.reason === "proof_session_mismatch") status = 401;
      return res.status(status).json({ error: validation.reason });
    }

    const { payload } = validation;
    const challengeHash = crypto.createHash("sha256").update(payload.challenge_bytes).digest("hex");

    const existingIntegrity = integrityState.get(sessionId);
    if (
      existingIntegrity?.bound_node_id_hash &&
      existingIntegrity.bound_node_id_hash !== payload.node_id_hash
    ) {
      recordReject("node_id_hash_changed", payload.node_id_hash, challengeHash, true);
      return res.status(409).json({ error: "node_id_hash_changed" });
    }

    const state = pairingRegistry.completePairing(
      sessionId,
      {
        challenge: payload.challenge,
        node_id_hash: payload.node_id_hash,
        node_public_key: payload.node_public_key,
      },
      Date.now()
    );
    if (!state.ok) {
      recordReject(state.reason, payload.node_id_hash, challengeHash, true);
      return res.status(409).json({ error: state.reason });
    }

    appendAudit(sess, EVENTS.INTEGRITY_NODE_PAIRED, {
      node_id_hash: payload.node_id_hash,
      challenge_hash: challengeHash,
      platform: "macos",
      signature_status: "verified",
    });

    return res.status(200).json({
      status: "paired",
      session_id: sessionId,
      node_id_hash: payload.node_id_hash,
      signature_status: "verified",
      paired_at: new Date(state.paired_at).toISOString(),
      note: "Subsequent /api/integrity/proofs submissions for this session must be signed by the registered node and will return signature_status: verified.",
    });
  }
);

// ─────────────────────────────────────────────────────────────
//  Stage 2.1 — integrity proof ingestion (v1 pipeline)
//  POST /api/integrity/proofs
// ─────────────────────────────────────────────────────────────
app.post("/api/integrity/proofs", limitIntegrityProof, requireSessionToken, (req, res) => {
  const sessionId = req.sessionTokenSessionId;

  // Step 2 (spec): session must still exist. No implicit resurrection.
  const sess = sessions.get(sessionId);
  if (!sess) {
    return res.status(409).json({ error: "session_expired_or_evicted" });
  }

  // Helper to log rejection to audit chain with a minimal privacy-safe payload.
  function recordReject(reason, parsedHash = null, hasSignature = false) {
    appendAudit(sess, EVENTS.INTEGRITY_PROOF_REJECTED, {
      reason,
      node_id_hash_if_parsed: parsedHash,
      has_signature: hasSignature,
    });
  }

  // Step 3 (spec): schema + crypto validation.
  const pairedNode = pairingRegistry.getPairedNode(sessionId);
  const validation = validateProof(req.body, {
    now: Date.now(),
    pairedNode,
    expectedSessionId: sessionId,
  });
  if (!validation.ok) {
    const hints = safeParsedPairingHints(req.body);
    recordReject(validation.reason, hints.node_id_hash_if_parsed, hints.has_signature);

    let status = 400;
    if (validation.reason === "invalid_signature") status = 401;
    if (validation.reason === "registered_signature_invalid") status = 401;
    if (validation.reason === "proof_session_mismatch") status = 401;
    if (validation.reason === "paired_node_mismatch") status = 409;
    if (validation.reason === "paired_public_key_mismatch") status = 409;
    return res.status(status).json({ error: validation.reason });
  }
  const { proof, signature_status } = validation;

  // Token session must match proof session.
  if (proof.session_id !== sessionId) {
    recordReject("proof_session_mismatch", proof.node_id_hash, true);
    return res.status(401).json({ error: "proof_session_mismatch" });
  }

  // Step 4 (spec): nonce replay protection.
  const nonceResult = proofNonceGuard.check(proof.nonce, sessionId);
  if (!nonceResult.ok) {
    recordReject(nonceResult.reason, proof.node_id_hash, true);
    return res.status(409).json({ error: nonceResult.reason });
  }

  // Step 5 (spec): N1 strict node continuity.
  const stateResult = integrityState.record(sessionId, proof);
  if (!stateResult.ok) {
    recordReject(stateResult.reason, proof.node_id_hash, true);
    return res.status(409).json({ error: stateResult.reason });
  }

  // Step 7 (spec): success audit with hashed nonce + summaries only.
  const nonceHash = crypto.createHash("sha256").update(proof.nonce_bytes).digest("hex");
  appendAudit(sess, EVENTS.INTEGRITY_PROOF_RECEIVED, {
    node_id_hash: proof.node_id_hash,
    nonce_hash: nonceHash,
    signature_status,
    platform: proof.platform,
    version: proof.version,
    capability_summary: { ...proof.capabilities },
    signal_summary: {
      capture_excluded_window_count: proof.signals.capture_excluded_window_count,
      helper_status: proof.signals.helper_status,
    },
  });

  // Step 8 (spec): success receipt.
  res.status(202).json({
    status: "accepted",
    session_id: sessionId,
    nonce: proof.nonce,
    node_id_hash: proof.node_id_hash,
    signature_status,
    platform: proof.platform,
    received_at: new Date().toISOString(),
    note:
      signature_status === "verified"
        ? "Signature verified against the node registered to this session."
        : "Signature mathematically verified, node not yet paired. Submit /api/integrity/pairing/challenge to pair.",
  });
});

// ─────────────────────────────────────────────────────────────
//  Listen + graceful shutdown
// ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[simurgh] listening on http://localhost:${PORT}  (model: ${MODEL})`);
  if (HELPER_SHARED_SECRET) {
    console.log(
      `[simurgh] helper ingest ready at POST /api/affinity (header: x-simurgh-helper-secret)`
    );
  }
  console.log(`[simurgh] instructor view at http://localhost:${PORT}/instructor`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[simurgh] FATAL: port ${PORT} already in use.`);
  } else {
    console.error("[simurgh] FATAL:", err);
  }
  process.exit(1);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[simurgh] received ${signal} — closing server gracefully.`);
  for (const res of sseClients) {
    try {
      res.write(`event: shutdown\ndata: {"ts":${Date.now()}}\n\n`);
      res.end();
    } catch {}
  }
  sseClients.clear();
  clearInterval(evictionTimer);
  clearInterval(examEvictionTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref?.();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
