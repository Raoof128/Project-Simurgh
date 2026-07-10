// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — assemble a REAL dual-detector panel attestation from Lane C capture fragments
// (Prompt Guard 2 86M on CPU + Llama Guard 3 1B on Apple-Silicon MPS/fp16, captured offline). Writes a
// verify-only real evidence set + copies the capture fragments/corpus for provenance (they record the
// per-member runtime). AnthropicSafe: inputs only, bounded categorical tokens; no generation preserved.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { buildByoPanel } from "../node/byoPanelAdapter.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const KEYS = join(ROOT, "tests/fixtures/llmShield/stage5f/test-keys");
const OUT = join(ROOT, "docs/research/llm-shield/evidence/stage-5f/real-capture");
const sha = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const MEMBERS = {
  prompt_guard_2_86m: {
    model_id: "meta-llama/Llama-Prompt-Guard-2-86M",
    hf_revision: "a8ded8e697ce7c355e395a0df51f94adb4a2fd27",
    detector_role: "prompt_injection_classifier",
    decision_semantics: "binary_malicious_softmax",
    label_map: { 0: "benign", 1: "malicious" },
    positive_class_index: 1,
    positive_label: "malicious",
    reference_threshold: "0.5000",
    capability_profile: {
      supported_languages: ["en"],
      max_input_tokens: 512,
      accepted_input_type: "text",
      required_runtime_features: [],
    },
  },
  llama_guard_3_1b: {
    model_id: "meta-llama/Llama-Guard-3-1B",
    hf_revision: "acf7aafa60f0410f8f42b1fa35e077d705892029",
    detector_role: "content_safety_classifier",
    decision_semantics: "categorical_allow_block",
    reference_threshold: null,
    capability_profile: {
      supported_languages: ["en"],
      max_input_tokens: 8192,
      accepted_input_type: "text",
      required_runtime_features: [],
    },
  },
};

export function buildRealEvidence(corpusPath, fragPaths) {
  const corpus = readJson(corpusPath);
  const frags = fragPaths.map(readJson);
  const memberIds = frags.map((f) => f.member_id);

  const roster = memberIds.map((id) => ({
    member_id: id,
    ...MEMBERS[id],
    adapter_digest: sha(`${id}:input-adapter:${MEMBERS[id].hf_revision}`),
    tokenizer_manifest_digest: sha(`${id}:tokenizer:${MEMBERS[id].hf_revision}`),
    truncation_policy_digest: sha(
      `${id}:truncation:max=${MEMBERS[id].capability_profile.max_input_tokens}`
    ),
  }));
  const rosterById = Object.fromEntries(roster.map((m) => [m.member_id, m]));
  const candidates = [...memberIds, "reserved_third_detector"];
  const cases = corpus.cases.map((c) => ({
    case_id: c.case_id,
    case_class: c.case_class,
    source_input_digest: sha(c.source_text),
  }));

  const cells = [];
  const censusRecords = [];
  const labelByCase = {};
  for (const frag of frags) {
    const m = rosterById[frag.member_id];
    for (const fc of frag.cells) {
      const record_id = `rec-${frag.member_id}-${fc.case_id}`;
      const cell = {
        case_id: fc.case_id,
        member_id: frag.member_id,
        record_id,
        shared_input_digest: cases.find((c) => c.case_id === fc.case_id).source_input_digest,
        detector_input_digest: fc.detector_input_digest,
        adapter_digest: m.adapter_digest,
        tokenizer_manifest_digest: m.tokenizer_manifest_digest,
        truncation_policy_digest: m.truncation_policy_digest,
      };
      const status = fc.status ?? "evaluated";
      if (status === "evaluated") {
        cell.status = "evaluated";
        cell.decision_evidence = fc.decision_evidence;
        const label = fc.decision_evidence.label ?? fc.decision_evidence.normalised_label;
        (labelByCase[fc.case_id] ||= {})[frag.member_id] = {
          semantics: m.decision_semantics,
          label,
        };
      } else {
        cell.status = "capture_failed";
        cell.error_reason = fc.error_reason ?? "unexpected_categorical_output";
      }
      cells.push(cell);
      censusRecords.push({
        record_id,
        case_id: fc.case_id,
        member_id: frag.member_id,
        status: cell.status,
        attempt_id: `att-${record_id}`,
        detector_input_digest: fc.detector_input_digest,
      });
    }
  }

  const histogram = {
    evaluated: 0,
    not_applicable: 0,
    unsupported_input: 0,
    capture_failed: 0,
    missing_capture: 0,
  };
  for (const c of cells) histogram[c.status] += 1;
  const evaluation_complete = histogram.capture_failed === 0 && histogram.missing_capture === 0;
  const completeness = {
    representation_complete: true,
    evaluation_complete,
    cell_status_histogram: histogram,
  };
  const coverage = {
    universe_size: candidates.length,
    panel_size: roster.length,
    omission_lower_bound: candidates.length - roster.length,
    heterogeneous_label_vector: cases.map((c) => ({
      case_id: c.case_id,
      labels: labelByCase[c.case_id] ?? {},
    })),
  };

  const attestationPem = readFileSync(join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vmp.pem"), "utf8");
  const ceremonyPem = readFileSync(
    join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vmp-ceremony.pem"),
    "utf8"
  );
  const { bundle, auditPrivate, replayResults, pinnedFingerprint, ceremonyFingerprint } =
    buildByoPanel({
      roster,
      candidates,
      cases,
      applicability_matrix: roster.flatMap((m) =>
        [...new Set(cases.map((c) => c.case_class))].map((cc) => ({
          member_id: m.member_id,
          case_class: cc,
          applicable: true,
        }))
      ),
      cells,
      censusRecords,
      completeness,
      coverage,
      non_claims: [
        "REAL offline dual-detector capture: PG2 86M (CPU) + Llama Guard 3 1B (Apple-Silicon MPS/fp16)",
        "heterogeneous detectors measure different things (prompt-injection vs content-safety); disagreement is observation, never a panel verdict",
        "offline weights ≠ a hosted endpoint; a thin corpus is a seed, not a saturation study",
      ],
      attestationPem,
      ceremonyPem,
    });

  mkdirSync(OUT, { recursive: true });
  const w = (n, v) => writeFileSync(join(OUT, n), canonicalJson(v) + "\n");
  w("vmp-attestation.json", bundle);
  w("capture-census.json", auditPrivate);
  w("vmp-replay-results.json", replayResults);
  w("pin.json", {
    attestation_fingerprint: pinnedFingerprint,
    ceremony_fingerprint: ceremonyFingerprint,
  });
  // capture provenance: the corpus + raw per-member fragments (record model_id/revision/runtime + verdicts).
  w("shared-corpus.json", corpus);
  frags.forEach((f) => w(`frag-${f.member_id}.json`, f));
  return { OUT, evaluation_complete, histogram };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [corpus, ...frags] = process.argv.slice(2);
  const r = buildRealEvidence(corpus, frags);
  console.log(
    `[real] wrote ${r.OUT} (evaluation_complete=${r.evaluation_complete}, ${JSON.stringify(r.histogram)})`
  );
}
