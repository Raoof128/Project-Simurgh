// SPDX-License-Identifier: AGPL-3.0-or-later
export const RAW_VERIFIER_CODES = Object.freeze({
  OK: 0,
  SCHEMA_INVALID: 20,
  PROOF_SYSTEM_UNSUPPORTED: 21,
  PREMISE_DIGEST_MISMATCH: 22,
  POLICY_DIGEST_MISMATCH: 23,
  EXPLICIT_FLOW_INTEGRITY_VIOLATION: 24,
  PACK_BINDING_MISMATCH: 25,
  PROOF_TAMPER_DETECTED: 26,
  PRIVACY_LEAK_DETECTED: 27,
  CHECKER_NOT_OFFLINE: 28,
  INTERNAL_ERROR_FAIL_CLOSED: 29,
});

export const HARNESS_CODES = Object.freeze({
  CLEAN_RUN_FALSELY_REJECTED: 19,
});

export function stage4CodeForRawCode(code) {
  if (code === 0) return 0;
  if (code >= 19 && code <= 27) return 1;
  if (code === 28) return 2;
  return 3;
}
