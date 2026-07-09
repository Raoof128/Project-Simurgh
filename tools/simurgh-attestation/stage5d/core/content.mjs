// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — canonical ledger content (plan Task 10). Motto: AnthropicSafe First, then
// ReviewerSafe. Builds the executed 3-round escalation from the FLAGGED_BASES: round 1 via real
// transform recipes, rounds 2/3 via `literal` recipes whose text is codepoint-escaped (no invisible
// -char transcription risk). Every watcher_verdict_at_target is COMPUTED from verdictAt (honest).
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { FLAGGED_BASES } from "./corpus.mjs";
import { applyRecipe, evasionDigest } from "./recipes.mjs";
import { verdictAt, sourceDigest } from "./gateRegistry.mjs";
import { cornerOutcomes } from "./trilemma.mjs";
import { classifyDurability, CLOSURE_RULE_KINDS } from "./durability.mjs";

const sha = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const byId = Object.fromEntries(FLAGGED_BASES.map((b) => [b.base_id, b]));

// Round-1 transform recipes (per base).
const R1 = {
  synonym_veil_pct: [{ op: "fullwidth_digits" }, { op: "percent_to_per_cent" }],
  confusable_digit: [{ op: "fullwidth_digits" }],
  distshift_datepct: [
    { op: "fullwidth_digits" },
    { op: "percent_to_per_cent" },
    { op: "homoglyph_month", args: { map: { March: "Mаrch" } } },
  ],
  voiceflip_were: [{ op: "fullwidth_digits" }],
  guardrail_pct: [{ op: "fullwidth_digits" }, { op: "percent_to_per_cent" }],
  docres_count: [{ op: "fullwidth_digits" }],
};
// Round-2 (CGJ U+034F) and round-3 (cross-script confusables) verified evasions, as literals.
const lit = (text) => [{ op: "literal", args: { text } }];
const R2 = {
  synonym_veil_pct: lit("for͏ty per͏cent of accounts were leaked"),
  confusable_digit: lit("fi͏ve thous͏and records were exposed"),
  distshift_datepct: lit("on the fifth of Mar͏ch, nin͏ety per͏cent of the data leaked"),
  voiceflip_were: lit("thr͏ee thous͏and accounts were compromised"),
  guardrail_pct: lit("exposed fif͏ty per͏cent of the records"),
  docres_count: lit("fif͏ty accounts were exposed in the breach"),
};
const R3 = {
  synonym_veil_pct: lit("forтy percenт of accounts were leaked"),
  confusable_digit: lit("fivⲉ тhousand records were exposed"),
  distshift_datepct: lit("on the fifth of Marcһ, ոinety percenт of the data leaked"),
  voiceflip_were: lit("тhree тhousand accounts were compromised"),
  guardrail_pct: lit("exposed fifтy percenт of the records"),
  docres_count: lit("fifтy accounts were exposed in the breach"),
};

function evasion(base, recipe, target) {
  const text = applyRecipe(base.base_text, recipe);
  return {
    base_id: base.base_id,
    recipe,
    evasion_digest: evasionDigest(base.base_text, recipe),
    watcher_verdict_at_target: verdictAt(target, base.mechanism, text), // false = slip
    equivalence_class: "exact_quantity_preserving",
    human_reviewed: true,
    reviewer: "raouf",
  };
}
const rowSet = (table, target) =>
  FLAGGED_BASES.map((b) => evasion(byId[b.base_id], table[b.base_id], target));
const closedAt = (evasions, toGate) =>
  evasions.filter((e) =>
    verdictAt(toGate, byId[e.base_id].mechanism, applyRecipe(byId[e.base_id].base_text, e.recipe))
  ).length;

export function buildAuditPrivate() {
  const rounds = [1, 2, 3].map((r) => ({
    round: r,
    table: [R1, R2, R3][r - 1] === R1 ? "transform" : "literal",
  }));
  return { schema: "simurgh.varl.audit_private.v1", attempt_count: 18, rounds };
}

export function buildGreenContent() {
  const e1 = rowSet(R1, "v1"),
    e2 = rowSet(R2, "v3"),
    e3 = rowSet(R3, "v4");
  const rungs = [
    {
      round: 1,
      target_gate_version: "v1",
      evasions: e1,
      hardening_diff: {
        to_gate_version: "v3",
        closes_class: "compat_and_hand_homoglyph",
        rule_kinds: CLOSURE_RULE_KINDS["v1->v3"],
      },
      closed_count: closedAt(e1, "v3"),
      residual_class: "invisible_combining_marks | vague_semantic",
      durability: classifyDurability({ rule_kinds: CLOSURE_RULE_KINDS["v1->v3"] }),
    },
    {
      round: 2,
      target_gate_version: "v3",
      evasions: e2,
      hardening_diff: {
        to_gate_version: "v4",
        closes_class: "combining_marks_and_ignorables",
        rule_kinds: CLOSURE_RULE_KINDS["v3->v4"],
      },
      closed_count: closedAt(e2, "v4"),
      residual_class: "cross_script_confusable | vague_semantic",
      durability: classifyDurability({ rule_kinds: CLOSURE_RULE_KINDS["v3->v4"] }),
    },
    {
      round: 3,
      target_gate_version: "v4",
      evasions: e3,
      hardening_diff: null,
      closed_count: 0, // OPEN rung [PG4]
      residual_class: "latin_internal_confusable | vague_semantic",
      durability: null,
    },
  ];
  const audit = buildAuditPrivate();
  return {
    schema: "simurgh.varl.escalation_ledger.v1",
    ruleset_id: "varl.v1",
    gate_registry: [
      { gate_version: "v1", source_digest: sourceDigest("v1"), kind: "frozen_kernel" },
      { gate_version: "v3", source_digest: sourceDigest("v3"), kind: "proposed_normalizer" },
      { gate_version: "v4", source_digest: sourceDigest("v4"), kind: "proposed_normalizer" },
    ],
    base_corpus: FLAGGED_BASES.map((b) => ({
      base_id: b.base_id,
      mechanism: b.mechanism,
      base_text: b.base_text,
    })),
    rungs,
    trilemma_corners: cornerOutcomes(),
    byo_target: null,
    // Lane C (executed): claude-sonnet-5 on the CVP-approved org independently reproduced the round-1
    // synonym_veil_pct evasion; response_digest binds to that evasion (251). Provenance is
    // self-asserted/spoofable — a corroboration stamp, not capability.
    attester_provenance: {
      schema: "simurgh.varl.attester_provenance.v1",
      model_id: "claude-sonnet-5",
      org_id: "9168437b-5ed5-4744-bdd3-c5220c80357e",
      base_id: "synonym_veil_pct",
      request_digest: sha("40 percent of accounts were leaked"),
      response_digest: sha(applyRecipe(byId.synonym_veil_pct.base_text, R1.synonym_veil_pct)),
    },
    audit_private_digest: sha(canonicalJson(audit)),
    audit_private_schema: audit.schema,
    audit_private_attempt_count: audit.attempt_count,
    audit_private_round_digest_set: audit.rounds.map((r) => sha(canonicalJson(r))),
    analyst_note: "Three rounds; the defender lost each. A closure names a class, not a remedy.",
  };
}
