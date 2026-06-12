// Output claim firewall for Banking Shield B4-A. Validates the narrative shape,
// caps lengths, scans for affirmative-capability claims, and proves the official
// result the narrative references did not drift from the authoritative record.

export const NARRATIVE_FIELD_MAX_LENGTH = 600;

export const NARRATIVE_REQUIRED_STRING_FIELDS = Object.freeze([
  "plain_english_summary",
  "policy_outcome_explanation",
  "privacy_boundary_note",
  "audit_verify_explanation",
  "manual_review_note",
]);

const NARRATIVE_ALLOWED_FIELDS = Object.freeze([
  ...NARRATIVE_REQUIRED_STRING_FIELDS,
  "non_claims",
  "official_result_unchanged",
]);

// Affirmative-capability phrasings only. Bare words (e.g. "scam", "fraud") are
// deliberately NOT listed so required negated non-claims pass unharmed.
export const FORBIDDEN_CLAIM_PHRASES = Object.freeze([
  "fraud detected",
  "fraud detection",
  "detects fraud",
  "scam detected",
  "detects scams",
  "scam prevention capability",
  "prevents scams",
  "scam protection",
  "likely scam",
  "probably a scam",
  "payee verified",
  "verifies payees",
  "safe payment",
  "payment is safe",
  "financial advice",
  "bank-grade",
  "bank grade",
  "apra compliant",
  "cdr compliant",
  "confirmation of payee compliant",
  "aml compliant",
  "ctf compliant",
  "production ready",
  "production-ready",
  "protects your account",
  "prevents loss",
  "prevents financial loss",
  "malware detected",
  "reimbursement assessment",
]);

// Negators that mark an allowed disclaimer form ("not fraud detection",
// "does not detect scams"). A forbidden phrase is only flagged when it appears
// affirmatively — i.e. NOT immediately preceded by one of these.
const CLAIM_NEGATORS = Object.freeze(["not ", "no ", "n't ", "never ", "without "]);

export function scanForbiddenClaims(narrative) {
  const haystack = JSON.stringify(narrative).toLowerCase();
  for (const phrase of FORBIDDEN_CLAIM_PHRASES) {
    let idx = haystack.indexOf(phrase);
    while (idx !== -1) {
      const preceding = haystack.slice(Math.max(0, idx - 12), idx);
      if (!CLAIM_NEGATORS.some((neg) => preceding.endsWith(neg))) return phrase;
      idx = haystack.indexOf(phrase, idx + phrase.length);
    }
  }
  return null;
}

export function validateNarrativeSchema(narrative) {
  if (!narrative || typeof narrative !== "object" || Array.isArray(narrative)) {
    return { ok: false, reason: "narrative_not_object" };
  }
  for (const field of Object.keys(narrative)) {
    if (!NARRATIVE_ALLOWED_FIELDS.includes(field)) {
      return { ok: false, reason: "unexpected_field", field };
    }
  }
  for (const field of NARRATIVE_REQUIRED_STRING_FIELDS) {
    if (typeof narrative[field] !== "string") {
      return { ok: false, reason: "missing_string_field", field };
    }
    if (narrative[field].length > NARRATIVE_FIELD_MAX_LENGTH) {
      return { ok: false, reason: "field_too_long", field };
    }
  }
  if (!Array.isArray(narrative.non_claims) || narrative.non_claims.length === 0) {
    return { ok: false, reason: "missing_non_claims" };
  }
  for (const nonClaim of narrative.non_claims) {
    if (typeof nonClaim !== "string") {
      return { ok: false, reason: "invalid_non_claim", field: "non_claims" };
    }
    if (nonClaim.length > NARRATIVE_FIELD_MAX_LENGTH) {
      return { ok: false, reason: "field_too_long", field: "non_claims" };
    }
  }
  if (narrative.official_result_unchanged !== true) {
    return { ok: false, reason: "official_result_unchanged_not_true" };
  }
  return { ok: true };
}

export function checkOfficialResultUnchanged(payloadOfficial, recordOfficial) {
  for (const f of ["risk_score", "verdict", "manual_review_required"]) {
    if (payloadOfficial?.[f] !== recordOfficial?.[f]) {
      return { ok: false, reason: "official_result_changed", field: f };
    }
  }
  return { ok: true };
}

export function runOutputFirewall({ narrative, payloadOfficial, recordOfficial }) {
  const schema = validateNarrativeSchema(narrative);
  if (!schema.ok) return { ok: false, gate: "schema", ...schema };
  const forbidden = scanForbiddenClaims(narrative);
  if (forbidden) {
    return { ok: false, gate: "claim_guard", reason: "forbidden_claim", phrase: forbidden };
  }
  const official = checkOfficialResultUnchanged(payloadOfficial, recordOfficial);
  if (!official.ok) return { ok: false, gate: "official_result", ...official };
  return { ok: true };
}
