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
import { validateProviderSelection } from "./gatewayEnv.js";
import { getGatewayProvider } from "./providerRegistry.js";
import { selectFixtureEntry, validateRecordedFixture } from "./recordedFixtureProvider.js";
import { normaliseProviderOutput } from "./providerOutputNormalise.js";
import { buildGatewayReceipt, hashGatewayReceipt } from "./gatewayReceipt.js";
import {
  recordGatewaySessionCreated,
  recordGatewayRun,
  recordGatewayReceiptExported,
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
  const provider = typeof body.provider === "string" ? body.provider : "mock";
  const sel = validateProviderSelection({ providerMode, provider });
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

  const taskType = typeof body.task_type === "string" ? body.task_type : "unknown";
  const rawInput = body.input;
  const normalised = normalisePrompt(rawInput);
  const inputHash = hashPrompt(rawInput);
  const normalisedInputHash = hashPrompt(normalised);
  const inputVerdict = classifyPrompt(normalised).verdict;
  const contextResult = guardContexts(body.contexts);

  const providerCalled = inputVerdict !== "blocked" && contextResult.verdict !== "rejected";

  // ----- provider (no network) -----
  let raw = null;
  if (providerCalled) {
    try {
      if (providerMode === "mock") {
        const scenarioName = isValidScenario(body.scenario) ? body.scenario : "benign";
        raw = getGatewayProvider("mock").generate({ scenario: getScenario(scenarioName) });
      } else {
        const manifest = JSON.parse(await readFile(`${FIXTURE_DIR}/fixture-manifest.json`, "utf8"));
        const rel = selectFixtureEntry(body.case_id, manifest);
        const fixture = JSON.parse(await readFile(`${FIXTURE_DIR}/${rel}`, "utf8"));
        validateRecordedFixture(fixture);
        raw = getGatewayProvider("recorded_fixture").generate({ fixture });
      }
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
  }

  const norm = providerCalled
    ? normaliseProviderOutput(raw)
    : { kind: "text", text: "", toolRequest: null };
  const providerResponseHash = hashPrompt(norm.text);

  // ----- tool gate (provider-side tools off; never executed) -----
  const toolResult =
    providerCalled && norm.toolRequest
      ? gateToolRequest(norm.toolRequest)
      : { verdict: "not_requested", reasonCodes: [], toolNameHash: null, toolCalled: false };

  // ----- output firewall (only when no tool block) -----
  const outputResult =
    providerCalled && toolResult.verdict !== "blocked"
      ? scanOutput(norm.text, { providerCalled: true })
      : { verdict: "not_called", reasonCodes: [], outputHash: providerResponseHash };

  // ----- risk -----
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
  record.riskScore = (record.riskScore ?? 0) + runPoints;
  const riskVerdictValue =
    inputVerdict === "blocked" || contextResult.verdict === "rejected"
      ? "blocked"
      : riskVerdict(record.riskScore);

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
  });
  recordGatewayReceiptExported(record.auditChain, key, hashGatewayReceipt(receipt));

  const exported = gatewayVerdict === "accepted";
  return res.json({
    ok: exported,
    gateway_verdict: gatewayVerdict,
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
