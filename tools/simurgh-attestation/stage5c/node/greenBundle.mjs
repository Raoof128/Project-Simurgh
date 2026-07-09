// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — green slip-ledger bundle builder (plan Task 8). Motto: AnthropicSafe First, then
// ReviewerSafe. Deterministic: same corpus + committed key → byte-identical bundle. Severities come
// from the blind-digest-only function (Lane B reproduces them). Shared by the CLI and fixtures.
import { createPublicKey, createPrivateKey } from "node:crypto";
import {
  VSB_SCHEMAS,
  VSB_NON_CLAIMS,
  VSB_KNOWN_LIMITATIONS,
  CAMPAIGN_LABEL,
} from "../constants.mjs";
import { buildGrid } from "../core/gridCore.mjs";
import { projectSlips } from "../core/slipLedger.mjs";
import { slipRates, floorMonotonicity } from "../core/slipRateCore.mjs";
import { MR_IDS_5C, composedRulesetDigest } from "../core/mrRuleset.mjs";
import { GATE_REDUCTIONS } from "../core/gateReductions.mjs";
import { blindSeverity, BLIND_SEVERITY_BASIS } from "../core/blindSeverity.mjs";
import { signBundle, severityBindingDigest } from "../core/vsbCore.mjs";

export function buildGreenContent(bases) {
  const { grid, baseCorpus } = buildGrid(bases, MR_IDS_5C);
  const digestOf = new Map(grid.map((c) => [`${c.mr_id}|${c.base_id}`, c.mutated_text_digest]));
  const slip_table = projectSlips(grid, baseCorpus).map((e) => {
    const d = digestOf.get(`${e.mr_id}|${e.base_id}`);
    return { ...e, severity: blindSeverity(d), severity_basis: BLIND_SEVERITY_BASIS };
  });
  return {
    schema: VSB_SCHEMAS.SLIP_LEDGER,
    mr_ruleset_id: "vsb.mr.v1",
    mr_ruleset_digest: composedRulesetDigest(),
    gate_reductions: GATE_REDUCTIONS,
    base_corpus: baseCorpus,
    grid,
    slip_table,
    slip_rates: slipRates(grid, baseCorpus),
    floor_monotonicity: floorMonotonicity(bases, MR_IDS_5C),
    binding: {
      campaign_label: CAMPAIGN_LABEL,
      severity_binding: severityBindingDigest(slip_table),
      lane_c_binding: null,
      predecessor_gate_digests: {},
    },
    non_claims: VSB_NON_CLAIMS,
    known_limitations: VSB_KNOWN_LIMITATIONS,
  };
}

export function buildGreenBundle(privKeyPem, bases) {
  const pubPem = createPublicKey(createPrivateKey(privKeyPem)).export({
    type: "spki",
    format: "pem",
  });
  const content = { ...buildGreenContent(bases), attestation_pub_key_pem: pubPem };
  return { ...content, signature: signBundle(content, privKeyPem) };
}

// Audit-private map (raw base texts) — Lane A bases are committed fixtures, so this is derivable.
export function auditPrivate(bases) {
  return Object.fromEntries(bases.map((b) => [b.base_id, b.base_text]));
}
