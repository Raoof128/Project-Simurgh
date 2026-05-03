import express from "express";
import Anthropic from "@anthropic-ai/sdk";
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
  } else {
    reasons.push(typed > 0 ? "steady typing, no anomalies" : "idle window, no signal");
  }

  return {
    risk_level: level,
    reasoning: reasons.join("; "),
  };
}

const SYSTEM_PROMPT = `You are Verity, an AI security behavioral analyst monitoring a student during a high-stakes proctored exam. You receive 5-second telemetry windows from the student's browser and must detect cheating.

THREAT MODEL
The exam runs in a browser. Traditional proctoring tools rely on OS-level screen capture, but a recently disclosed macOS 26 exploit allows attackers to render an "Invisible Window" over the exam that browser screen-capture APIs cannot see (W3C Screen Capture trust boundary vs. OS compositor). Visual surveillance is therefore unreliable. Verity instead detects the BEHAVIORAL FOOTPRINT of cheating by analyzing input timing and focus patterns.

WHAT TO LOOK FOR
1. Impossible cognitive cadence — large paste payloads (> 200 chars) with little to no manual typing in the same window, or sudden bursts of typed characters at superhuman WPM (> 250 effective WPM).
2. Suspicious context switching — the window losing focus immediately followed by a large paste on refocus (classic alt-tab → copy from another source → paste workflow).
3. Repeated tab-out behavior — many short blur/focus cycles indicating consultation with another window.
4. Idle followed by paste — long zero-input gap followed by paste with no manual edits.
5. Normal studying — steady typing, occasional small pastes (< 50 chars) of formulas or quoted text, brief focus loss to read a question.

OUTPUT FORMAT
Respond with ONLY a single JSON object, no prose, no code fences:
{"risk_level":"Safe|Warning|Critical","reasoning":"one short sentence citing the specific signal"}

Risk levels:
- Safe: normal exam-taking behavior
- Warning: one suspicious signal that could be benign (e.g., a single medium paste, one tab-out)
- Critical: clear evidence of external assistance (large paste after blur, superhuman cadence, repeated alt-tab + paste pattern)

Be calibrated. Most windows are Safe. Do not raise Critical for ambiguous cases.`;

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(express.static(join(__dirname, "public")));

const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, { latest: null, history: [] });
  return sessions.get(id);
}

function persistVerdict(sessionId, verdict) {
  const sess = getSession(sessionId);
  sess.latest = verdict;
  sess.history.unshift(verdict);
  if (sess.history.length > 50) sess.history.pop();
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
  res.json({ latest: sess?.latest ?? null, history: sess?.history ?? [] });
});

app.listen(PORT, () => {
  console.log(`[verity] listening on http://localhost:${PORT}  (model: ${MODEL})`);
});
