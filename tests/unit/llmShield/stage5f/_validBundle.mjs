// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — canonical valid bundle + companion inputs for unit tests. Every core test starts from a
// deep clone of this and mutates ONE thing to trigger its specific raw code.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createPublicKey } from "node:crypto";
import {
  sha256Canon,
  sha256Bytes,
  panelPlanDigest,
} from "../../../../tools/simurgh-attestation/stage5f/core/digests.mjs";
import {
  signBundle,
  keyFingerprint,
} from "../../../../tools/simurgh-attestation/stage5f/core/signature.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const KEYS = join(ROOT, "tests/fixtures/llmShield/stage5f/test-keys");
const attestationPem = readFileSync(join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vmp.pem"), "utf8");
const ceremonyPem = readFileSync(
  join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vmp-ceremony.pem"),
  "utf8"
);
const attestationPubPem = createPublicKey(attestationPem).export({ type: "spki", format: "pem" });

export const clone = (v) => JSON.parse(JSON.stringify(v));

function recordDigest(rec) {
  const { record_digest, signature, ...rest } = rec;
  return sha256Canon(rest);
}

function build() {
  const PG2 = {
    member_id: "prompt_guard_2_86m",
    model_id: "meta-llama/Llama-Prompt-Guard-2-86M",
    hf_revision: "a8ded8e697ce7c355e395a0df51f94adb4a2fd27",
    detector_role: "prompt_injection_classifier",
    decision_semantics: "binary_malicious_softmax",
    label_map: { 0: "benign", 1: "malicious" },
    positive_class_index: 1,
    positive_label: "malicious",
    reference_threshold: "0.5000",
    adapter_digest: sha256Bytes("pg2-adapter"),
    tokenizer_manifest_digest: sha256Bytes("pg2-tok"),
    truncation_policy_digest: sha256Bytes("pg2-trunc"),
    capability_profile: {
      supported_languages: ["en"],
      max_input_tokens: 512,
      accepted_input_type: "text",
      required_runtime_features: [],
    },
  };
  const LG4 = {
    member_id: "llama_guard_4_12b",
    model_id: "meta-llama/Llama-Guard-4-12B",
    hf_revision: "lg4-1",
    detector_role: "content_safety_classifier",
    decision_semantics: "categorical_allow_block",
    reference_threshold: null,
    adapter_digest: sha256Bytes("lg4-adapter"),
    tokenizer_manifest_digest: sha256Bytes("lg4-tok"),
    truncation_policy_digest: sha256Bytes("lg4-trunc"),
    capability_profile: {
      supported_languages: ["en"],
      max_input_tokens: 8192,
      accepted_input_type: "text",
      required_runtime_features: [],
    },
  };
  const roster = [PG2, LG4];
  const candidates = ["prompt_guard_2_86m", "llama_guard_4_12b", "some_third_detector"];
  const cases = [
    { case_id: "c1", case_class: "general", source_input_digest: sha256Bytes("case-1-source") },
    { case_id: "c2", case_class: "general", source_input_digest: sha256Bytes("case-2-source") },
  ];
  const applicability_matrix = [];
  for (const m of roster)
    for (const c of cases)
      applicability_matrix.push({
        member_id: m.member_id,
        case_class: c.case_class,
        applicable: true,
      });

  const roster_digest = sha256Canon(roster);
  const corpus_digest = sha256Canon(cases);
  const applicability_digest = sha256Canon(applicability_matrix);
  const adapter_manifest_digest = sha256Canon(
    roster.map((m) => ({
      member_id: m.member_id,
      adapter_digest: m.adapter_digest,
      tokenizer_manifest_digest: m.tokenizer_manifest_digest,
      truncation_policy_digest: m.truncation_policy_digest,
    }))
  );
  const universe_digest = sha256Canon(candidates);
  const plan_digest = panelPlanDigest({
    schema: "simurgh.vmp.panel_attestation.v1",
    roster_digest,
    corpus_digest,
    applicability_digest,
    adapter_manifest_digest,
    universe_digest,
  });

  // one evaluated cell per (member × case), plus its terminal census record.
  const cells = [];
  const censusRecords = [];
  const labelByCase = {};
  const verdicts = {
    prompt_guard_2_86m: {
      c1: { score: "0.8123", label: "malicious" },
      c2: { score: "0.0600", label: "benign" },
    },
    llama_guard_4_12b: { c1: { label: "block" }, c2: { label: "allow" } },
  };
  for (const m of roster) {
    for (const c of cases) {
      const record_id = `rec-${m.member_id}-${c.case_id}`;
      const detector_input_digest = sha256Bytes(`din-${m.member_id}-${c.case_id}`);
      let decision_evidence;
      let label;
      if (m.decision_semantics === "binary_malicious_softmax") {
        const v = verdicts[m.member_id][c.case_id];
        label = v.label;
        decision_evidence = {
          kind: "binary_softmax",
          positive_score: v.score,
          threshold: "0.5000",
          label,
        };
      } else {
        const v = verdicts[m.member_id][c.case_id];
        label = v.label;
        decision_evidence = {
          kind: "categorical_generation",
          normalised_label: label,
          raw_output_digest: sha256Bytes(`out-${m.member_id}-${c.case_id}`),
          parser_digest: sha256Bytes("lg4-parser"),
        };
      }
      cells.push({
        case_id: c.case_id,
        member_id: m.member_id,
        status: "evaluated",
        record_id,
        shared_input_digest: c.source_input_digest,
        detector_input_digest,
        adapter_digest: m.adapter_digest,
        tokenizer_manifest_digest: m.tokenizer_manifest_digest,
        truncation_policy_digest: m.truncation_policy_digest,
        decision_evidence,
      });
      censusRecords.push({
        record_id,
        case_id: c.case_id,
        member_id: m.member_id,
        status: "evaluated",
        attempt_id: `att-${record_id}`,
        detector_input_digest,
      });
      (labelByCase[c.case_id] ||= {})[m.member_id] = { semantics: m.decision_semantics, label };
    }
  }

  const heterogeneous_label_vector = cases.map((c) => ({
    case_id: c.case_id,
    labels: labelByCase[c.case_id],
  }));
  const auditPrivate = { schema: "simurgh.vmp.capture_census.v1", records: censusRecords };
  const capture_log_digest = sha256Canon(auditPrivate);

  // chain: precommit@0 -> closeout@1. result head (no separate result records) = precommit digest.
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
  const result_chain_head_digest = precommit.record_digest;
  const laneb_receipt_digest = sha256Bytes("laneb-receipt-placeholder");
  const closeout = {
    record_type: "panel_closeout",
    chain_position: 1,
    previous_record_digest: result_chain_head_digest,
    blind_recompute_receipt_digest: laneb_receipt_digest,
  };
  closeout.record_digest = recordDigest(closeout);

  const content = {
    schema: "simurgh.vmp.panel_attestation.v1",
    attestation_pub_key_pem: attestationPubPem,
    provenance_mode: "none",
    roster_precommit: precommit,
    roster,
    detector_universe: { universe_digest, candidates },
    applicability_matrix,
    corpus: { corpus_digest, cases },
    cells,
    completeness: {
      representation_complete: true,
      evaluation_complete: true,
      cell_status_histogram: {
        evaluated: 4,
        not_applicable: 0,
        unsupported_input: 0,
        capture_failed: 0,
        missing_capture: 0,
      },
    },
    coverage: {
      universe_size: 3,
      panel_size: 2,
      omission_lower_bound: 1,
      heterogeneous_label_vector,
    },
    bootstrap_provenance: [],
    closeout,
    capture_provenance: { capture_log_digest },
    non_claims: ["panel completeness is not detection completeness"],
  };
  const signature = signBundle(content, attestationPem);
  const bundle = { ...content, signature };

  // replay results the pure adapter/applicability checks consume (keyed by member_id|case_id).
  const replayResults = {};
  for (const cell of cells) {
    replayResults[`${cell.member_id}|${cell.case_id}`] = {
      detector_input_digest: cell.detector_input_digest,
      token_count: 10,
    };
  }
  return {
    bundle,
    auditPrivate,
    replayResults,
    runnerResults: {},
    pinnedFingerprint: keyFingerprint(attestationPubPem),
    attestationPem,
    ceremonyPem,
  };
}

export const fixture = build();
export const validBundle = () => clone(fixture.bundle);
