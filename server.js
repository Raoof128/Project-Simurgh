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

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
//  .env loader — strips inline `#` comments outside quotes
// ─────────────────────────────────────────────────────────────
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
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
const MODEL = process.env.SIMURGH_MODEL || "claude-sonnet-4-5";

const apiKey = process.env.ANTHROPIC_API_KEY;
const DEMO_MODE = process.env.SIMURGH_DEMO_MODE === "1" || !apiKey;
if (!apiKey) {
  console.warn("[simurgh] ANTHROPIC_API_KEY not set — running in DEMO_MODE (local heuristic).");
}
const client = apiKey ? new Anthropic({ apiKey }) : null;

// ─────────────────────────────────────────────────────────────
//  Secret bootstrap — fail fast in production, warn in demo
// ─────────────────────────────────────────────────────────────
const HELPER_SHARED_SECRET = process.env.SIMURGH_HELPER_SECRET;
if (!HELPER_SHARED_SECRET) {
  if (DEMO_MODE) {
    console.warn("[simurgh] SIMURGH_HELPER_SECRET not set — /api/affinity helper ingest is DISABLED in this demo session.");
  } else {
    console.error("[simurgh] FATAL: SIMURGH_HELPER_SECRET must be set in non-demo mode. Refusing to start.");
    process.exit(78);
  }
}

const AUDIT_HMAC_SECRET = process.env.SIMURGH_AUDIT_SECRET;
const AUDIT_KEY_EPHEMERAL = !AUDIT_HMAC_SECRET;
const AUDIT_KEY = AUDIT_HMAC_SECRET || crypto.randomBytes(32).toString("hex");
if (AUDIT_KEY_EPHEMERAL) {
  console.warn("[simurgh] ⚠ SIMURGH_AUDIT_SECRET not set — audit chain HMAC key is ephemeral.");
  console.warn("[simurgh] ⚠ Every restart invalidates previously exported audit chains. Set SIMURGH_AUDIT_SECRET in production.");
}

const INSTRUCTOR_TOKEN = process.env.SIMURGH_INSTRUCTOR_TOKEN
  || (DEMO_MODE ? "demo" : crypto.randomBytes(24).toString("hex"));
if (!process.env.SIMURGH_INSTRUCTOR_TOKEN && !DEMO_MODE) {
  console.warn(`[simurgh] SIMURGH_INSTRUCTOR_TOKEN not set — generated ephemeral token: ${INSTRUCTOR_TOKEN}`);
  console.warn("[simurgh] Set SIMURGH_INSTRUCTOR_TOKEN in production so the instructor URL is stable across restarts.");
}

const ALLOWED_ORIGIN = process.env.SIMURGH_ALLOWED_ORIGIN || "*";

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
    reasons.push(`${(idle/1000).toFixed(1)}s idle gap then ${paste}-char paste`);
  } else if (paste >= 80 || blurs >= 2 || off >= 3000) {
    level = "Warning";
    if (paste >= 80) reasons.push(`medium paste of ${paste} chars`);
    if (blurs >= 2) reasons.push(`${blurs} focus losses in window`);
    if (off >= 3000) reasons.push(`${(off/1000).toFixed(1)}s spent off-window`);
  } else if (blurs === 1 || (paste > 0 && paste < 80)) {
    level = "Warning";
    reasons.push(blurs ? "single tab-out — could be benign" : `small paste of ${paste} chars`);
  } else if (typed >= 60 && blurs === 0 && pastes === 0 && idle < 4000) {
    level = "Warning";
    reasons.push("no behavioral signal — click-through overlay cannot be ruled out from telemetry alone (paper §VI-C)");
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
  keystrokes:           { type: "int", min: 0, max: 5000 },
  chars_typed:          { type: "int", min: 0, max: 5000 },
  effective_wpm:        { type: "int", min: 0, max: 1000 },
  focus_losses:         { type: "int", min: 0, max: 200 },
  time_off_window_ms:   { type: "int", min: 0, max: 600_000 },
  pastes:               { type: "int", min: 0, max: 200 },
  paste_payload_chars:  { type: "int", min: 0, max: 200_000 },
  max_idle_gap_ms:      { type: "int", min: 0, max: 600_000 },
  window_seconds:       { type: "num", min: 0, max: 60 },
};
function sanitiseTelemetry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {};
  for (const [k, spec] of Object.entries(TELEMETRY_SCHEMA)) {
    let v = Number(raw[k]);
    if (!Number.isFinite(v)) v = 0;
    if (v < spec.min) v = spec.min;
    if (v > spec.max) v = spec.max;
    out[k] = spec.type === "int" ? Math.round(v) : v;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  Sessions — in-memory with TTL eviction
// ─────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours of inactivity
const AUDIT_CHAIN_CAP = 5000;
const sessions = new Map();
const timeline = eventTimeline();
const examSessions = new Map(); // sessionId → sessionRecord (Stage 1 lifecycle)
function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      createdAt: Date.now(),
      lastActivity: Date.now(),
      latest: null,
      history: [],
      affinity: { hostile: [], lastHeartbeat: null, source: null, forensic: null },
      auditChain: { prevHash: "GENESIS", entries: [], truncated: false },
      rate: { tokens: 3, lastRefill: Date.now() },
      // Stage 1 Academic Shield fields
      state: 'active',
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
const evictionTimer = setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions.entries()) {
    if (s.lastActivity < cutoff) sessions.delete(id);
  }
}, 5 * 60 * 1000).unref?.();

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
    try { res.write(payload); }
    catch {
      sseClients.delete(res);
      try { res.destroy?.(); } catch {}
    }
  }
}

const ONE_HOUR = 3600_000;
function sessionSummary(id) {
  const s = sessions.get(id);
  if (!s) return null;
  const cutoff = Date.now() - ONE_HOUR;
  const recent = s.history.filter(v => (v.ts || 0) >= cutoff);
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
    helper_active: s.affinity.lastHeartbeat != null && (Date.now() - s.affinity.lastHeartbeat) < 8000,
    fidelity_deficit_pct: s.affinity.forensic?.fidelity_deficit_pct ?? 0,
    counts,
    history_count: s.history.length,
  };
}

function persistVerdict(sessionId, verdict) {
  const sess = getSession(sessionId);
  verdict.affinity_snapshot = {
    hostile_count: sess.affinity.hostile.length,
    hostile: sess.affinity.hostile.map(w => ({ pid: w.pid, name: w.name, type: w.type })),
    helper_active: sess.affinity.lastHeartbeat != null && (Date.now() - sess.affinity.lastHeartbeat) < 8000,
    source: sess.affinity.source,
    forensic: sess.affinity.forensic ?? null,
  };
  if (verdict.affinity_snapshot.hostile_count > 0 && verdict.risk_level !== "Critical") {
    verdict.risk_level = "Critical";
    const names = verdict.affinity_snapshot.hostile.map(w => w.name).slice(0, 2).join(", ");
    verdict.reasoning = `Countermeasure A native helper flagged ${verdict.affinity_snapshot.hostile_count} capture-invisible window(s): ${names}. ` + (verdict.reasoning || "");
    verdict.reasoning = verdict.reasoning.slice(0, 280);
  }
  sess.latest = verdict;
  sess.history.unshift(verdict);
  if (sess.history.length > 50) sess.history.pop();
  appendAudit(sess, "verdict", verdict);
  sseBroadcast("verdict", { sessionId, summary: sessionSummary(sessionId), verdict });
}

function appendAudit(sess, type, payload) {
  if (sess.auditChain.truncated) return;
  if (sess.auditChain.entries.length >= AUDIT_CHAIN_CAP) {
    sess.auditChain.truncated = true;
    return;
  }
  const entry = {
    seq: sess.auditChain.entries.length,
    ts: Date.now(),
    type,
    payload,
    prev: sess.auditChain.prevHash,
  };
  const sig = crypto.createHmac("sha256", AUDIT_KEY)
    .update(JSON.stringify(entry))
    .digest("hex");
  entry.sig = sig;
  sess.auditChain.entries.push(entry);
  sess.auditChain.prevHash = sig;
}

// ─────────────────────────────────────────────────────────────
//  Express app
// ─────────────────────────────────────────────────────────────
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

// Minimal CORS — locked to ALLOWED_ORIGIN (default same-origin "*" deny would
// break local dev; we explicitly list * for now and recommend overriding).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-simurgh-helper-secret");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.static(join(__dirname, "public")));

// Instructor route — serves the page only when a valid token is supplied,
// or in DEMO_MODE. The page reads the token from location.search and reuses
// it for SSE + dashboard fetches.
app.get("/instructor", (req, res) => {
  if (!DEMO_MODE && req.query.token !== INSTRUCTOR_TOKEN) {
    return res.status(401).type("text/plain")
      .send("Simurgh instructor view requires SIMURGH_INSTRUCTOR_TOKEN as ?token= query param.");
  }
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
  const token = bearer || req.query.token;
  if (token !== INSTRUCTOR_TOKEN) return res.status(401).json({ error: "auth_required" });
  next();
}

// ─────────────────────────────────────────────────────────────
//  /api/telemetry — candidate-side ingest (rate-limited, validated)
// ─────────────────────────────────────────────────────────────
app.post("/api/telemetry", async (req, res) => {
  const sessionId = String(req.body?.sessionId ?? "").slice(0, 64);
  const telemetry = sanitiseTelemetry(req.body?.telemetry);
  if (!sessionId || !/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    return res.status(400).json({ error: "valid sessionId required" });
  }
  if (!telemetry) return res.status(400).json({ error: "telemetry payload invalid" });

  const sess = getSession(sessionId);
  if (!consumeRateToken(sess)) {
    return res.status(429).json({ error: "rate_limited", retry_after_ms: 2500 });
  }

  if (!client || DEMO_MODE) {
    const normed = normaliseTelemetry(telemetry) ?? telemetry;
    const scored = scoreAcademicRisk(normed, {
      connected: sess.affinity.lastHeartbeat != null && (Date.now() - sess.affinity.lastHeartbeat) < 8000,
      hostileCount: sess.affinity.hostile.length,
    }, { reconnects: sess.reconnects || 0, startedAt: sess.startedAt });
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
    timeline.add(sessionId, EVENTS.TELEMETRY_WINDOW_RECEIVED, { risk_level: scored.risk_level, risk_score: scored.risk_score });
    if (telemetry.focus_losses > 0) timeline.add(sessionId, EVENTS.FOCUS_LOSS, { count: telemetry.focus_losses });
    if (telemetry.paste_payload_chars >= 200) timeline.add(sessionId, EVENTS.BULK_PASTE, { chars: telemetry.paste_payload_chars });
    if (telemetry.effective_wpm >= 250) timeline.add(sessionId, EVENTS.ABNORMAL_WPM_SPIKE, { wpm: telemetry.effective_wpm });
    if (telemetry.max_idle_gap_ms >= 60000) timeline.add(sessionId, EVENTS.LONG_IDLE_GAP, { ms: telemetry.max_idle_gap_ms });
    persistVerdict(sessionId, verdict);
    return res.json(verdict);
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `Telemetry window (last 5 seconds):\n\`\`\`json\n${JSON.stringify(telemetry, null, 2)}\n\`\`\``,
      }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    let parsed;
    try {
      const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { risk_level: "Safe", reasoning: "Model output unparseable; defaulting to Safe." };
    }

    const normed = normaliseTelemetry(telemetry) ?? telemetry;
    const scored = scoreAcademicRisk(normed, {
      connected: sess.affinity.lastHeartbeat != null && (Date.now() - sess.affinity.lastHeartbeat) < 8000,
      hostileCount: sess.affinity.hostile.length,
    }, { reconnects: sess.reconnects || 0, startedAt: sess.startedAt });
    const claudeReasoning = String(parsed.reasoning ?? "").slice(0, 280);
    const verdict = {
      risk_level: scored.risk_level,
      risk_score: scored.risk_score,
      confidence: scored.confidence,
      categories: scored.categories,
      reasoning: claudeReasoning || scored.recommendation,
      recommendation: scored.recommendation,
      source: { score: 'local_heuristic', reasoning: 'claude_narrative' },
      ts: Date.now(),
      cache: {
        creation: response.usage?.cache_creation_input_tokens ?? 0,
        read: response.usage?.cache_read_input_tokens ?? 0,
      },
    };
    sess.latestRiskScore = scored.risk_score;
    sess.latestCategories = scored.categories;
    timeline.add(sessionId, EVENTS.TELEMETRY_WINDOW_RECEIVED, { risk_level: scored.risk_level, risk_score: scored.risk_score });
    if (telemetry.focus_losses > 0) timeline.add(sessionId, EVENTS.FOCUS_LOSS, { count: telemetry.focus_losses });
    if (telemetry.paste_payload_chars >= 200) timeline.add(sessionId, EVENTS.BULK_PASTE, { chars: telemetry.paste_payload_chars });
    if (telemetry.effective_wpm >= 250) timeline.add(sessionId, EVENTS.ABNORMAL_WPM_SPIKE, { wpm: telemetry.effective_wpm });
    if (telemetry.max_idle_gap_ms >= 60000) timeline.add(sessionId, EVENTS.LONG_IDLE_GAP, { ms: telemetry.max_idle_gap_ms });
    persistVerdict(sessionId, verdict);
    res.json(verdict);
  } catch (err) {
    const msg = err?.message ?? String(err);
    const lowCredit = /credit balance is too low/i.test(msg);
    if (lowCredit) console.warn("[simurgh] anthropic low-credit — falling back to local heuristic");
    else console.error("[simurgh] anthropic error:", msg);
    const normed = normaliseTelemetry(telemetry) ?? telemetry;
    const scored = scoreAcademicRisk(normed, {
      connected: sess.affinity.lastHeartbeat != null && (Date.now() - sess.affinity.lastHeartbeat) < 8000,
      hostileCount: sess.affinity.hostile.length,
    }, { reconnects: sess.reconnects || 0, startedAt: sess.startedAt });
    const verdict = {
      risk_level: scored.risk_level,
      risk_score: scored.risk_score,
      confidence: scored.confidence,
      categories: scored.categories,
      reasoning: scored.recommendation,
      recommendation: scored.recommendation,
      source: { score: 'local_heuristic', reasoning: lowCredit ? 'fallback-low-credit' : 'fallback-error' },
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
  const list = Array.isArray(hostile) ? hostile.slice(0, 64).map(w => ({
    pid: Number(w.pid) || 0,
    name: String(w.name ?? "unknown").slice(0, 80),
    type: String(w.type ?? "unknown").slice(0, 40),
    since: Number(w.since) || Date.now(),
  })) : [];

  const prev = sess.affinity.hostile;
  const sigOf = (l) => l.map(w => `${w.pid}|${w.name}|${w.type}`).sort().join(";");
  const transition = sigOf(prev) !== sigOf(list);

  const f = forensic && typeof forensic === "object" && !Array.isArray(forensic) ? {
    display_width:        Number(forensic.display_width) || 0,
    display_height:       Number(forensic.display_height) || 0,
    display_pixels:       Number(forensic.display_pixels) || 0,
    invisible_pixels:     Number(forensic.invisible_pixels) || 0,
    fidelity_deficit_pct: Number(forensic.fidelity_deficit_pct) || 0,
    visible_window_count: Number(forensic.visible_window_count) || 0,
    hostile_window_count: Number(forensic.hostile_window_count) || 0,
  } : null;

  const sourceLabel = opts.simulator
    ? "simurgh-helper-simulator/0.1"
    : String(helper ?? "native-helper").slice(0, 40);

  sess.affinity = { hostile: list, lastHeartbeat: Date.now(), source: sourceLabel, forensic: f };

  if (transition) {
    appendAudit(sess, "affinity", { hostile_count: list.length, hostile: list, helper: sourceLabel, forensic: f });
    sseBroadcast("affinity", { sessionId, summary: sessionSummary(sessionId), hostile: list, forensic: f });
  }
  res.json({ ok: true, transition });
}

// Real helper — secret-gated. Disabled when no secret configured.
app.post("/api/affinity", (req, res) => {
  if (!HELPER_SHARED_SECRET) return res.status(503).json({ error: "helper_ingest_disabled" });
  const secret = req.headers["x-simurgh-helper-secret"];
  if (secret !== HELPER_SHARED_SECRET) return res.status(401).json({ error: "invalid_helper_secret" });
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
  res.setHeader("content-disposition",
    `attachment; filename="simurgh-audit-${req.params.sessionId}.json"`);
  res.json({
    sessionId: req.params.sessionId,
    generated_at: new Date().toISOString(),
    chain_terminator: sess.auditChain.prevHash,
    entry_count: sess.auditChain.entries.length,
    truncated: !!sess.auditChain.truncated,
    cap: AUDIT_CHAIN_CAP,
    hmac_algorithm: "HMAC-SHA256",
    hmac_key_ephemeral: AUDIT_KEY_EPHEMERAL,
    entries: sess.auditChain.entries,
    notes: "HMAC-SHA256 chain. Each entry signs its content + the previous entry's signature. Tampering with any entry invalidates every subsequent signature. Verify with tools/verify-audit.mjs.",
  });
});

// ─────────────────────────────────────────────────────────────
//  Instructor view — multi-session aggregator (auth-gated)
// ─────────────────────────────────────────────────────────────
app.get("/api/sessions", requireInstructorAuth, (_req, res) => {
  const out = [];
  for (const id of sessions.keys()) {
    const s = sessionSummary(id);
    if (s) out.push(s);
  }
  out.sort((a, b) => (b.latest?.ts ?? b.createdAt) - (a.latest?.ts ?? a.createdAt));
  res.json({ sessions: out, model: MODEL });
});

// SSE stream — auth-gated (token via ?token= query param).
app.get("/api/stream/instructor", requireInstructorAuth, (req, res) => {
  res.set({
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    "connection": "keep-alive",
    "x-accel-buffering": "no",
  });
  res.flushHeaders?.();
  res.write(`event: hello\ndata: ${JSON.stringify({ ts: Date.now(), model: MODEL })}\n\n`);
  sseClients.add(res);
  const ka = setInterval(() => {
    try { res.write(": keepalive\n\n"); }
    catch { sseClients.delete(res); clearInterval(ka); try { res.destroy?.(); } catch {} }
  }, 25_000);
  req.on("close", () => { clearInterval(ka); sseClients.delete(res); });
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
app.post("/api/exams/:examId/join", (req, res) => {
  const exam = getExam(req.params.examId);
  if (!exam) return res.status(404).json({ error: "exam not found" });
  const rawStudentId = String(req.body?.studentId ?? "").slice(0, 256);
  if (!rawStudentId) return res.status(400).json({ error: "studentId required" });
  const studentIdHash = hashStudentId(rawStudentId);
  const sessionId = String(req.body?.sessionId ?? "").slice(0, 64) ||
    `sess_${crypto.randomBytes(6).toString("hex")}`;
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    return res.status(400).json({ error: "invalid sessionId format" });
  }
  let record = createSessionRecord(exam.id, studentIdHash);
  record = { ...record, id: sessionId };
  record = transitionState(record, STATES.JOINED);
  examSessions.set(sessionId, record);
  getSession(sessionId); // ensure telemetry session exists
  res.json({ sessionId, examId: exam.id, studentIdHash, state: record.state });
});

// Student accepts privacy notice
app.post("/api/sessions/:sessionId/privacy-accept", (req, res) => {
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
app.post("/api/sessions/:sessionId/start", (req, res) => {
  const record = examSessions.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session not found" });
  try {
    const canStart = [STATES.PRIVACY_ACCEPTED, STATES.HELPER_CONNECTED].includes(record.state);
    if (!canStart) return res.status(409).json({ error: `Cannot start from state: ${record.state}` });
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
app.post("/api/sessions/:sessionId/submit", (req, res) => {
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

// ─────────────────────────────────────────────────────────────
//  Listen + graceful shutdown
// ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[simurgh] listening on http://localhost:${PORT}  (model: ${MODEL})`);
  if (HELPER_SHARED_SECRET) {
    console.log(`[simurgh] helper ingest ready at POST /api/affinity (header: x-simurgh-helper-secret)`);
  }
  const tokenSuffix = DEMO_MODE ? "" : `?token=${INSTRUCTOR_TOKEN}`;
  console.log(`[simurgh] instructor view at http://localhost:${PORT}/instructor${tokenSuffix}`);
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
    try { res.write(`event: shutdown\ndata: {"ts":${Date.now()}}\n\n`); res.end(); }
    catch {}
  }
  sseClients.clear();
  clearInterval(evictionTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref?.();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
