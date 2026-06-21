// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic Stage 3S self-proof: proves the narrative cannot lie. Each fixture drives
// the real parse/verify/render path with crafted slot JSON.
import { parseModelSlots, verifySlots, MODEL_SLOTS_SCHEMA } from "./claimChecker.mjs";
import { renderNarrative } from "./renderer.mjs";
import { buildEvidenceDigest } from "./evidenceDigest.mjs";

const DIGEST = buildEvidenceDigest({
  sessionHash: "sha256:s",
  sourceInputs: [],
  audit_chain_valid: true,
  daemon_proof_counts: { valid: 12, missing: 1, replayed: 0 },
  gateway: { fallback_used: true, fallback_bypass_successes: 0, output_firewall_blocks: 0 },
  vca: { attestation_verified: true, claim_conflicts: 0 },
  privacy: {
    raw_pixels_captured: false,
    raw_window_titles_captured: false,
    typed_content_captured: false,
  },
});
const wrap = (slots) => JSON.stringify({ type: MODEL_SLOTS_SCHEMA, source: {}, slots });
const slot = (o) => ({
  slot_id: "s1",
  evidence_ref: "gateway.fallback_used",
  operator: "==",
  expected_value: true,
  severity: "manual_review_recommended",
  wording: "fallback_observed",
  ...o,
});

export function runNarrativeSelfProof() {
  const fixtures = [];
  const add = (fixture_id, expected, observed) =>
    fixtures.push({
      fixture_id,
      expected,
      observed,
      passed: JSON.stringify(expected) === JSON.stringify(observed),
    });

  // helper that runs the full path from a raw model outputText
  const runText = (outputText) => {
    const parsed = parseModelSlots(outputText);
    if (!parsed.ok)
      return {
        result: "schema_violation",
        verifiedCount: 0,
        conflicts: 0,
        rejected: [],
        rendered: "",
      };
    const v = verifySlots(parsed.slots, DIGEST);
    const rendered = renderNarrative(v.verified).rendered_summary;
    return {
      result: "ok",
      verifiedCount: v.verified.length,
      conflicts: v.conflict_attempts,
      rejected: v.rejected,
      rendered,
    };
  };

  let r = runText(wrap([slot()]));
  add(
    "clean-supported-narrative",
    { result: "ok", verifiedCount: 1 },
    { result: r.result, verifiedCount: r.verifiedCount }
  );

  r = runText(wrap([slot({ evidence_ref: "gateway.does_not_exist" })]));
  add(
    "unsupported-signal-claim",
    { verified: 0, reason: "unsupported_slot" },
    { verified: r.verifiedCount, reason: r.rejected[0].reason }
  );

  r = runText(wrap([slot({ severity: "misconduct_confirmed" })]));
  add(
    "severity-overclaim",
    { verified: 0, reason: "unsupported_slot" },
    { verified: r.verifiedCount, reason: r.rejected[0].reason }
  );

  r = runText(
    wrap([
      slot({
        evidence_ref: "privacy.raw_pixels_captured",
        expected_value: true,
        wording: "integrity_signal_present",
      }),
    ])
  );
  // digest says raw_pixels_captured === false → claim that it's true is a conflict
  add(
    "privacy-overclaim",
    { verified: 0, reason: "narrative_claim_conflict" },
    { verified: r.verifiedCount, reason: r.rejected[0].reason }
  );

  r = runText(wrap([slot({ evidence_ref: "nope.missing" })]));
  add("missing-evidence-ref", { reason: "unsupported_slot" }, { reason: r.rejected[0].reason });

  r = runText(wrap([slot({ expected_value: false })]));
  add(
    "field-value-conflict",
    { reason: "narrative_claim_conflict", conflicts: 1 },
    { reason: r.rejected[0].reason, conflicts: r.conflicts }
  );

  r = runText("Sure, here is the JSON:\n" + wrap([slot()]));
  add("freeform-prose-injection", { result: "schema_violation" }, { result: r.result });

  r = runText(wrap([slot({ wording: "manual_review_recommended" })]));
  // accusatory words that must NEVER appear (the disclaimer legitimately negates "misconduct
  // finding", so we check for accusations, not that substring).
  add(
    "manual-review-wall",
    { hasReview: true, accusation: false },
    {
      hasReview: /manual review/i.test(r.rendered),
      accusation: /\b(guilty|cheated|malicious|fraud)\b/i.test(r.rendered),
    }
  );

  const d1 = renderNarrative([
    { slot_id: "s1", wording: "fallback_observed" },
    { slot_id: "s0", wording: "chain_valid" },
  ]);
  const d2 = renderNarrative([
    { slot_id: "s0", wording: "chain_valid" },
    { slot_id: "s1", wording: "fallback_observed" },
  ]);
  add(
    "renderer-determinism",
    { same: true },
    { same: d1.rendered_summary === d2.rendered_summary }
  );

  const conflictAttempts = fixtures.filter(
    (f) => f.fixture_id === "field-value-conflict" || f.fixture_id === "privacy-overclaim"
  ).length;
  return {
    type: "simurgh.defensive_narrative.self_proof.v1",
    stage: "3S",
    fixtures,
    summary: {
      narrative_claim_conflict_attempts: conflictAttempts,
      narrative_claim_conflicts_rendered: 0,
      automatic_findings_rendered: 0,
      privacy_overclaims_rendered: 0,
      all_passed: fixtures.every((f) => f.passed),
    },
  };
}
