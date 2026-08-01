// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 29 — the claim gate (511), and the signed non-claim set.
//
// WHAT IT IS, STATED AS §2.9 STATES IT: a fail-closed LEXICAL drift detector over a set-pinned
// collection of Stage 5S-authored claim surfaces. It is not a semantic proof that every possible
// paraphrase of an overclaim is absent, and 4X's lexical-≠-semantic bound is inherited rather than
// re-litigated.
//
// WHAT IT DOES NOT SCAN, and the exclusions are the load-bearing half: arbitrary repository prose,
// quoted prior art, test attack strings, historical stage documents, third-party content. A gate
// that scanned everything would fire on this file's own list of banned phrases, and the first fix
// anybody reached for would be deleting the list.
//
// PLACED BEFORE ATTESTATION, because attestation BINDS this set. Revision 1 had them reversed and
// still claimed the reinforcement (§13, B9) — an attestation binding a claim set that did not exist
// yet is binding nothing and saying so in signed bytes.
//
// "EXPENSIVE" IS BANNED. It is interpretive unless §5 defines a measurable cost, and §5 does not.
// The honest phrase this stage uses instead is "detectable and attributable once compared".

export const CLAIM_GATE_OUTCOME = "NONEQUIVOCATION_OVERCLAIM";

/**
 * Banned patterns. Each carries the reason it is banned and the phrase to use instead, because a
 * denylist that says only "no" teaches nothing and gets worked around rather than understood.
 */
export const BANNED_PATTERNS = Object.freeze([
  {
    id: "global_non_equivocation",
    pattern: /\b(?:the\s+)?producer\s+(?:did\s+not|does\s+not|never)\s+equivocat\w*/i,
    why: "detection is COMPARISON-BOUNDED (§1.4): green means no equivocation was demonstrated within the compared view set, never that none occurred",
    instead: "no conflict in the committed comparison set",
  },
  {
    id: "no_fork_occurred",
    pattern: /\bno\s+fork\s+(?:occurred|exists|existed|happened)\b/i,
    why: "the same overclaim in shorter words — a clean comparison says nothing about views outside it",
    instead: "no conflict in the committed comparison set",
  },
  {
    id: "expensive",
    pattern: /\bexpensive\b/i,
    why: "interpretive unless §5 defines a measurable cost, and §5 defines none",
    instead: "detectable and attributable once compared",
  },
  {
    id: "independently_witnessed",
    pattern: /\bindependent(?:ly)?\s+witness\w*/i,
    why: "every Lane B witness is one operator holding several keys (§5.1); independence is unproven by construction",
    instead: "witnessed quorum, independence unproven",
  },
  {
    id: "proves_honesty",
    pattern: /\b(?:proves|guarantees)\s+(?:the\s+)?(?:producer|provider)\s+(?:is\s+)?honest\w*/i,
    why: "nothing here observes honesty; the stage compares signed bytes",
    instead: "the compared checkpoints are compatible under the committed authority",
  },
  {
    id: "anchor_as_witness",
    pattern: /\banchor\w*\s+(?:witness|attest\w*\s+to\s+the\s+content)/i,
    why: "§3.1 — an anchor observes a digest, reads nothing, and carries zero witness weight",
    instead: "externally corroborated checkpoint digest",
  },
  {
    id: "model_safe",
    pattern: /\bmodel\s+is\s+safe\b/i,
    why: "the repository's standing honesty guardrail: boundary held, verifiably — never model safe",
    instead: "the boundary held, verifiably",
  },
]);

/** The signed non-claim IDs, frozen. Attestation binds this exact set (Task 30). */
export const NON_CLAIM_IDS = Object.freeze([
  "comparison_bounded_detection",
  "independence_unproven",
  "anchors_carry_no_witness_weight",
  "lexical_not_semantic_claim_gate",
  "multi_process_not_multi_party",
  "self_inflicted_control_is_not_an_accusation",
  "capture_absent_is_not_capture_achieved",
]);

export const CLAIM_REFUSALS = Object.freeze({
  OVERCLAIM: "NONEQUIVOCATION_OVERCLAIM",
  EMPTY_SURFACE_SET: "CLAIM_SURFACE_SET_EMPTY",
  SURFACE_UNREADABLE: "CLAIM_SURFACE_UNREADABLE",
});

/**
 * Scan a set of declared surfaces. Pure; never throws.
 *
 * @param {Array<{id: string, text: string}>} surfaces
 * @returns {{ok: boolean, refusals: Array<object>, scanned: Array<string>}}
 */
export function scanClaimSurfaces(surfaces) {
  const refusals = [];
  const list = Array.isArray(surfaces) ? surfaces : [];

  // An empty scan is a refusal. A gate over nothing passes hardest when it covers least, and this
  // repository has met that shape five times.
  if (list.length === 0) {
    return {
      ok: false,
      refusals: [
        { reason: CLAIM_REFUSALS.EMPTY_SURFACE_SET, detail: "no claim surface was declared" },
      ],
      scanned: [],
    };
  }

  const scanned = [];
  for (const surface of list) {
    if (!surface || typeof surface.text !== "string" || typeof surface.id !== "string") {
      refusals.push({
        reason: CLAIM_REFUSALS.SURFACE_UNREADABLE,
        detail: `surface ${JSON.stringify(surface?.id)} carries no text`,
      });
      continue;
    }
    scanned.push(surface.id);
    for (const banned of BANNED_PATTERNS) {
      const hit = banned.pattern.exec(surface.text);
      if (hit) {
        refusals.push({
          reason: CLAIM_REFUSALS.OVERCLAIM,
          surface: surface.id,
          banned_id: banned.id,
          detail: `"${hit[0]}" — ${banned.why}. Use instead: ${banned.instead}`,
        });
      }
    }
  }
  return { ok: refusals.length === 0, refusals, scanned: scanned.sort() };
}
