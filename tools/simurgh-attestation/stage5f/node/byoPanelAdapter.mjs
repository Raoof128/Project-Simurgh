// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — BYO-Panel adapter contract (plan Task 19, invention ②). Any team points VMP at their
// OWN detectors offline: they supply a byo_panel descriptor + captured fragments and get a valid
// panel_attestation.v1 that passes evaluatePanel — with NO 5E/3V-B bootstrap requirement
// (provenance_mode "none"), the FROZEN decision-semantics registry only, and their OWN external pins.
// Non-claim: a BYO run is the caller's evidence, not ours; we verify the contract, we do not endorse
// the panel.
import { createPublicKey } from "node:crypto";
import { sha256Canon } from "../core/digests.mjs";
import { panelPlanDigest } from "../core/digests.mjs";
import { signBundle, keyFingerprint } from "../core/signature.mjs";
import { buildReceipt, receiptDigest } from "../laneb/ceremony.mjs";
import { DECISION_SEMANTICS } from "../constants.mjs";

const recordDigest = (rec) => {
  const { record_digest, signature, ...rest } = rec;
  return sha256Canon(rest);
};

// descriptor: { roster, candidates, cases, applicability_matrix, cells, censusRecords, completeness,
//   coverage, non_claims, attestationPem, ceremonyPem }
export function buildByoPanel(d) {
  for (const m of d.roster) {
    if (!DECISION_SEMANTICS.includes(m.decision_semantics)) {
      throw new Error(
        `BYO panel: unsupported decision_semantics ${m.decision_semantics} (frozen registry only; a new detector type needs a new schema version)`
      );
    }
    if (!d.candidates.includes(m.member_id))
      throw new Error(`BYO panel: roster member ${m.member_id} not in the committed universe`);
  }
  const attestationPubPem = createPublicKey(d.attestationPem).export({
    type: "spki",
    format: "pem",
  });
  const ceremonyPubPem = createPublicKey(d.ceremonyPem).export({ type: "spki", format: "pem" });

  const roster_digest = sha256Canon(d.roster);
  const corpus_digest = sha256Canon(d.cases);
  const applicability_digest = sha256Canon(d.applicability_matrix);
  const adapter_manifest_digest = sha256Canon(
    d.roster.map((m) => ({
      member_id: m.member_id,
      adapter_digest: m.adapter_digest,
      tokenizer_manifest_digest: m.tokenizer_manifest_digest,
      truncation_policy_digest: m.truncation_policy_digest,
    }))
  );
  const universe_digest = sha256Canon(d.candidates);
  const plan_digest = panelPlanDigest({
    schema: "simurgh.vmp.panel_attestation.v1",
    roster_digest,
    corpus_digest,
    applicability_digest,
    adapter_manifest_digest,
    universe_digest,
  });

  const auditPrivate = { schema: "simurgh.vmp.capture_census.v1", records: d.censusRecords };
  const capture_log_digest = sha256Canon(auditPrivate);

  const precommit = {
    record_type: "panel_precommit",
    chain_position: 0,
    previous_record_digest: null,
    panel_plan_digest: plan_digest,
    roster_digest,
    corpus_digest,
    applicability_digest,
    adapter_manifest_digest,
    universe_digest,
  };
  precommit.record_digest = recordDigest(precommit);

  const receipt = buildReceipt(
    {
      panel_plan_digest: plan_digest,
      cell_matrix_digest: sha256Canon(d.cells),
      completeness_digest: sha256Canon({ completeness: d.completeness, coverage: d.coverage }),
      capture_log_digest,
      result_chain_head_digest: precommit.record_digest,
    },
    ceremonyPubPem,
    d.ceremonyPem
  );
  const closeout = {
    record_type: "panel_closeout",
    chain_position: 1,
    previous_record_digest: precommit.record_digest,
    blind_recompute_receipt_digest: receiptDigest(receipt),
  };
  closeout.record_digest = recordDigest(closeout);

  const content = {
    schema: "simurgh.vmp.panel_attestation.v1",
    attestation_pub_key_pem: attestationPubPem,
    provenance_mode: "none",
    roster_precommit: precommit,
    roster: d.roster,
    detector_universe: { universe_digest, candidates: d.candidates },
    applicability_matrix: d.applicability_matrix,
    corpus: { corpus_digest, cases: d.cases },
    cells: d.cells,
    completeness: d.completeness,
    coverage: d.coverage,
    bootstrap_provenance: [],
    closeout,
    capture_provenance: { capture_log_digest },
    non_claims: d.non_claims ?? ["a BYO run is the caller's evidence, not ours"],
  };
  const bundle = { ...content, signature: signBundle(content, d.attestationPem) };
  const replayResults = {};
  for (const c of d.cells)
    if (c.detector_input_digest)
      replayResults[`${c.member_id}|${c.case_id}`] = {
        detector_input_digest: c.detector_input_digest,
        token_count: 10,
      };

  return {
    bundle,
    auditPrivate,
    replayResults,
    receipt,
    pinnedFingerprint: keyFingerprint(attestationPubPem),
    ceremonyFingerprint: keyFingerprint(ceremonyPubPem),
  };
}
