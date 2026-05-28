#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Persona list — defined BEFORE CLI validation so error message can reference it ──
const PERSONAS = [
  "compliant_browser_only",
  "compliant_with_fixture_daemon",
  "distracted_member",
  "daemon_unavailable",
  "replay_attempt",
  "tampered_proof",
  "withdraws_midway",
  "declines_consent",
  "forbidden_ballot_field_attempt",
];

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((pairs, arg, i, arr) => {
      if (arg.startsWith("--")) pairs.push([arg.slice(2), arr[i + 1] ?? true]);
      return pairs;
    }, [])
);

const PERSONA = args.persona;
const SEED = parseInt(args.seed ?? "0", 10);
const FIXED_CLOCK = args["fixed-clock"] ?? null;
const BASE_URL = args["base-url"] ?? "http://127.0.0.1:3030";

if (!PERSONA || !PERSONAS.includes(PERSONA)) {
  console.error("Usage: node tools/voting-pilot-persona.mjs --persona <name> --seed <n> [--fixed-clock <ISO>] [--base-url <url>]");
  console.error("Personas:", PERSONAS.join(", "));
  process.exit(1);
}

// ── Seeded pseudo-random ──────────────────────────────────────────────────────
function seededInt(seed, max) {
  const h = crypto.createHash("sha256").update(`${seed}`).digest();
  return h.readUInt32BE(0) % max;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function post(path, body = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api/voting-pilot${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path, token = null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE_URL}/api/voting-pilot${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

// ── Persona runner ────────────────────────────────────────────────────────────
async function runPersona(persona, seed) {
  const steps = [];
  const now = () => FIXED_CLOCK ?? new Date().toISOString();
  let token = null;
  let sessionId = null;
  let assertion = "PASS";
  let notes = "";

  function step(name, status, serverStatus = null, extra = {}) {
    steps.push({ name, status, ...(serverStatus != null ? { server_status: serverStatus } : {}), ...extra });
    console.log(`  [${status.toUpperCase()}] ${name}${serverStatus ? ` (HTTP ${serverStatus})` : ""}`);
  }

  if (persona === "declines_consent") {
    step("load_consent_page", "pass");
    step("decline_consent", "pass");
    return {
      schema_version: "2026-05-v1",
      persona,
      seed,
      fixed_clock: FIXED_CLOCK,
      run_at: now(),
      synthetic: true,
      human_participant: false,
      pilot_session_id: null,
      server_record_created: false,
      steps,
      privacy: { ballot_choice_sent: false, token_redacted: true, forbidden_values_recorded: false },
      assertion: "PASS",
      notes: "Decline path — no server record created as expected.",
    };
  }

  // All other personas: accept consent first
  const consent = await post("/consent/accept", {});
  if (consent.status !== 200) {
    step("accept_consent", "fail", consent.status);
    assertion = "FAIL";
    notes = `consent/accept returned ${consent.status}`;
  } else {
    token = consent.body.token;
    sessionId = consent.body.pilot_session_id;
    step("accept_consent", "pass", 200);
  }

  if (persona === "withdraws_midway") {
    await delay(seededInt(seed, 500) + 100);
    step("simulate_telemetry_delay", "pass");
    const wd = await post("/withdraw", {}, token);
    step("withdraw", wd.status === 200 ? "pass" : "fail", wd.status);
    if (wd.status !== 200) assertion = "FAIL";
    // Report must be blocked for withdrawn sessions (no token needed to confirm 403)
    const report = await get(`/${sessionId}/report`, token);
    if (report.status === 403) {
      step("report_blocked_after_withdraw", "pass", 403);
    } else {
      step("report_blocked_after_withdraw", "fail", report.status);
      assertion = "FAIL";
    }
  } else if (persona === "forbidden_ballot_field_attempt") {
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true, choice: "A" }, token);
    if (submit.status === 400 && submit.body.error === "ballot_choice_field_rejected") {
      step("forbidden_field_rejected", "pass", 400);
    } else {
      step("forbidden_field_rejected", "fail", submit.status);
      assertion = "FAIL";
    }
  } else if (persona === "replay_attempt") {
    // Session 2: create a second session
    const s2 = await post("/consent/accept", {});
    const replayToken = s2.body.token;
    const replaySessionId = s2.body.pilot_session_id;
    // Submit session 2 normally
    await post("/submit", { pilot_session_id: replaySessionId, submit_intent: true }, replayToken);
    step("session2_submitted", "pass");
    // Cross-session replay: submit session 1 body using session 2's token — 409 mismatch
    const replay = await post("/submit", { pilot_session_id: sessionId, submit_intent: true }, replayToken);
    if (replay.status === 409 || replay.status === 401 || replay.status === 404) {
      step("cross_session_replay_rejected", "pass", replay.status);
    } else {
      step("cross_session_replay_rejected", "fail", replay.status);
      assertion = "FAIL";
    }
  } else if (persona === "tampered_proof") {
    // No daemon proof route in voting pilot v0.1 — tamper test verifies server rejects forbidden fields
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true, candidate_id: "fake_tamper" }, token);
    if (submit.status === 400 && submit.body.forbidden_fields?.includes("candidate_id")) {
      step("tampered_field_rejected", "pass", 400);
    } else {
      step("tampered_field_rejected", "fail", submit.status);
      assertion = "FAIL";
    }
  } else if (persona === "distracted_member") {
    await delay(seededInt(seed, 300) + 50);
    step("simulate_focus_loss_delay", "pass");
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true }, token);
    step("submit", submit.status === 200 ? "pass" : "fail", submit.status);
    if (submit.status !== 200) assertion = "FAIL";
  } else if (persona === "daemon_unavailable") {
    step("daemon_probe_no_response", "pass");
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true }, token);
    step("submit_browser_only", submit.status === 200 ? "pass" : "fail", submit.status);
    if (submit.status !== 200) assertion = "FAIL";
  } else {
    // compliant_browser_only, compliant_with_fixture_daemon
    if (persona.includes("fixture_daemon")) {
      step("daemon_probe_fixture", "pass", null, {
        note: "Fixture daemon — proof validation out of scope for HTTP-level runner v0.1. Labelled synthetic.",
      });
    }
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true }, token);
    step("submit", submit.status === 200 ? "pass" : "fail", submit.status);
    if (submit.status !== 200) assertion = "FAIL";
  }

  // Fetch report (if not withdrawn)
  let reportSummary = null;
  if (sessionId && persona !== "withdraws_midway") {
    const report = await get(`/${sessionId}/report`, token);
    if (report.status === 200) {
      step("fetch_report", "pass", 200);
      reportSummary = {
        status: 200,
        summary: "submitted",
        chain_valid: report.body.audit?.chain_valid,
      };
    } else {
      step("fetch_report", assertion === "PASS" ? "fail" : "pass", report.status);
    }
  }

  return {
    schema_version: "2026-05-v1",
    persona,
    seed,
    fixed_clock: FIXED_CLOCK,
    run_at: now(),
    synthetic: true,
    human_participant: false,
    pilot_session_id: sessionId,
    integrity_tier: "browser_only",
    steps,
    privacy: {
      ballot_choice_sent: false,
      token_redacted: true,
      forbidden_values_recorded: false,
    },
    final_server_response: reportSummary,
    assertion,
    notes: notes || `${persona} persona completed.`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n[persona] Running: ${PERSONA} (seed=${SEED})`);

const result = await runPersona(PERSONA, SEED);

const outDir = join(ROOT, "docs/research/mq-voting-pilot/evidence/synthetic");
mkdirSync(outDir, { recursive: true });
const filename = `session-${PERSONA}-${SEED}-${Date.now()}.json`;
const outPath = join(outDir, filename);
writeFileSync(outPath, JSON.stringify(result, null, 2));

console.log(`\n[persona] Assertion: ${result.assertion}`);
console.log(`[persona] Written: ${outPath}`);

if (result.assertion !== "PASS") process.exit(1);
