// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E-core gateway. No network. Composes the env gate, the 3A/3C input
// firewall, and the Stage 3D boundaries (context guard, tool gate, output
// firewall, risk accumulator) around a no-network provider, emitting a 3E receipt.
import { Router } from "express";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { createChain, verifyChain } from "../../audit/hmacChain.js";
import { getStore } from "../../storage/memoryStore.js";
import {
  issueSessionToken,
  verifySessionToken,
  extractBearer,
} from "../../security/sessionToken.js";
import { stagingConfig } from "../../config/env.js";
import { normalisePrompt, hashPrompt } from "../promptNormalise.js";
import { classifyPrompt } from "../promptFirewall.js";
import { guardContexts } from "../contextProvenanceGuard.js";
import { gateToolRequest } from "../toolInvocationGate.js";
import { scanOutput } from "../outputLeakageFirewall.js";
import { riskPointsFor, riskVerdict } from "../runRiskAccumulator.js";
import { getScenario, isValidScenario } from "../stage3dMockScenarios.js";
import { validateProviderSelection, evaluateLiveProvider } from "./gatewayEnv.js";
import { getGatewayProvider } from "./providerRegistry.js";
import { liveLimits, createLiveLedger, checkLiveCall, recordLiveCall } from "./liveCallLedger.js";
import { buildProviderSafeContext } from "./anthropicMessageBuild.js";
import { selectFixtureEntry, validateRecordedFixture } from "./recordedFixtureProvider.js";
import { normaliseProviderOutput } from "./providerOutputNormalise.js";
import { runFallbackOrchestration } from "./fallbackOrchestrator.js";
import { mergeTrustMonotonic } from "./fallbackPolicy.js";
import { normaliseRefusal, isRefusal } from "./anthropicResponseNormalise.js";
import { buildGatewayReceipt, hashGatewayReceipt } from "./gatewayReceipt.js";
import {
  recordGatewaySessionCreated,
  recordGatewayRun,
  recordGatewayReceiptExported,
  recordGatewayLiveCall,
  recordGatewayLiveConfigRejected,
  recordGatewayFallbackSwap,
} from "./gatewayAudit.js";
import { gatewayLimits, checkInputCaps } from "./gatewayRateLimit.js";

const router = Router();
const store = getStore("llmShieldGatewaySessions");
const BODY_LIMIT_BYTES = 32 * 1024;
const MAX_SESSIONS = Number(process.env.SIMURGH_GATEWAY_MAX_SESSIONS || 5000);
const FIXTURE_DIR = "docs/research/llm-shield/evidence/stage-3e/fixtures";
const FORBIDDEN_FIELDS = [
  "api_key",
  "anthropic_api_key",
  "openai_api_key",
  "provider_request_body",
  "provider_response_body",
  "mock_provider_output",
  "synthetic_provider_output",
  "raw_provider_output",
  "tool_result",
  "system_prompt",
  "developer_prompt",
];

function getSecret() {
  const s = process.env.SIMURGH_LLM_SHIELD_SECRET;
  if (!s) throw new Error("SIMURGH_LLM_SHIELD_SECRET not set");
  return s;
}
const deriveKey = (label) => crypto.createHmac("sha256", getSecret()).update(label).digest();
const tokenKey = () => deriveKey("llm-shield-gateway-token-v1");
const auditKey = () => deriveKey("llm-shield-gateway-audit-v1");

function requireConfig(_req, res, next) {
  if (!process.env.SIMURGH_LLM_SHIELD_SECRET)
    return res.status(503).json({ ok: false, error: "gateway_not_configured" });
  next();
}
function contentLengthWithinLimit(req, res, next) {
  const len = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(len) && len > BODY_LIMIT_BYTES)
    return res.status(413).json({ ok: false, error: "payload_too_large" });
  next();
}
function requireToken(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ ok: false, error: "token_missing" });
  const result = verifySessionToken(token, tokenKey());
  if (!result.valid)
    return res.status(401).json({ ok: false, error: "token_invalid", reason: result.reason });
  req.gwSessionId = result.sessionId;
  next();
}
function requirePathMatch(req, res, next) {
  if (req.gwSessionId !== req.params.sessionId)
    return res.status(403).json({ ok: false, error: "forbidden" });
  next();
}

router.use(contentLengthWithinLimit);
router.use(requireConfig);

router.post("/sessions", (_req, res) => {
  if (store.size >= MAX_SESSIONS)
    return res.status(503).json({ ok: false, error: "gateway_session_capacity_reached" });
  const sessionId = "gw_sess_" + crypto.randomBytes(12).toString("hex");
  const record = { auditChain: createChain(), runCounter: 0, riskScore: 0 };
  recordGatewaySessionCreated(record.auditChain, auditKey());
  store.set(sessionId, record);
  const token = issueSessionToken(sessionId, tokenKey(), stagingConfig.sessionTokenTtlMs);
  res.json({ ok: true, session_id: sessionId, token, privacy_mode: "metadata_only" });
});

router.post("/:sessionId/run", requireToken, requirePathMatch, async (req, res) => {
  const record = store.get(req.params.sessionId);
  if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
  const body = req.body ?? {};
  const key = auditKey();

  for (const f of FORBIDDEN_FIELDS) {
    if (Object.hasOwn(body, f))
      return res.status(400).json({ ok: false, error: "gateway_forbidden_field", field: f });
  }

  const providerMode = typeof body.provider_mode === "string" ? body.provider_mode : "mock";
  let provider = typeof body.provider === "string" ? body.provider : "mock";
  let liveConfig = null;
  let sel;
  if (providerMode === "live") {
    const g = evaluateLiveProvider(process.env);
    if (g.ok) {
      liveConfig = g.config;
      provider = g.config.provider;
      sel = { ok: true };
    } else {
      record.runCounter += 1;
      const runId = `gw_run_${String(record.runCounter).padStart(3, "0")}`;
      recordGatewayLiveConfigRejected(record.auditChain, key, g.reason);
      return finishConfigRejected(res, record, key, runId, g.reason, req.params.sessionId);
    }
  } else {
    sel = validateProviderSelection({ providerMode, provider });
  }
  if (!sel.ok) {
    record.runCounter += 1;
    const runId = `gw_run_${String(record.runCounter).padStart(3, "0")}`;
    return finishConfigRejected(res, record, key, runId, sel.reason, req.params.sessionId);
  }

  if (typeof body.input !== "string" || body.input.length === 0) {
    return res.status(400).json({ ok: false, error: "invalid_input" });
  }

  const limits = gatewayLimits();
  const contextChars = Array.isArray(body.contexts)
    ? body.contexts.reduce((n, c) => n + (typeof c?.content === "string" ? c.content.length : 0), 0)
    : 0;
  const caps = checkInputCaps({ inputChars: body.input.length, contextChars }, limits);
  if (!caps.ok) return res.status(413).json({ ok: false, error: caps.reason });

  // Stage 3E-live: separate live-specific caps (raw-context reject threshold + input cap).
  const live = liveConfig
    ? { limits: liveLimits(process.env), ledger: (record.liveLedger ??= createLiveLedger()) }
    : null;
  if (live) {
    if (body.input.length > live.limits.maxInputChars)
      return res.status(413).json({ ok: false, error: "gateway_input_too_large" });
    if (contextChars > live.limits.maxContextChars)
      return res.status(413).json({ ok: false, error: "gateway_live_context_too_large" });
  }

  const taskType = typeof body.task_type === "string" ? body.task_type : "unknown";
  const rawInput = body.input;
  const normalised = normalisePrompt(rawInput);
  const inputHash = hashPrompt(rawInput);
  const normalisedInputHash = hashPrompt(normalised);
  const inputVerdict = classifyPrompt(normalised).verdict;
  const contextResult = guardContexts(body.contexts);

  const providerCalled = inputVerdict !== "blocked" && contextResult.verdict !== "rejected";

  // Stage 3R: deployment-resilience fallback config (opt-in refusal fallback; default off).
  const fallbackOnRefusalEnabled = process.env.SIMURGH_GATEWAY_FALLBACK_ON_REFUSAL === "true";
  const fallbackBudget = { max_hops: 1, timeout_ms: 30000, max_additional_provider_calls: 1 };
  const fallbackModel = process.env.SIMURGH_GATEWAY_FALLBACK_MODEL || "claude-opus-4-8";
  const primaryModel = providerMode === "live" ? liveConfig.model : "mock-primary";

  // Live denial-of-wallet gate stays a terminal config rejection on the primary attempt.
  if (providerCalled && providerMode === "live") {
    const gate = checkLiveCall(live.ledger, live.limits, Date.now());
    if (!gate.ok) {
      record.runCounter += 1;
      const runId = `gw_run_${String(record.runCounter).padStart(3, "0")}`;
      return finishConfigRejected(res, record, key, runId, gate.reason, req.params.sessionId);
    }
  }

  // One containment-bounded attempt = provider(model) → normalise → tool gate → output firewall.
  function runBoundaries(rawOut) {
    const n = rawOut
      ? normaliseProviderOutput(rawOut)
      : { kind: "text", text: "", toolRequest: null };
    const tool = n.toolRequest
      ? gateToolRequest(n.toolRequest)
      : { verdict: "not_requested", reasonCodes: [], toolNameHash: null, toolCalled: false };
    const out =
      tool.verdict !== "blocked"
        ? scanOutput(n.text, { providerCalled: true })
        : { verdict: "not_called", reasonCodes: [], outputHash: hashPrompt(n.text) };
    const verdict =
      tool.verdict === "blocked" || out.verdict === "blocked"
        ? "blocked"
        : riskVerdict(
            riskPointsFor({
              inputVerdict,
              contextVerdict: contextResult.verdict,
              toolGateVerdict: tool.verdict,
              outputFirewallVerdict: out.verdict,
              repeatedWarning: false,
            })
          );
    return { norm: n, toolResult: tool, outputResult: out, riskVerdict: verdict };
  }

  async function callProvider(model, attemptIndex) {
    if (providerMode === "mock") {
      if (attemptIndex === 0 && typeof body.scenario_outcome === "string")
        return getGatewayProvider("mock").generate({
          scenario: { provider_outcome: body.scenario_outcome },
        });
      const scenarioName =
        attemptIndex === 0 && isValidScenario(body.scenario) ? body.scenario : "benign";
      return getGatewayProvider("mock").generate({ scenario: getScenario(scenarioName) });
    }
    if (providerMode === "recorded_fixture") {
      const manifest = JSON.parse(await readFile(`${FIXTURE_DIR}/fixture-manifest.json`, "utf8"));
      const rel = selectFixtureEntry(body.case_id, manifest);
      const fixture = JSON.parse(await readFile(`${FIXTURE_DIR}/${rel}`, "utf8"));
      validateRecordedFixture(fixture);
      return getGatewayProvider("recorded_fixture").generate({ fixture });
    }
    // live — fresh approved envelope on every attempt; never partial/refused output.
    const psc = buildProviderSafeContext(contextResult.acceptedContexts ?? body.contexts, {
      contextMode: liveConfig.contextMode,
    });
    const out = await getGatewayProvider("live").generate({
      model,
      safeInput: normalised,
      providerSafeContext: psc,
      apiKey: process.env.ANTHROPIC_API_KEY,
      limits: live.limits,
    });
    recordLiveCall(live.ledger, Date.now());
    liveConfig.__psc = psc;
    return out;
  }

  async function runAttempt(model, attemptIndex) {
    // Genuine provider setup throws (bad fixture path, live SDK error) propagate to the
    // outer config-rejection handler — unchanged from pre-3R. Deterministic availability
    // failures arrive as an error_code raw (no throw) and DO drive fallback.
    const attemptRaw = await callProvider(model, attemptIndex);
    const refusalMeta = isRefusal(attemptRaw) ? normaliseRefusal(attemptRaw) : null;
    return { raw: attemptRaw, ...runBoundaries(attemptRaw), refusalMeta };
  }

  // ----- provider + Stage 3R fallback orchestration (no network in mock/CI) -----
  let orchestration = null;
  let finalA = {
    raw: null,
    norm: { kind: "text", text: "", toolRequest: null },
    toolResult: {
      verdict: "not_requested",
      reasonCodes: [],
      toolNameHash: null,
      toolCalled: false,
    },
    outputResult: { verdict: "not_called", reasonCodes: [], outputHash: hashPrompt("") },
    riskVerdict: "accepted",
  };
  if (providerCalled) {
    try {
      orchestration = await runFallbackOrchestration({
        preCheck: { inputVerdict, contextVerdict: contextResult.verdict },
        config: { fallbackOnRefusalEnabled, budget: fallbackBudget, primaryModel, fallbackModel },
        runAttempt,
      });
    } catch (e) {
      record.runCounter += 1;
      const runId = `gw_run_${String(record.runCounter).padStart(3, "0")}`;
      return finishConfigRejected(
        res,
        record,
        key,
        runId,
        String(e.message || "gateway_provider_error"),
        req.params.sessionId
      );
    }
    finalA = orchestration.finalAttempt;
  }
  const raw = finalA.raw;
  const norm = finalA.norm;
  const toolResult = finalA.toolResult;
  const outputResult = finalA.outputResult;
  const providerResponseHash = hashPrompt(norm.text);

  // ----- risk (monotonic across any swap; identical to pre-3R when no fallback) -----
  const runPoints =
    inputVerdict === "blocked"
      ? 6
      : riskPointsFor({
          inputVerdict,
          contextVerdict: contextResult.verdict,
          toolGateVerdict: toolResult.verdict,
          outputFirewallVerdict: outputResult.verdict,
          repeatedWarning: false,
        });
  record.riskScore = (record.riskScore ?? 0) + runPoints + (orchestration?.riskDelta ?? 0);
  if (liveConfig) {
    record.riskScore += 1; // live provider call
    if ((liveConfig.__psc?.context_count ?? 0) > 0) record.riskScore += 1; // context summary sent
    if (raw?.error_code === "gateway_live_timeout") record.riskScore += 2; // timeout
  }
  let riskVerdictValue =
    inputVerdict === "blocked" || contextResult.verdict === "rejected"
      ? "blocked"
      : riskVerdict(record.riskScore);
  if (orchestration?.fallbackUsed)
    riskVerdictValue = mergeTrustMonotonic(riskVerdictValue, orchestration.finalVerdict);

  const gatewayVerdict =
    contextResult.verdict === "rejected" ||
    toolResult.verdict === "blocked" ||
    outputResult.verdict === "blocked" ||
    inputVerdict === "blocked"
      ? "blocked"
      : riskVerdictValue === "warning"
        ? "warning"
        : "accepted";

  const reasonCodes = [
    ...contextResult.reasonCodes,
    ...toolResult.reasonCodes,
    ...outputResult.reasonCodes,
  ];

  record.runCounter += 1;
  const runId = `gw_run_${String(record.runCounter).padStart(3, "0")}`;
  const sessionIdHash = hashPrompt(req.params.sessionId);
  const timestamp = new Date().toISOString();

  const auditEntryHash = recordGatewayRun(record.auditChain, key, {
    inputVerdict,
    contextVerdict: contextResult.verdict,
    providerCalled,
    providerResponseKind: norm.kind,
    toolGateVerdict: toolResult.verdict,
    outputFirewallVerdict: outputResult.verdict,
    riskVerdict: riskVerdictValue,
    reasonCodes,
    inputHash,
    normalisedInputHash,
    contextHashes: contextResult.contextHashes,
    toolNameHash: toolResult.toolNameHash,
    providerResponseHash,
    outputHash: outputResult.outputHash,
  });

  if (liveConfig && providerCalled) {
    recordGatewayLiveCall(record.auditChain, key, {
      providerResponseKind: norm.kind,
      providerResponseHash,
      errorCode: raw?.error_code ?? null,
      contextSummaryBuilt: (liveConfig.__psc?.context_count ?? 0) > 0,
      contextCount: liveConfig.__psc?.context_count ?? 0,
    });
  }

  // Stage 3R: every fallback swap is a signed event in the SAME session chain.
  if (orchestration?.fallbackUsed) {
    for (const swap of orchestration.fallback_chain)
      recordGatewayFallbackSwap(record.auditChain, key, {
        from: swap.from,
        to: swap.to,
        trigger: swap.trigger,
        refusalCategory: swap.refusal_category,
        riskDelta: swap.risk_delta,
      });
  }

  const receipt = buildGatewayReceipt({
    sessionIdHash,
    runId,
    taskType,
    inputHash,
    normalisedInputHash,
    contextVerdict: contextResult.verdict,
    contextHashes: contextResult.contextHashes,
    gatewayVerdict,
    providerMode,
    provider,
    providerCalled,
    providerResponseKind: norm.kind,
    providerResponseHash,
    toolGateVerdict: toolResult.verdict,
    toolNameHash: toolResult.toolNameHash,
    outputFirewallVerdict: outputResult.verdict,
    outputHash: outputResult.outputHash,
    riskScore: record.riskScore,
    riskVerdict: riskVerdictValue,
    latencyBucket: raw?.latency_bucket ?? "0-250ms",
    inputTokenBucket: raw?.usage?.input_tokens_bucket ?? "unknown",
    outputTokenBucket: raw?.usage?.output_tokens_bucket ?? "unknown",
    reasonCodes,
    auditEntryHash,
    timestamp,
    networkEgressUsed: Boolean(liveConfig) && providerCalled,
    fallbackUsed: orchestration?.fallbackUsed === true,
    fallbackOnRefusalEnabled,
    fallbackChain: orchestration?.fallback_chain ?? [],
    fallbackBudget,
    fallbackTerminalReason: orchestration?.terminalReason ?? null,
    live: liveConfig
      ? {
          provider_model_hash: raw?.provider_model_hash ?? null,
          provider_request_shape_hash: raw?.provider_request_shape_hash ?? null,
          provider_response_kind: norm.kind,
          live_context_mode: liveConfig.contextMode,
          live_context_sent: (liveConfig.__psc?.context_count ?? 0) > 0,
          prompt_cache_enabled: live.limits.promptCacheEnabled,
        }
      : undefined,
  });
  recordGatewayReceiptExported(record.auditChain, key, hashGatewayReceipt(receipt));

  const exported = gatewayVerdict === "accepted";
  return res.json({
    ok: exported,
    gateway_verdict: gatewayVerdict,
    input_verdict: inputVerdict,
    provider_called: providerCalled,
    output_exported: exported,
    tool_gate_verdict: toolResult.verdict,
    output_firewall_verdict: outputResult.verdict,
    risk_verdict: riskVerdictValue,
    reason_codes: reasonCodes,
    output_text: exported ? norm.text : undefined,
    receipt,
  });
});

function finishConfigRejected(res, record, key, runId, reason, sessionId) {
  const sessionIdHash = hashPrompt(sessionId);
  const timestamp = new Date().toISOString();
  const auditEntryHash = recordGatewayRun(record.auditChain, key, {
    inputVerdict: "safe",
    contextVerdict: "not_supplied",
    providerCalled: false,
    providerConfigRejected: true,
    providerResponseKind: "error",
    toolGateVerdict: "not_requested",
    outputFirewallVerdict: "not_called",
    riskVerdict: "warning",
    reasonCodes: [reason],
    inputHash: hashPrompt(""),
    normalisedInputHash: hashPrompt(""),
    contextHashes: [],
    toolNameHash: null,
    providerResponseHash: hashPrompt(""),
    outputHash: hashPrompt(""),
  });
  const receipt = buildGatewayReceipt({
    sessionIdHash,
    runId,
    taskType: "unknown",
    inputHash: hashPrompt(""),
    normalisedInputHash: hashPrompt(""),
    contextVerdict: "not_supplied",
    contextHashes: [],
    gatewayVerdict: "blocked",
    providerMode: "live",
    provider: "n/a",
    providerCalled: false,
    providerResponseKind: "error",
    providerResponseHash: hashPrompt(""),
    toolGateVerdict: "not_requested",
    toolNameHash: null,
    outputFirewallVerdict: "not_called",
    outputHash: hashPrompt(""),
    riskScore: record.riskScore ?? 0,
    riskVerdict: "warning",
    latencyBucket: "0-250ms",
    inputTokenBucket: "unknown",
    outputTokenBucket: "unknown",
    reasonCodes: [reason],
    auditEntryHash,
    timestamp,
  });
  recordGatewayReceiptExported(record.auditChain, key, hashGatewayReceipt(receipt));
  return res.status(400).json({ ok: false, error: reason, receipt });
}

router.get("/:sessionId/verify", requireToken, requirePathMatch, (req, res) => {
  const record = store.get(req.params.sessionId);
  if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
  const { valid, errors } = verifyChain(record.auditChain, auditKey());
  res.json({ ok: true, valid, head: record.auditChain.prevHash, errors });
});

router.get("/openapi.json", async (_req, res) => {
  try {
    const spec = await readFile("docs/research/llm-shield/evidence/stage-3e/openapi.json", "utf8");
    res.type("application/json").send(spec);
  } catch {
    res.status(503).json({ ok: false, error: "openapi_not_available" });
  }
});

export default router;
