import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const PORT = Number(process.env.PORT) || 3030;
const MODEL = "claude-sonnet-4-5";

const apiKey = process.env.ANTHROPIC_API_KEY;
const DEMO_MODE = process.env.VERITY_DEMO_MODE === "1" || !apiKey;
if (!apiKey) {
  console.warn("[verity] ANTHROPIC_API_KEY not set — running in DEMO_MODE (local heuristic).");
}
const client = apiKey ? new Anthropic({ apiKey }) : null;

/**
 * Local rule-based fallback that mirrors the system prompt.
 * Used when the Anthropic API is unavailable (low credit, network, demo mode).
 */
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
    // §VI-C blind spot: "too clean" — substantive typing with zero anomalies
    level = "Warning";
    reasons.push("no behavioral signal — click-through overlay cannot be ruled out from telemetry alone (paper §VI-C)");
  } else {
    reasons.push(typed > 0 ? "steady typing, no anomalies" : "idle window, no signal");
  }

  return {
    risk_level: level,
    reasoning: reasons.join("; "),
  };
}

const SYSTEM_PROMPT = `You are Verity, an AI security behavioral analyst monitoring a candidate during a high-stakes proctored exam. You receive 5-second telemetry windows from the candidate's browser and must classify the behavioral footprint.

THREAT MODEL (Abedini, 2026 — "The Invisible Window")
The exam runs in a browser. Traditional proctoring relies on the W3C getDisplayMedia() API to capture the candidate's screen. The disclosure paper formalises a display-fidelity violation: documented OS-level display-affinity APIs — Windows SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) and macOS NSWindow.SharingType.none — let an attacker render application windows that are fully visible on the physical display but absent from any frame returned by getDisplayMedia(). Visual surveillance is therefore unreliable on Windows 10/11 and macOS 14–26.

Verity implements Countermeasure C from §VI-C of the paper: detect the BEHAVIORAL footprint of cheating from input timing, focus events, and paste payloads. You do NOT see the screen, the camera, or the keystroke contents.

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

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(express.static(join(__dirname, "public")));

const HELPER_SHARED_SECRET = process.env.VERITY_HELPER_SECRET || "verity-dev-helper";
const AUDIT_HMAC_SECRET = process.env.VERITY_AUDIT_SECRET || crypto.randomBytes(32).toString("hex");

const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      latest: null,
      history: [],
      affinity: { hostile: [], lastHeartbeat: null, source: null },
      auditChain: { prevHash: "GENESIS", entries: [] },
    });
  }
  return sessions.get(id);
}

function persistVerdict(sessionId, verdict) {
  const sess = getSession(sessionId);
  // attach affinity snapshot at verdict time — Countermeasure A signal fused with C
  verdict.affinity_snapshot = {
    hostile_count: sess.affinity.hostile.length,
    hostile: sess.affinity.hostile.map(w => ({ pid: w.pid, name: w.name, type: w.type })),
    helper_active: sess.affinity.lastHeartbeat != null && (Date.now() - sess.affinity.lastHeartbeat) < 8000,
    source: sess.affinity.source,
  };
  // if the helper reports hostile windows, escalate
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
}

function appendAudit(sess, type, payload) {
  const entry = {
    seq: sess.auditChain.entries.length,
    ts: Date.now(),
    type,
    payload,
    prev: sess.auditChain.prevHash,
  };
  const sig = crypto.createHmac("sha256", AUDIT_HMAC_SECRET)
    .update(JSON.stringify(entry))
    .digest("hex");
  entry.sig = sig;
  sess.auditChain.entries.push(entry);
  sess.auditChain.prevHash = sig;
  if (sess.auditChain.entries.length > 500) sess.auditChain.entries.shift();
}

app.post("/api/telemetry", async (req, res) => {
  const { sessionId, telemetry } = req.body ?? {};
  if (!sessionId || !telemetry) return res.status(400).json({ error: "sessionId and telemetry required" });

  // demo mode (no key) → straight to fallback
  if (!client || DEMO_MODE) {
    const h = localHeuristic(telemetry);
    const verdict = {
      ...h,
      ts: Date.now(),
      source: "heuristic-fallback",
      cache: { creation: 0, read: 0 },
    };
    persistVerdict(sessionId, verdict);
    return res.json(verdict);
  }

  try {
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

    const verdict = {
      risk_level: ["Safe", "Warning", "Critical"].includes(parsed.risk_level) ? parsed.risk_level : "Safe",
      reasoning: String(parsed.reasoning ?? "").slice(0, 280),
      ts: Date.now(),
      source: "claude",
      cache: {
        creation: response.usage?.cache_creation_input_tokens ?? 0,
        read: response.usage?.cache_read_input_tokens ?? 0,
      },
    };

    persistVerdict(sessionId, verdict);
    res.json(verdict);
  } catch (err) {
    const msg = err?.message ?? String(err);
    const lowCredit = /credit balance is too low/i.test(msg);
    if (lowCredit) {
      console.warn("[verity] anthropic low-credit — falling back to local heuristic");
    } else {
      console.error("[verity] anthropic error:", msg);
    }
    // graceful fallback — demo never breaks
    const h = localHeuristic(telemetry);
    const verdict = {
      ...h,
      ts: Date.now(),
      source: lowCredit ? "fallback-low-credit" : "fallback-error",
      cache: { creation: 0, read: 0 },
    };
    persistVerdict(sessionId, verdict);
    res.json(verdict);
  }
});

app.get("/api/dashboard/:sessionId", (req, res) => {
  const sess = sessions.get(req.params.sessionId);
  res.json({
    latest: sess?.latest ?? null,
    history: sess?.history ?? [],
    affinity: sess?.affinity ?? { hostile: [], lastHeartbeat: null, source: null },
  });
});

// ─────────────────────────────────────────────────────────────
//  Countermeasure A — native helper ingest (paper §VI-A)
//  The helper enumerates top-level windows on the host and reports
//  any with WDA_EXCLUDEFROMCAPTURE / sharingType=.none set.
//  POST body: { sessionId, hostile: [{ pid, name, type, since }], helper: "verity-helper-mac" }
//  Header:    x-verity-helper-secret: <shared secret>
// ─────────────────────────────────────────────────────────────
app.post("/api/affinity", (req, res) => {
  const secret = req.headers["x-verity-helper-secret"];
  if (secret !== HELPER_SHARED_SECRET) {
    return res.status(401).json({ error: "invalid_helper_secret" });
  }
  const { sessionId, hostile, helper } = req.body ?? {};
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  const sess = getSession(sessionId);
  const list = Array.isArray(hostile) ? hostile.slice(0, 64).map(w => ({
    pid: Number(w.pid) || 0,
    name: String(w.name ?? "unknown").slice(0, 80),
    type: String(w.type ?? "unknown").slice(0, 40),
    since: Number(w.since) || Date.now(),
  })) : [];

  const wasEmpty = sess.affinity.hostile.length === 0;
  const isEmpty = list.length === 0;

  sess.affinity = {
    hostile: list,
    lastHeartbeat: Date.now(),
    source: String(helper ?? "native-helper").slice(0, 40),
  };

  // append to audit chain on transitions only (avoid noise)
  if (wasEmpty !== isEmpty || list.length !== sess.affinity.hostile.length) {
    appendAudit(sess, "affinity", { hostile_count: list.length, hostile: list, helper });
  }

  res.json({ ok: true });
});

app.get("/api/affinity/:sessionId", (req, res) => {
  const sess = sessions.get(req.params.sessionId);
  if (!sess) return res.json({ hostile: [], lastHeartbeat: null, source: null });
  res.json(sess.affinity);
});

// ─────────────────────────────────────────────────────────────
//  Audit log — tamper-evident HMAC chain (paper §VI-F layered evidence)
// ─────────────────────────────────────────────────────────────
app.get("/api/audit/:sessionId", (req, res) => {
  const sess = sessions.get(req.params.sessionId);
  if (!sess) return res.status(404).json({ error: "session not found" });
  res.setHeader("content-disposition",
    `attachment; filename="verity-audit-${req.params.sessionId}.json"`);
  res.json({
    sessionId: req.params.sessionId,
    generated_at: new Date().toISOString(),
    chain_terminator: sess.auditChain.prevHash,
    entry_count: sess.auditChain.entries.length,
    entries: sess.auditChain.entries,
    notes: "HMAC-SHA256 chain. Each entry is signed over its content + the previous entry's signature. Tampering with any entry invalidates every subsequent signature.",
  });
});

app.listen(PORT, () => {
  console.log(`[verity] listening on http://localhost:${PORT}  (model: ${MODEL})`);
  console.log(`[verity] helper ingest ready at POST /api/affinity (header: x-verity-helper-secret)`);
});
