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
