// Weights must sum to 1.0
const WEIGHTS = {
  paste_risk: 0.25,
  focus_risk: 0.18,
  typing_risk: 0.15,
  idle_risk: 0.1,
  affinity_risk: 0.18,
  helper_risk: 0.05,
  daemon_risk: 0.09,
  session_risk: 0.05,
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function scoreAcademicRisk(telemetry, helperInfo = {}, sessionInfo = {}) {
  const {
    paste_payload_chars: paste = 0,
    chars_typed: typed = 0,
    focus_losses: blurs = 0,
    time_off_window_ms: offMs = 0,
    effective_wpm: wpm = 0,
    max_idle_gap_ms: idleMs = 0,
  } = telemetry;

  const {
    connected = false,
    hostileCount = 0,
    daemonRisk = 0,
    daemonForceCritical = false,
  } = helperInfo;
  const { reconnects = 0, startedAt = Date.now() } = sessionInfo;
  const sessionAgeSec = (Date.now() - startedAt) / 1000;

  // Paste risk: large paste, especially after focus loss
  let pasteRaw = 0;
  if (paste >= 200 && typed < 20) pasteRaw = 100;
  else if (blurs >= 1 && paste >= 80) pasteRaw = 100;
  else if (paste >= 80) pasteRaw = 100;
  else if (paste >= 50) pasteRaw = 60;
  else if (paste > 0) pasteRaw = 20;

  // Focus risk: blur count + time off window
  let focusRaw = 0;
  if (blurs >= 4) focusRaw += 80;
  else if (blurs >= 2) focusRaw += 50;
  else if (blurs === 1) focusRaw += 20;
  if (offMs >= 30000) focusRaw += 40;
  else if (offMs >= 10000) focusRaw += 20;
  else if (offMs >= 3000) focusRaw += 10;

  // Typing risk: superhuman WPM burst
  let typingRaw = 0;
  if (wpm >= 250) typingRaw = 90;
  else if (wpm >= 180) typingRaw = 50;

  // Idle risk: long gap followed by paste
  let idleRaw = 0;
  if (idleMs >= 60000 && paste >= 80) idleRaw = 80;
  else if (idleMs >= 8000 && paste > 0) idleRaw = 50;
  else if (idleMs >= 30000) idleRaw = 30;

  // Affinity risk: native helper confirmed excluded window
  const affinityRaw = hostileCount > 0 ? 100 : 0;

  // Helper risk: not connected after 30s of session
  const helperRaw = !connected && sessionAgeSec > 30 ? 100 : 0;

  // Session risk: excessive reconnects
  let sessionRaw = 0;
  if (reconnects >= 3) sessionRaw = 80;
  else if (reconnects >= 2) sessionRaw = 40;

  const categories = {
    paste_risk: clamp(Math.round(pasteRaw), 0, 100),
    focus_risk: clamp(Math.round(focusRaw), 0, 100),
    typing_risk: clamp(Math.round(typingRaw), 0, 100),
    idle_risk: clamp(Math.round(idleRaw), 0, 100),
    affinity_risk: clamp(Math.round(affinityRaw), 0, 100),
    helper_risk: clamp(Math.round(helperRaw), 0, 100),
    daemon_risk: clamp(Math.round(daemonRisk), 0, 100),
    session_risk: clamp(Math.round(sessionRaw), 0, 100),
  };

  let risk_score = Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + categories[k] * w, 0);
  risk_score = clamp(Math.round(risk_score), 0, 100);

  // Paste override: large paste with minimal own typing is a hard Critical signal
  if (paste >= 200 && typed < 20) risk_score = Math.max(risk_score, 75);
  // Medium paste floor: a substantial paste alone should flag at least Warning
  if (paste >= 80 && risk_score < 40) risk_score = 40;

  // Affinity override: confirmed excluded window forces Critical floor
  if (affinityRaw >= 100) risk_score = Math.max(risk_score, 85);
  // Daemon warning floor: signed scanner-unavailable or monitor-only signals need manual review.
  if (daemonRisk >= 40 && !daemonForceCritical) risk_score = Math.max(risk_score, 40);
  if (daemonForceCritical) risk_score = Math.max(risk_score, 85);

  const risk_level = risk_score >= 70 ? "Critical" : risk_score >= 40 ? "Warning" : "Safe";
  // Confidence floor of 0.5: heuristic results always carry at least baseline certainty.
  const confidence = clamp(0.5 + risk_score / 200, 0, 1);

  const recommendation =
    risk_level === "Critical"
      ? "Manual review required. No automatic misconduct finding."
      : risk_level === "Warning"
        ? "Manual review recommended. No automatic misconduct finding."
        : "No anomalies detected.";

  return {
    risk_level,
    risk_score,
    confidence: Math.round(confidence * 100) / 100,
    categories,
    reasoning: null, // populated by Claude narrative when enabled
    recommendation,
    source: { score: "local_heuristic", reasoning: null },
  };
}
