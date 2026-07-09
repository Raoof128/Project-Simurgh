// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — evaluate pipeline (plan Task 9). Motto: AnthropicSafe First, then ReviewerSafe.
// Frozen first-failure order 240→253; wrapper 254 LAST. Public runs 240→252 (skips audit-only 253).
import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VARL_CHECK_ORDER, VARL_PUBLIC_CODES } from "../../stage4h/exitCodes.mjs";
import {
  checkSourceDigests,
  checkContiguity,
  checkRecipes,
  checkWatcherVerdicts,
  checkClosedCounts,
  checkResidual,
  checkDurability,
  checkTrilemma,
} from "./ledgerCore.mjs";
import { checkByo, checkProvenance, checkOverclaim, checkAuditPrivate } from "./claimCore.mjs";

const BUNDLE_KEYS = new Set([
  "schema",
  "ruleset_id",
  "gate_registry",
  "base_corpus",
  "rungs",
  "trilemma_corners",
  "byo_target",
  "attester_provenance",
  "audit_private_digest",
  "audit_private_schema",
  "audit_private_attempt_count",
  "audit_private_round_digest_set",
  "analyst_note",
  "attestation_pub_key_pem",
  "signature",
]);

export const contentOf = (bundle) => {
  const { signature, ...content } = bundle;
  return content;
};

export function signBundle(content, privatePem) {
  const key = createPrivateKey(privatePem);
  return edSign(null, Buffer.from(canonicalJson(content), "utf8"), key).toString("base64");
}

// 240 — top-level key allowlist (unexpected key, e.g. added after signing).
function checkSchema(bundle) {
  if (!bundle || typeof bundle !== "object") return 240;
  if (bundle.schema !== "simurgh.varl.escalation_ledger.v1") return 240;
  for (const k of Object.keys(bundle)) if (!BUNDLE_KEYS.has(k)) return 240;
  return null;
}

// 241 — Ed25519 signature over canonicalJson(content); pub key is inside content (key-swap → 241).
function checkSignature(bundle) {
  try {
    const pem = bundle.attestation_pub_key_pem;
    if (typeof pem !== "string" || typeof bundle.signature !== "string") return 241;
    const ok = edVerify(
      null,
      Buffer.from(canonicalJson(contentOf(bundle)), "utf8"),
      createPublicKey(pem),
      Buffer.from(bundle.signature, "base64")
    );
    return ok ? null : 241;
  } catch {
    return 241;
  }
}

// code → check. 253 receives the audit-private log.
function runCheck(code, bundle, auditPrivate) {
  switch (code) {
    case 240:
      return checkSchema(bundle);
    case 241:
      return checkSignature(bundle);
    case 242:
      return checkSourceDigests(bundle);
    case 243:
      return checkContiguity(bundle);
    case 244:
      return checkRecipes(bundle);
    case 245:
      return checkWatcherVerdicts(bundle);
    case 246:
      return checkClosedCounts(bundle);
    case 247:
      return checkResidual(bundle);
    case 248:
      return checkDurability(bundle);
    case 249:
      return checkTrilemma(bundle);
    case 250:
      return checkByo(bundle);
    case 251:
      return checkProvenance(bundle);
    case 252:
      return checkOverclaim(bundle);
    case 253:
      return checkAuditPrivate(bundle, auditPrivate);
    default:
      return null;
  }
}

// Runs the frozen order; returns { raw } of the first fault, else { raw: 0 }.
export function evaluateVarl(bundle, { tier = "audit", auditPrivate } = {}) {
  const order = tier === "public" ? VARL_PUBLIC_CODES : VARL_CHECK_ORDER;
  for (const code of order) {
    const r = runCheck(code, bundle, tier === "public" ? undefined : auditPrivate);
    if (r !== null) return { raw: r };
  }
  return { raw: 0 };
}

// Fail-closed wrapper (254 LAST): any throw past the pipeline is wrapped, never leaks green.
export function evaluateVarlSafe(bundle, opts = {}) {
  try {
    return evaluateVarl(bundle, opts);
  } catch {
    return { raw: 254 };
  }
}
