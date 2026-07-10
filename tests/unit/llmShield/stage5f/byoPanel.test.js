// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — BYO-Panel adapter contract (plan Task 19, invention ②).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { buildByoPanel } from "../../../../tools/simurgh-attestation/stage5f/node/byoPanelAdapter.mjs";
import { evaluatePanel } from "../../../../tools/simurgh-attestation/stage5f/core/vmpCore.mjs";
import {
  sha256Bytes,
  sha256Canon,
} from "../../../../tools/simurgh-attestation/stage5f/core/digests.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const KEYS = join(ROOT, "tests/fixtures/llmShield/stage5f/test-keys");
const attestationPem = readFileSync(join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vmp.pem"), "utf8");
const ceremonyPem = readFileSync(
  join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vmp-ceremony.pem"),
  "utf8"
);

// A caller's single-detector BYO panel (their own PG2-shaped detector), one case.
function descriptor() {
  const member = {
    member_id: "my_detector",
    model_id: "acme/my-detector",
    hf_revision: "r1",
    detector_role: "prompt_injection_classifier",
    decision_semantics: "binary_malicious_softmax",
    label_map: { 0: "benign", 1: "malicious" },
    positive_class_index: 1,
    positive_label: "malicious",
    reference_threshold: "0.5000",
    adapter_digest: sha256Bytes("a"),
    tokenizer_manifest_digest: sha256Bytes("t"),
    truncation_policy_digest: sha256Bytes("tr"),
    capability_profile: {
      supported_languages: ["en"],
      max_input_tokens: 512,
      accepted_input_type: "text",
      required_runtime_features: [],
    },
  };
  const cases = [{ case_id: "k1", case_class: "general", source_input_digest: sha256Bytes("src") }];
  const din = sha256Bytes("din");
  const cell = {
    case_id: "k1",
    member_id: "my_detector",
    status: "evaluated",
    record_id: "r-my_detector-k1",
    shared_input_digest: cases[0].source_input_digest,
    detector_input_digest: din,
    adapter_digest: member.adapter_digest,
    tokenizer_manifest_digest: member.tokenizer_manifest_digest,
    truncation_policy_digest: member.truncation_policy_digest,
    decision_evidence: {
      kind: "binary_softmax",
      positive_score: "0.9000",
      threshold: "0.5000",
      positive_class_index: 1,
      label: "malicious",
    },
  };
  return {
    roster: [member],
    candidates: ["my_detector", "some_other_candidate"],
    cases,
    applicability_matrix: [{ member_id: "my_detector", case_class: "general", applicable: true }],
    cells: [cell],
    censusRecords: [
      {
        record_id: "r-my_detector-k1",
        case_id: "k1",
        member_id: "my_detector",
        status: "evaluated",
        attempt_id: "att-1",
        detector_input_digest: din,
      },
    ],
    completeness: {
      representation_complete: true,
      evaluation_complete: true,
      cell_status_histogram: {
        evaluated: 1,
        not_applicable: 0,
        unsupported_input: 0,
        capture_failed: 0,
        missing_capture: 0,
      },
    },
    coverage: {
      universe_size: 2,
      panel_size: 1,
      omission_lower_bound: 1,
      heterogeneous_label_vector: [
        {
          case_id: "k1",
          labels: { my_detector: { semantics: "binary_malicious_softmax", label: "malicious" } },
        },
      ],
    },
    attestationPem,
    ceremonyPem,
  };
}

test("a BYO panel with no bootstrap requirement verifies at raw 0 (audit)", () => {
  const { bundle, auditPrivate, replayResults, pinnedFingerprint } = buildByoPanel(descriptor());
  const r = evaluatePanel(bundle, {
    tier: "audit",
    pinnedFingerprint,
    replayResults,
    runnerResults: {},
    auditPrivate,
  });
  assert.equal(r.raw, 0);
  assert.equal(r.bootstrap_mode, "none");
});

test("BYO rejects a detector type outside the frozen registry", () => {
  const d = descriptor();
  d.roster[0].decision_semantics = "some_new_regressor";
  assert.throws(() => buildByoPanel(d), /frozen registry/);
});

test("BYO rejects a roster member outside the committed universe", () => {
  const d = descriptor();
  d.candidates = ["some_other_candidate"];
  assert.throws(() => buildByoPanel(d), /universe/);
});
