// SPDX-License-Identifier: AGPL-3.0-or-later
// LLM Shield audit events over the shared HMAC chain. Recorders enforce the spec
// event order so the "blocked before model invocation" claim is auditable, not
// asserted. Decision payloads are whitelisted to hashes/verdict/reason codes only
// — raw input text never enters the chain (metadata-only privacy claim).
import { appendEntry } from "../audit/hmacChain.js";

export const LLM_SHIELD_EVENTS = Object.freeze({
  LLM_SESSION_CREATED: "LLM_SESSION_CREATED",
  LLM_INPUT_ACCEPTED: "LLM_INPUT_ACCEPTED",
  LLM_INPUT_WARNED: "LLM_INPUT_WARNED",
  LLM_INPUT_BLOCKED: "LLM_INPUT_BLOCKED",
  LLM_PROVIDER_CALLED: "LLM_PROVIDER_CALLED",
  LLM_PROVIDER_SKIPPED: "LLM_PROVIDER_SKIPPED",
  LLM_OUTPUT_ACCEPTED: "LLM_OUTPUT_ACCEPTED",
  LLM_RECEIPT_EXPORTED: "LLM_RECEIPT_EXPORTED",
  // Stage 3D containment events.
  LLM_CONTEXT_ACCEPTED: "LLM_CONTEXT_ACCEPTED",
  LLM_CONTEXT_DEMOTED: "LLM_CONTEXT_DEMOTED",
  LLM_CONTEXT_REJECTED: "LLM_CONTEXT_REJECTED",
  LLM_RISK_ACCUMULATED: "LLM_RISK_ACCUMULATED",
  LLM_RISK_ESCALATED: "LLM_RISK_ESCALATED",
  LLM_TOOL_REQUESTED: "LLM_TOOL_REQUESTED",
  LLM_TOOL_ALLOWED_MOCK: "LLM_TOOL_ALLOWED_MOCK",
  LLM_TOOL_BLOCKED: "LLM_TOOL_BLOCKED",
  LLM_TOOL_SKIPPED: "LLM_TOOL_SKIPPED",
  LLM_OUTPUT_BLOCKED: "LLM_OUTPUT_BLOCKED",
  LLM_STAGE3D_RECEIPT_EXPORTED: "LLM_STAGE3D_RECEIPT_EXPORTED",
});

export function buildDecisionPayload({
  verdict,
  reasonCodes = [],
  detectedAttackClasses = [],
  inputHash,
  normalisedInputHash,
  modelCalled,
  signals = [],
}) {
  return {
    verdict,
    reason_codes: reasonCodes,
    detected_attack_classes: detectedAttackClasses,
    input_hash: inputHash,
    normalised_input_hash: normalisedInputHash,
    model_called: modelCalled,
    signals,
  };
}

export function recordSessionCreated(chain, hmacKey) {
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_SESSION_CREATED, {});
  return chain.prevHash;
}

export function recordBlockedRun(chain, hmacKey, decision) {
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_INPUT_BLOCKED, buildDecisionPayload(decision));
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_PROVIDER_SKIPPED, {});
  return chain.prevHash;
}

export function recordSafeRun(chain, hmacKey, decision) {
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_INPUT_ACCEPTED, buildDecisionPayload(decision));
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_PROVIDER_CALLED, {});
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_OUTPUT_ACCEPTED, {});
  return chain.prevHash;
}

export function recordWarnedRun(chain, hmacKey, decision) {
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_INPUT_WARNED, buildDecisionPayload(decision));
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_PROVIDER_CALLED, {});
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_OUTPUT_ACCEPTED, {});
  return chain.prevHash;
}

export function recordReceiptExported(chain, hmacKey, receiptHash) {
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_RECEIPT_EXPORTED, {
    receipt_hash: receiptHash,
  });
}

// Stage 3D: ordered events for a containment run over the shared HMAC chain.
// Order encodes the containment claim (e.g. "provider skipped after context
// rejection"). Payloads stay whitelisted to hashes/verdicts/reason codes.
function stage3dInputEvent(verdict) {
  if (verdict === "blocked") return LLM_SHIELD_EVENTS.LLM_INPUT_BLOCKED;
  if (verdict === "warning") return LLM_SHIELD_EVENTS.LLM_INPUT_WARNED;
  return LLM_SHIELD_EVENTS.LLM_INPUT_ACCEPTED;
}

function stage3dContextEvent(verdict) {
  if (verdict === "rejected") return LLM_SHIELD_EVENTS.LLM_CONTEXT_REJECTED;
  if (verdict === "demoted") return LLM_SHIELD_EVENTS.LLM_CONTEXT_DEMOTED;
  if (verdict === "accepted") return LLM_SHIELD_EVENTS.LLM_CONTEXT_ACCEPTED;
  return null; // not_supplied
}

export function recordStage3dRun(chain, hmacKey, decision) {
  const payload = buildDecisionPayload({
    verdict: decision.inputVerdict,
    reasonCodes: decision.reasonCodes,
    detectedAttackClasses: [],
    inputHash: decision.inputHash,
    normalisedInputHash: decision.normalisedInputHash,
    modelCalled: decision.providerCalled,
    signals: decision.signals ?? [],
  });

  appendEntry(chain, hmacKey, stage3dInputEvent(decision.inputVerdict), payload);

  const ctxEvent = stage3dContextEvent(decision.contextVerdict);
  if (ctxEvent) appendEntry(chain, hmacKey, ctxEvent, { reason_codes: decision.reasonCodes });

  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_RISK_ACCUMULATED, {
    risk_verdict: decision.riskVerdict,
  });
  if (decision.riskVerdict === "blocked") {
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_RISK_ESCALATED, {});
  }

  if (!decision.providerCalled) {
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_PROVIDER_SKIPPED, {});
    return chain.prevHash;
  }

  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_PROVIDER_CALLED, {});

  if (decision.toolGateVerdict === "blocked") {
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_TOOL_REQUESTED, {
      tool_name_hash: decision.toolNameHash,
    });
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_TOOL_BLOCKED, {
      reason_codes: decision.reasonCodes,
    });
  } else if (decision.toolGateVerdict === "allowed") {
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_TOOL_REQUESTED, {
      tool_name_hash: decision.toolNameHash,
    });
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_TOOL_ALLOWED_MOCK, {});
  } else {
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_TOOL_SKIPPED, {});
  }

  if (decision.outputFirewallVerdict === "blocked") {
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_OUTPUT_BLOCKED, {
      reason_codes: decision.reasonCodes,
    });
  } else {
    appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_OUTPUT_ACCEPTED, {});
  }

  return chain.prevHash;
}

export function recordStage3dReceiptExported(chain, hmacKey, receiptHash) {
  appendEntry(chain, hmacKey, LLM_SHIELD_EVENTS.LLM_STAGE3D_RECEIPT_EXPORTED, {
    receipt_hash: receiptHash,
  });
}
