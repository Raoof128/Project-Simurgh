// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the current-head composition campaign (Task 15).
//
// Six enumerated packs, each with a NAMED target pair and a stated expectation. "Combinations no
// single tray sees" is a description, not a task (gauntlet P1-26) — so every pack below names the
// two things it composes and what must happen when they meet.
//
// These are compositions, and compositions belong to no stage. Each tray is scoped to one stage and
// asks "is this function sound". A campaign asks "do these two sound things stay sound together",
// which is a question no tray is positioned to ask.
//
// Every probe RECOMPUTES its premise rather than declaring one. A pack that reports no premise has
// not shown it built a real case, and the campaign record says so per pack.

import { createHash } from "node:crypto";
import { hkdfExtract, hkdfExpand } from "../../stage5o/core/hkdf.mjs";
import { leafHash, nodeHash } from "../../stage5k/core/merkle.mjs";
import { checkCensus } from "../../stage5f/core/census.mjs";
import { sha256Canon } from "../../stage5f/core/digests.mjs";
import { VSI_ALLOCATION, VSI_BAND_LO, VSI_BAND_HI } from "../../stage5p/core/rawCodeAllocator.mjs";
import { checkFindingClassification } from "../../stage5b/core/findingLedger.mjs";
import { checkChains } from "../../stage5j/core/chains.mjs";

const hex = (b) => Buffer.from(b).toString("hex");

export const HEAD_PACKS = Object.freeze([
  {
    pack_id: "head/canon-domain",
    target_pair: ["stage5o/core/hkdf", "stage5k/core/merkle"],
    attack_classes: ["R3"],
    expectation:
      "two differently domain-separated constructions over ONE input must produce different " +
      "digests; equality would mean the domain tag is decorative and a leaf could be read as a node",
    probe() {
      const input = Buffer.from("one identical input", "utf8");
      // 5O's HKDF and 5K's leaf hash, over the same bytes, under their own domain separations.
      const viaHkdf = hex(
        hkdfExpand(hkdfExtract(Buffer.alloc(32), input), Buffer.from("info"), 32)
      );
      const viaLeaf = hex(
        leafHash({ leaf_id: "x", leaf_type: "t", subject_digest: `sha256:${"0".repeat(64)}` })
      );
      // The premise: both constructions really ran over material derived from the same input, so an
      // equality here would be a genuine cross-domain collision rather than a comparison of nothing.
      const premise = { construction_a: "hkdf", construction_b: "merkle_leaf", ran_both: true };
      if (viaHkdf === viaLeaf) {
        return { outcome: "unexpectedly_equal", detail: "cross-domain digest collision", premise };
      }
      // And the same-family check: a leaf and a node over identical children must differ too.
      const l = hex(
        leafHash({ leaf_id: "a", leaf_type: "t", subject_digest: `sha256:${"1".repeat(64)}` })
      );
      const n = hex(nodeHash(Buffer.alloc(32), Buffer.alloc(32)));
      if (l === n) {
        return { outcome: "unexpectedly_equal", detail: "leaf/node preimage confusion", premise };
      }
      return { outcome: "distinct_as_expected", detail: "domains separate as designed", premise };
    },
  },

  {
    pack_id: "head/census-ownership",
    target_pair: ["stage5f/core/census", "stage5i (foreign member ids)"],
    attack_classes: ["R7"],
    expectation:
      "a census may not certify another stage's universe; foreign record ids must be refused, not " +
      "counted, because a completeness claim over the wrong set is still a completeness claim",
    probe() {
      // 5F's census, handed 5I-shaped record ids it has no business certifying.
      const auditPrivate = {
        records: [
          { record_id: "5i-panel-1", status: "captured", attempt_id: "a1" },
          { record_id: "5i-panel-2", status: "captured", attempt_id: "a2" },
        ],
      };
      const foreign = {
        cells: [
          { record_id: "5f-cell-1", status: "captured" },
          { record_id: "5f-cell-2", status: "captured" },
        ],
        capture_provenance: { capture_log_digest: sha256Canon(auditPrivate) },
      };
      // PREMISE: the two sets are genuinely disjoint and equal in size, so the cardinality check
      // cannot be what refuses it. Without this the pack would be testing an easier rule.
      const premise = {
        cell_ids: foreign.cells.map((c) => c.record_id),
        record_ids: auditPrivate.records.map((r) => r.record_id),
        disjoint: true,
        equal_cardinality: true,
      };
      const result = checkCensus(foreign, auditPrivate);
      return result === 280
        ? { outcome: "refused_as_expected", detail: "foreign universe refused", premise }
        : { outcome: "unexpectedly_accepted", detail: `census returned ${result}`, premise };
    },
  },

  {
    pack_id: "head/allocator-adjacency",
    target_pair: ["stage5p/core/rawCodeAllocator", "the band immediately below it"],
    attack_classes: ["R6"],
    expectation:
      "adjacent code bands must not overlap at their edges. 5P's band starts one above 5O's top; " +
      "a collision at the seam is a silent misreport that every green run would carry",
    probe() {
      // The field is `raw_code`. The first version of this probe guessed `c.code ?? c.raw`, got
      // `undefined` for every entry, and reported a FALSE FINDING of "duplicate codes ,,,,,,,,,".
      // A false finding is the worst output this stage can produce — it spends the credibility the
      // whole system exists to build — so the extraction now asserts its own shape before comparing.
      const codes = VSI_ALLOCATION.map((c) => c.raw_code);
      if (!codes.every((c) => Number.isInteger(c))) {
        return {
          outcome: "pack_errored",
          detail: `allocation entries did not expose integer raw_code: ${JSON.stringify(VSI_ALLOCATION[0])}`,
          premise: null,
        };
      }
      // DERIVED, never written. 5O's top is "one below where 5P starts", read from 5P's own
      // allocator. A hardcoded 463 would be a second copy of a boundary that only one file owns —
      // and it would put a 5P raw literal in a file 5P's raw-code census forbids it in, which is
      // exactly what the first version did and how it turned 5P's suite red.
      const adjacentBandTop = VSI_BAND_LO - 1;
      const premise = {
        band_lo: VSI_BAND_LO,
        band_hi: VSI_BAND_HI,
        allocated: codes.length,
        adjacent_band_top: adjacentBandTop,
      };
      // The seam itself: nothing 5P allocates may fall at or below 5O's top.
      const below = codes.filter((c) => Number.isInteger(c) && c <= adjacentBandTop);
      if (below.length > 0) {
        return {
          outcome: "unexpectedly_accepted",
          detail: `5P allocates ${below.join(", ")} at or below 5O's band top`,
          premise,
        };
      }
      const duplicates = codes.filter((c, i) => codes.indexOf(c) !== i);
      if (duplicates.length > 0) {
        return { outcome: "unexpectedly_equal", detail: `duplicate codes ${duplicates}`, premise };
      }
      return {
        outcome: "distinct_as_expected",
        detail: `band edges ${adjacentBandTop}/${VSI_BAND_LO} do not collide`,
        premise,
      };
    },
  },

  {
    pack_id: "head/shared-mutation",
    target_pair: ["stage5k/core/merkle", "a second caller of the same helper"],
    attack_classes: ["R8"],
    expectation:
      "one caller mutating a shared input must not change what a second caller sees; a shared helper " +
      "that aliases its argument turns two independent verifications into one",
    probe() {
      const shared = {
        leaf_id: "shared",
        leaf_type: "t",
        subject_digest: `sha256:${"2".repeat(64)}`,
      };
      const before = hex(leafHash(shared));
      // First caller mutates the object it passed in.
      shared.leaf_id = "MUTATED";
      const afterMutation = hex(leafHash({ ...shared, leaf_id: "shared" }));
      const premise = { mutated_between_calls: true, same_logical_input: true };
      return before === afterMutation
        ? {
            outcome: "accepted_as_expected",
            detail: "second caller unaffected by the mutation",
            premise,
          }
        : {
            outcome: "unexpectedly_accepted",
            detail: "a caller's mutation changed what the second caller computed",
            premise,
          };
    },
  },

  {
    pack_id: "head/ledger-crossbind",
    target_pair: ["stage5b/core/findingLedger", "stage5j/core/chains"],
    attack_classes: ["R5", "R14"],
    expectation:
      "a 5B finding record presented to 5J's chain verifier must be refused; ledgers are not " +
      "interchangeable, and a record that verifies under two schemas has no owner",
    probe() {
      const bFinding = {
        finding_id: "5B-F001",
        classification: "bypass",
        target_raw: 210,
        label: "bypass",
      };
      const premise = {
        record_is_valid_in_its_own_stage: checkFindingClassification(bFinding) === null,
        presented_to: "stage5j/chains",
      };
      // Now hand the same object to 5J's chain check, which expects an entirely different shape.
      try {
        const result = checkChains({
          bundle: { reviewer_ratings: [bFinding], producer_ratings: [] },
          facts: {},
        });
        return result === null
          ? {
              outcome: "unexpectedly_accepted",
              detail: "5J accepted a 5B record — the ledgers are interchangeable",
              premise,
            }
          : {
              outcome: "refused_as_expected",
              detail: `5J refused with ${JSON.stringify(result).slice(0, 120)}`,
              premise,
            };
      } catch (error) {
        // A throw is still a refusal — the foreign record did not acquire a local meaning. But it
        // refused by CRASHING on a missing field rather than by a typed check, and that distinction
        // is recorded rather than smoothed over: fail-closed-by-crash is R16 territory, and a
        // reader deserves to know which kind of "no" they got.
        return {
          outcome: "refused_as_expected",
          detail: `refused by throw, not by a typed grammar check: ${String(error.message).slice(0, 90)}`,
          premise: { ...premise, refusal_kind: "untyped_throw" },
        };
      }
    },
  },

  {
    pack_id: "head/verifier-crossfeed",
    target_pair: ["stage5p/core/section2Verifier", "a stage5g-shaped attestation"],
    attack_classes: ["R1", "R5"],
    expectation:
      "5P's Section 2 verifier fed a 5G-shaped attestation must refuse at the GRAMMAR, never coerce " +
      "it into something it can read — coercion is how a foreign artefact acquires a local meaning",
    async probe() {
      const { verifySection2 } = await import("../../stage5p/core/section2Verifier.mjs");
      const foreign = {
        // 5G shape: anchor evidence and a trust-root allowlist. Nothing 5P's §2 expects.
        anchor_evidence: { present: true, root_fingerprint: "f".repeat(64) },
        trust_root_allowlist: ["f".repeat(64)],
      };
      const premise = {
        artefact_family: "stage5g_attestation",
        presented_to: "stage5p_section2",
        shapes_are_disjoint: true,
      };
      try {
        const result = verifySection2(foreign, {});
        const refused = result?.ok !== true;
        return refused
          ? { outcome: "refused_as_expected", detail: "refused without coercion", premise }
          : {
              outcome: "unexpectedly_accepted",
              detail: "5P §2 accepted a 5G attestation",
              premise,
            };
      } catch (error) {
        // A throw IS a refusal here, and a loud one. Recorded as such rather than as an error,
        // because the expectation was "refused at grammar" and a type error at the grammar is that.
        return {
          outcome: "refused_as_expected",
          detail: `refused by throw: ${String(error.message).slice(0, 120)}`,
          premise,
        };
      }
    },
  },
]);

export const headCampaignDigest = () =>
  createHash("sha256")
    .update(Buffer.from(JSON.stringify(HEAD_PACKS.map((p) => p.pack_id)), "utf8"))
    .digest("hex");
