// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared green-corpus builder for Stage 4X unit tests (not a test file).
import {
  v1RulesetDigest,
  computeSourceWitness,
} from "../../../../tools/simurgh-attestation/stage4x/core/corpusCore.mjs";
import {
  applyMR,
  metamorphicTableDigest,
} from "../../../../tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs";
import { v2Digest } from "../../../../tools/simurgh-attestation/stage4x/core/gateV2.mjs";

const SEEDS = [
  ["i1", "enumerated", "digit_to_word_quantifier", "23% of the base was affected"],
  ["i2", "enumerated", "percent_to_fraction_phrase", "80% of sessions failed"],
  ["i3", "enumerated", "date_to_relative", "on 3 August the outage began"],
  ["i4", "enumerated", "exact_to_hedged", "all 4200 accounts were notified"],
  ["i5", "incident_sourced", "true_semantic_paraphrase", "ninety percent of accounts were exposed"],
  ["i6", "enumerated", "count_to_bulk_phrase", "137 incidents were logged"],
];

export function greenCorpus() {
  const items = SEEDS.map(([item_id, provenance, mr, seed]) => ({
    item_id,
    provenance,
    family: mr,
    claim_bearing: true,
    seed_form: seed,
    metamorphic_relation: mr,
    residue_form: applyMR(mr, seed),
    ...(provenance === "incident_sourced" ? { incident_ref: "reported" } : {}),
  }));
  return {
    schema: "simurgh.vlr.corpus.v1",
    ruleset_binding: {
      v1_ruleset_id: "vsn.leakage.v1",
      v1_ruleset_digest: v1RulesetDigest(),
      v2_ruleset_id: "vsn.leakage.v2",
      v2_ruleset_digest: v2Digest(),
    },
    metamorphic_table_id: "vlr.metamorphic.v1",
    metamorphic_table_digest: metamorphicTableDigest(),
    source_witness: computeSourceWitness(),
    items,
    declared_item_count: items.length,
    rubric_id: "vlr.claim_rubric.v1",
    coverage_witness: {
      digit: ["i1"],
      number_word: ["i5"],
      percent: ["i2"],
      month: ["i3"],
      quantifier: ["i4"],
    },
  };
}

export const clone = (o) => JSON.parse(JSON.stringify(o));
