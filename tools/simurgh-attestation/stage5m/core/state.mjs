// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — two-level state machine over INJECTED facts. Reached only after 385-392 returned null, so the
// present seats are valid, cross-seat agrees, and present classes are distinct. computed_ecology_state is
// distinct from outcome_class (P0 #97-100). N = distinct verifier-pinned ecologies (plain number, never
// BigInt — canonicalJson throws on BigInt). 394 (lie) is checked before 393 (gap).
import { R } from "./result.mjs";

export function ecologyIndependenceNumber(facts) {
  return new Set(facts.present_valid_ecology_classes ?? []).size;
}

export function computedEcologyState(facts) {
  return facts.seat_present && ecologyIndependenceNumber(facts) === 3 ? "confirmed" : "incomplete";
}

export function outcomeClass(facts) {
  if (computedEcologyState(facts) === "confirmed") return "ecology_confirmed";
  return facts.declared_externally_anchored ? "false_anchored" : "ecology_incomplete";
}

export function stateFields(facts) {
  const computed_ecology_state = computedEcologyState(facts);
  return {
    computed_ecology_state,
    outcome_class: outcomeClass(facts),
    ecology_independence_number: ecologyIndependenceNumber(facts),
    externally_anchored: computed_ecology_state === "confirmed",
  };
}

export function checkState(facts) {
  const state = computedEcologyState(facts);
  if (state === "incomplete" && facts.declared_externally_anchored) {
    return R(394, "anchored_overclaim", stateFields(facts));
  }
  if (state === "incomplete") return R(393, "incomplete_ecology", stateFields(facts));
  return null; // confirmed → 0
}
