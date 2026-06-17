// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E gateway audit events over the shared HMAC chain. Ordered to encode the
// gateway claim (provider skipped on fail-closed; output blocked before export).
// Every provider-called path records the output-hash reduction. Payloads
// whitelisted to hashes / verdicts / reason codes — never raw text.
import { appendEntry } from "../../audit/hmacChain.js";

export const GATEWAY_EVENTS = Object.freeze({
  LLM_GATEWAY_SESSION_CREATED: "LLM_GATEWAY_SESSION_CREATED",
  LLM_GATEWAY_REQUEST_ACCEPTED: "LLM_GATEWAY_REQUEST_ACCEPTED",
  LLM_GATEWAY_REQUEST_REJECTED: "LLM_GATEWAY_REQUEST_REJECTED",
  LLM_GATEWAY_PROVIDER_CONFIG_REJECTED: "LLM_GATEWAY_PROVIDER_CONFIG_REJECTED",
  LLM_GATEWAY_PROVIDER_SKIPPED: "LLM_GATEWAY_PROVIDER_SKIPPED",
  LLM_GATEWAY_PROVIDER_CALLED: "LLM_GATEWAY_PROVIDER_CALLED",
  LLM_GATEWAY_PROVIDER_OUTPUT_HASHED: "LLM_GATEWAY_PROVIDER_OUTPUT_HASHED",
  LLM_GATEWAY_PROVIDER_TOOL_REQUEST_DETECTED: "LLM_GATEWAY_PROVIDER_TOOL_REQUEST_DETECTED",
  LLM_GATEWAY_TOOL_BLOCKED: "LLM_GATEWAY_TOOL_BLOCKED",
  LLM_GATEWAY_OUTPUT_ACCEPTED: "LLM_GATEWAY_OUTPUT_ACCEPTED",
  LLM_GATEWAY_OUTPUT_BLOCKED: "LLM_GATEWAY_OUTPUT_BLOCKED",
  LLM_GATEWAY_RISK_ACCUMULATED: "LLM_GATEWAY_RISK_ACCUMULATED",
  LLM_GATEWAY_RISK_ESCALATED: "LLM_GATEWAY_RISK_ESCALATED",
  LLM_GATEWAY_RECEIPT_EXPORTED: "LLM_GATEWAY_RECEIPT_EXPORTED",
  LLM_GATEWAY_LIVE_CONFIG_ACCEPTED: "LLM_GATEWAY_LIVE_CONFIG_ACCEPTED",
  LLM_GATEWAY_LIVE_CONFIG_REJECTED: "LLM_GATEWAY_LIVE_CONFIG_REJECTED",
  LLM_GATEWAY_LIVE_RATE_LIMIT_CHECKED: "LLM_GATEWAY_LIVE_RATE_LIMIT_CHECKED",
  LLM_GATEWAY_LIVE_PROVIDER_IMPORT_STARTED: "LLM_GATEWAY_LIVE_PROVIDER_IMPORT_STARTED",
  LLM_GATEWAY_LIVE_PROVIDER_IMPORT_OK: "LLM_GATEWAY_LIVE_PROVIDER_IMPORT_OK",
  LLM_GATEWAY_LIVE_PROVIDER_CALLED: "LLM_GATEWAY_LIVE_PROVIDER_CALLED",
  LLM_GATEWAY_LIVE_PROVIDER_TIMEOUT: "LLM_GATEWAY_LIVE_PROVIDER_TIMEOUT",
  LLM_GATEWAY_LIVE_PROVIDER_ERROR: "LLM_GATEWAY_LIVE_PROVIDER_ERROR",
  LLM_GATEWAY_LIVE_PROVIDER_RESPONSE_HASHED: "LLM_GATEWAY_LIVE_PROVIDER_RESPONSE_HASHED",
  LLM_GATEWAY_LIVE_CONTEXT_SUMMARY_BUILT: "LLM_GATEWAY_LIVE_CONTEXT_SUMMARY_BUILT",
  LLM_GATEWAY_LIVE_CONTEXT_REJECTED: "LLM_GATEWAY_LIVE_CONTEXT_REJECTED",
});

export function recordGatewaySessionCreated(chain, key) {
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_SESSION_CREATED, {});
  return chain.prevHash;
}

export function recordGatewayRun(chain, key, d) {
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_REQUEST_ACCEPTED, {
    input_verdict: d.inputVerdict,
    input_hash: d.inputHash,
    normalised_input_hash: d.normalisedInputHash,
    context_verdict: d.contextVerdict,
    reason_codes: d.reasonCodes ?? [],
  });

  if (!d.providerCalled) {
    if (d.providerConfigRejected) {
      appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_CONFIG_REJECTED, {
        reason_codes: d.reasonCodes ?? [],
      });
    }
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_SKIPPED, {});
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RISK_ACCUMULATED, {
      risk_verdict: d.riskVerdict,
    });
    if (d.riskVerdict === "blocked")
      appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RISK_ESCALATED, {});
    return chain.prevHash;
  }

  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_CALLED, {
    provider_response_kind: d.providerResponseKind,
  });
  // Every provider-called path records the output-hash reduction, even when the
  // output is tool-shaped and the tool gate blocks it (the gateway already hashed
  // norm.text and the receipt carries provider_response_hash).
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_OUTPUT_HASHED, {
    provider_response_hash: d.providerResponseHash,
  });

  if (d.toolGateVerdict === "blocked") {
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_TOOL_REQUEST_DETECTED, {
      tool_name_hash: d.toolNameHash,
    });
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_TOOL_BLOCKED, {
      reason_codes: d.reasonCodes ?? [],
    });
  } else if (d.outputFirewallVerdict === "blocked") {
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_BLOCKED, {
      reason_codes: d.reasonCodes ?? [],
    });
  } else {
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_ACCEPTED, {});
  }

  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RISK_ACCUMULATED, {
    risk_verdict: d.riskVerdict,
  });
  if (d.riskVerdict === "blocked")
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RISK_ESCALATED, {});
  return chain.prevHash;
}

export function recordGatewayReceiptExported(chain, key, receiptHash) {
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_RECEIPT_EXPORTED, {
    receipt_hash: receiptHash,
  });
}

// Additive live-call annotation events. Emitted alongside (not instead of) the
// existing provider-called chain. Payloads are hashes / verdicts / reason codes only.
export function recordGatewayLiveCall(chain, key, d) {
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_CONFIG_ACCEPTED, {});
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_RATE_LIMIT_CHECKED, {});
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_CALLED, {
    provider_response_kind: d.providerResponseKind,
  });
  if (d.errorCode === "gateway_live_timeout")
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_TIMEOUT, {});
  else if (d.errorCode)
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_ERROR, {
      reason_codes: [d.errorCode],
    });
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_RESPONSE_HASHED, {
    provider_response_hash: d.providerResponseHash,
  });
  if (d.contextSummaryBuilt)
    appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_CONTEXT_SUMMARY_BUILT, {
      context_count: d.contextCount ?? 0,
    });
  return chain.prevHash;
}

export function recordGatewayLiveConfigRejected(chain, key, reason) {
  appendEntry(chain, key, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_CONFIG_REJECTED, {
    reason_codes: [reason],
  });
  return chain.prevHash;
}
