// SPDX-License-Identifier: AGPL-3.0-or-later
// Machine-readable constitutional alignment map (4O spec §11.1, booster C1). One claim-
// checked entry per raw code 55-66; `mechanism` is field-equality-checked against the
// shipped VTSA_RAW_CODES, `alignment_claim` is drawn ONLY from the closed vocabulary.
// The honesty ceiling is re-exported verbatim so callers cannot paraphrase it.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { VTSA_RAW_CODES } from "../../stage4h/exitCodes.mjs";
import { ALIGNMENT_VOCABULARY, HONESTY_CEILING } from "../constants.mjs";

export { HONESTY_CEILING };

// raw code -> alignment claim (each claim is a member of ALIGNMENT_VOCABULARY).
const CLAIM_BY_CODE = Object.freeze({
  55: "fails_closed_when_commitment_absent_or_malformed",
  56: "binds_commitment_to_an_accountable_signer",
  57: "keeps_freshness_logical_and_reviewable",
  58: "prevents_silent_substitution_of_the_authorised_tool_surface",
  59: "prevents_silent_substitution_of_the_authorised_tool_surface",
  60: "prevents_silent_tool_schema_replacement",
  61: "prevents_silent_authority_escalation",
  62: "prevents_silent_sink_expansion",
  63: "binds_each_receipt_to_the_decision_it_records",
  64: "prevents_hiding_a_broadening_inside_claimed_narrowings",
  65: "makes_blind_reapproval_of_a_broadening_a_ledgered_event",
  66: "prevents_retroactive_rewriting_of_the_committed_surface",
});

const nameByCode = Object.fromEntries(
  Object.entries(VTSA_RAW_CODES).map(([k, v]) => [v, k.toLowerCase()])
);

export function buildAlignmentMap() {
  return Object.values(VTSA_RAW_CODES)
    .sort((a, b) => a - b)
    .map((raw_code) => ({
      raw_code,
      mechanism: nameByCode[raw_code],
      alignment_claim: CLAIM_BY_CODE[raw_code],
      non_claim: "not_a_model_value_guarantee",
    }));
}

const KEYS = ["raw_code", "mechanism", "alignment_claim", "non_claim"];
const exact = (obj, keys) =>
  obj &&
  typeof obj === "object" &&
  Object.keys(obj).length === keys.length &&
  keys.every((k) => k in obj);

export function checkAlignmentMap(map) {
  if (!Array.isArray(map) || map.length !== 12) return { ok: false, detail: "count" };
  const codes = new Set();
  for (const e of map) {
    if (!exact(e, KEYS)) return { ok: false, detail: "keys" };
    if (nameByCode[e.raw_code] !== e.mechanism)
      return { ok: false, detail: `mechanism:${e.raw_code}` };
    if (!ALIGNMENT_VOCABULARY.includes(e.alignment_claim))
      return { ok: false, detail: `vocabulary:${e.raw_code}` };
    if (e.non_claim !== "not_a_model_value_guarantee")
      return { ok: false, detail: `non_claim:${e.raw_code}` };
    codes.add(e.raw_code);
  }
  return codes.size === 12 ? { ok: true } : { ok: false, detail: "duplicate_codes" };
}
