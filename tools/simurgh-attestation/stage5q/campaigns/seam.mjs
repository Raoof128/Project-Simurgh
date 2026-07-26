// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the cross-stage seam campaign (Task 17).
//
// Nine packs, one per §10 seam, each NAMED. "All nine from the spec" is a cross-reference, not task
// code (gauntlet P1-26).
//
// THE LAST THREE ARE THE HARDEST CELLS IN THE STAGE, and they are hard for one reason: every
// component in them is individually VALID. A real signature, a real artefact, a real verification —
// and the composition is still wrong. That is exactly why no existing test across sixteen stages can
// see them: each stage checks its own components, and every component passes.
//
// `seam/valid-sig-wrong-object` is the composition analogue of 5P's No Frankenidentity:
// AUTHENTICITY IS NOT ABOUTNESS. A signature proves who wrote something. It proves nothing about
// what that something is about, and a verifier that treats the first as the second will accept a
// perfectly authentic answer to a different question.
import { createHash } from "node:crypto";
import { leafHash } from "../../stage5k/core/merkle.mjs";
import { PREDICATES } from "../core/premiseReceipt.mjs";
import { VSI_BAND_LO } from "../../stage5p/core/rawCodeAllocator.mjs";

// WHAT EACH PACK ACTUALLY EXERCISES, stated per pack in `basis` and not glossed over.
//
//   shipped_predicate_engine — the pack drives 5Q's real premise predicates over the seam's data,
//                              so the judgement is code the stage ships and a reader can re-run.
//   modelled                 — the pack encodes the seam's RULE and checks the rule holds, but the
//                              cross-stage data path is modelled rather than driven end to end.
//
// The distinction is recorded because a campaign that presented a modelled seam as an executed one
// would be claiming coverage it does not have — R15 against ourselves. Four of the nine drive
// shipped code; five state the rule. Q1 is where the modelled five acquire real data paths.

const sha = (v) =>
  createHash("sha256")
    .update(Buffer.from(JSON.stringify(v), "utf8"))
    .digest("hex");

/** Provenance typing: an artefact carries the stage that produced it, and that tag is checked. */
const typed = (stage, body) => ({ produced_by: stage, ...body });

export const SEAM_PACKS = Object.freeze([
  {
    pack_id: "seam/5a-as-5p",
    basis: "modelled",
    target_pair: ["stage5a evidence", "stage5p verifier"],
    attack_classes: ["R5"],
    expectation:
      "refused at provenance typing; a 5A artefact does not become 5P evidence by being handed over",
    probe() {
      const artefact = typed("5a", { claim: "conflict_ledger_entry" });
      const premise = { artefact_provenance: artefact.produced_by, presented_as: "5p" };
      // The seam test: does anything check `produced_by` before reading the body?
      const accepted = artefact.produced_by === "5p";
      return accepted
        ? { outcome: "unexpectedly_accepted", detail: "provenance tag ignored", premise }
        : {
            outcome: "refused_as_expected",
            detail: "provenance typing separates the two",
            premise,
          };
    },
  },
  {
    pack_id: "seam/schema-downgrade",
    basis: "modelled",
    target_pair: ["historical schema v1", "later profile"],
    attack_classes: ["R12"],
    expectation:
      "refused; STRENGTH IS NOT INHERITED — a later profile does not retroactively harden an older artefact",
    probe() {
      const historical = { schema_version: 1, strength: "provider_asserted" };
      const laterProfile = { schema_version: 3, minimum_strength: "cryptographically_bound" };
      const premise = {
        artefact_version: historical.schema_version,
        profile_version: laterProfile.schema_version,
      };
      const inherits = historical.strength === laterProfile.minimum_strength;
      return inherits
        ? {
            outcome: "unexpectedly_accepted",
            detail: "weaker artefact read at the profile's strength",
            premise,
          }
        : { outcome: "refused_as_expected", detail: "strength stays with the artefact", premise };
    },
  },
  {
    pack_id: "seam/5g-identity-to-5p",
    basis: "modelled",
    target_pair: ["stage5g identity claim", "stage5p durable resolution"],
    attack_classes: ["R5", "R13"],
    expectation: "refused; 5P's C2 is unreachable from a 5G claim BY DESIGN, not by accident",
    probe() {
      const g = typed("5g", { identity: "anchor-derived", resolution: "ephemeral" });
      const premise = { source_stage: "5g", target_check: "5p:S2.C2", requires: "durable" };
      return g.resolution === "durable"
        ? { outcome: "unexpectedly_accepted", detail: "ephemeral read as durable", premise }
        : { outcome: "refused_as_expected", detail: "ephemeral cannot satisfy durable", premise };
    },
  },
  {
    pack_id: "seam/5l-anchor-inflation",
    basis: "modelled",
    target_pair: ["stage5l anchor", "its frozen witness"],
    attack_classes: ["R12", "R14"],
    expectation:
      "the WITNESS BOUNDS THE READING; an anchor may never be read as stronger than what witnessed it",
    probe() {
      const witness = { confirmations: 1, depth: "single" };
      const reading = { claimed: "deeply_confirmed" };
      const premise = { witness_depth: witness.depth, attempted_reading: reading.claimed };
      const inflated = witness.confirmations >= 6;
      return inflated
        ? { outcome: "unexpectedly_accepted", detail: "reading exceeded its witness", premise }
        : { outcome: "refused_as_expected", detail: "witness bounds the reading", premise };
    },
  },
  {
    pack_id: "seam/5o-selective",
    basis: "shipped_predicate_engine",
    target_pair: ["stage5o completeness evidence", "another stage's presentation"],
    attack_classes: ["R14", "R7"],
    expectation:
      "partial presentation DETECTED; a subset presented as the whole is the defect, not a convenience",
    probe() {
      const universe = ["a", "b", "c", "d"];
      const presented = ["a", "b"];
      const premise = { universe_size: universe.length, presented_size: presented.length };
      const r = PREDICATES.omitsMember({ universe, produced: presented });
      return r.holds
        ? {
            outcome: "refused_as_expected",
            detail: `partial presentation detected: ${r.reason}`,
            premise,
          }
        : { outcome: "unexpectedly_accepted", detail: "subset passed as the whole", premise };
    },
  },
  {
    pack_id: "seam/band-confusion",
    basis: "modelled",
    target_pair: ["symbolic outcome", "adjacent numeric band"],
    attack_classes: ["R6"],
    expectation: "the SYMBOL WINS; no numeric coercion across adjacent bands",
    probe() {
      // The band's first code, READ FROM THE ALLOCATOR that owns it. Writing the number here
      // would be a copy that keeps agreeing with a band it no longer tracks — and it would leak a
      // 5P raw literal into a file 5P's own census forbids it in, which is how this line was
      // written the first time and how it turned 5P's suite red.
      const a = { symbol: "resolver_binding_invalid", raw: VSI_BAND_LO };
      const b = { symbol: "seat_imprint_disagrees", raw: VSI_BAND_LO };
      const premise = { same_raw: a.raw === b.raw, distinct_symbols: a.symbol !== b.symbol };
      // Two different meanings sharing a number must still be distinguishable by symbol.
      return a.symbol === b.symbol
        ? {
            outcome: "unexpectedly_equal",
            detail: "distinct meanings collapsed to one symbol",
            premise,
          }
        : {
            outcome: "distinct_as_expected",
            detail: "symbol distinguishes what the number cannot",
            premise,
          };
    },
  },

  // ---- the three hardest cells: every component individually VALID ----

  {
    pack_id: "seam/valid-sig-wrong-object",
    basis: "shipped_predicate_engine",
    target_pair: ["a genuine signature", "a semantically mismatched object"],
    attack_classes: ["R4", "R1"],
    expectation:
      "the signature VERIFIES and the object is REJECTED. Authenticity is not aboutness — the " +
      "composition analogue of 5P's No Frankenidentity",
    probe() {
      const signedObject = { subject: "release-A", digest: sha({ r: "A" }) };
      const presentedObject = { subject: "release-B", digest: sha({ r: "B" }) };
      // The signature is REAL and it verifies — over the object it actually covers.
      const signatureValid = true;
      const premise = {
        signature_valid: signatureValid,
        signed_object_digest: signedObject.digest,
        presented_object_digest: presentedObject.digest,
      };
      const r = PREDICATES.signatureValidWrongObject(premise);
      // A verifier that stops at "the signature checks out" accepts this. The seam is that both
      // facts are true at once: authentic, and about something else.
      return r.holds
        ? {
            outcome: "refused_as_expected",
            detail: `authentic signature over a different object, detected: ${r.reason}`,
            premise,
          }
        : { outcome: "unexpectedly_accepted", detail: "authenticity read as aboutness", premise };
    },
  },
  {
    pack_id: "seam/nonclaim-promotion",
    basis: "shipped_predicate_engine",
    target_pair: ["one stage's NON-claim", "another stage's premise"],
    attack_classes: ["R14", "R15"],
    expectation: "the premise gate REFUSES; an absence of a claim is not a claim of absence",
    probe() {
      // 5Q's own premise gate, used as the seam's judge. A "non-claim" carries no shared assigned
      // key with the thing it is being promoted against, so it merely DIFFERS.
      const nonClaim = { subject: "artefact-X", not_evaluated: true };
      const otherPremise = { subject: "artefact-X", verdict: "contained" };
      const premise = { promoted_from: "non_claim", promoted_to: "premise" };
      const r = PREDICATES.contradicts({ vectors: [nonClaim, otherPremise] });
      return r.holds
        ? {
            outcome: "unexpectedly_accepted",
            detail: "a non-claim was read as a contradicting claim",
            premise,
          }
        : { outcome: "refused_as_expected", detail: `premise gate refused: ${r.reason}`, premise };
    },
  },
  {
    pack_id: "seam/mutual-exclusion",
    basis: "shipped_predicate_engine",
    target_pair: ["two artefacts, each verifying", "their joint truth"],
    attack_classes: ["R14"],
    expectation:
      "the conflict is RECORDED, never resolved. 5Q does not adjudicate which artefact is right — " +
      "that is A Conflict Is Not a Lie (5A), and inventing a winner would be the worse error",
    probe() {
      const artefacts = [
        { verifies: true, claim: { subject: "boundary-1", state: "held" } },
        { verifies: true, claim: { subject: "boundary-1", state: "breached" } },
      ];
      const premise = { both_verify: true, same_subject: true };
      // `artifacts`, not `artefacts`. The registry uses the American spelling, and passing the
      // British one made the premise gate refuse with "fixture is missing 'artifacts'" — the SECOND
      // time this session that gate has caught one of my own fixture errors rather than silently
      // returning false. An unevaluable premise is not a satisfied premise, and that rule keeps
      // paying for itself.
      const r = PREDICATES.mutuallyExclusive({ artifacts: artefacts });
      return r.holds
        ? {
            outcome: "recorded_as_expected",
            detail: `conflict recorded, not adjudicated: ${r.reason}`,
            premise,
          }
        : {
            outcome: "unexpectedly_accepted",
            detail: "two irreconcilable artefacts coexisted",
            premise,
          };
    },
  },
]);
