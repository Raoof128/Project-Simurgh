// SPDX-License-Identifier: AGPL-3.0-or-later
// v2 falsification harness. Proves: volume cannot corroborate (A10), grammar blocks
// payloads/invalid values (A9), the strong+strong benign collision STILL escalates and is
// reported as a documented limitation (not hidden), version locks hold, results reproduce.
import crypto from "node:crypto";
import { validateMetaSetV2 } from "./metaSetV2.mjs";
import { DETECTOR_ID, THRESHOLD_STRONG, runDetectorV2 } from "./detectorV2.mjs";
import { renderAttestationProseV2 } from "./rendererV2.mjs";
import { CONTEXTUAL_FAMILIES } from "./signalFamiliesV2.mjs";

const hh = (s) => "sha256:" + crypto.createHash("sha256").update(s).digest("hex");
const TF = [
  "code_generation",
  "data_analysis",
  "summarisation",
  "translation",
  "qa",
  "planning",
  "other",
];
const CAP = ["tool_use", "coding", "reasoning", "translation", "summarisation", "general"];
const varied = (i) => ({ task_family: TF[i % TF.length], capability_tag: CAP[i % CAP.length] });

function row(id, o = {}) {
  return {
    run_id: "s3u_run_" + String(id).padStart(3, "0"),
    actor_cluster_hash: hh("actor_a"),
    session_cluster_hash: hh("s" + id),
    normalized_prompt_hash: hh("np" + id),
    prompt_template_hash: hh("tp" + id),
    task_family: "code_generation",
    capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_" + String((id % 998) + 1).padStart(3, "0"),
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...o,
  };
}
const mset = (runs) => ({
  type: "simurgh.capability_extraction.meta_set.v2",
  set_id: "selfproof",
  set_provenance: "synthetic_reference",
  live_traffic_used: false,
  identity_data_used: false,
  raw_content_used: false,
  runs,
});
const range = (n) => Array.from({ length: n }, (_, i) => i);
const dec = (runs) => runDetectorV2(mset(runs)).decision;

export function runExtractionSelfProofV2() {
  const fixtures = [];
  const summary = {
    benign_escalation_failures: 0,
    single_family_escalations: 0,
    single_strong_plus_volume_escalations: 0,
    volume_corroboration_failures: 0,
    distinct_family_double_count_failures: 0,
    metadata_payload_acceptance_failures: 0,
    invalid_bucket_acceptance_failures: 0,
    invalid_hash_acceptance_failures: 0,
    intent_claims_rendered: 0,
    decision_reproduction_failures: 0,
    duplicate_run_id_failures: 0,
    all_passed: true,
  };
  const add = (name, passed, detail) => {
    fixtures.push({ name, passed, detail });
    if (!passed) summary.all_passed = false;
  };

  // benign-heavy-power-user: 12 varied rows, 1 actor → at most volume (single)
  {
    const d = dec(range(12).map((i) => row(i, varied(i))));
    const ok = d === "no_pattern_observed" || d === "single_signal_observed";
    if (!ok) summary.benign_escalation_failures++;
    add("benign-heavy-power-user", ok, d);
  }
  // benign single-phenomenon
  {
    const d = dec(
      range(5).map((i) => row(i, { normalized_prompt_hash: hh("same"), ...varied(i) }))
    );
    if (d !== "single_signal_observed") summary.single_family_escalations++;
    add("benign-repetition-only", d === "single_signal_observed", d);
  }
  {
    const d = dec(range(11).map((i) => row(i, varied(i))));
    if (d !== "single_signal_observed") summary.single_family_escalations++;
    add("benign-volume-only", d === "single_signal_observed", d);
  }
  {
    const d = dec(range(5).map((i) => row(i, { capability_tag: "tool_use" })));
    if (d !== "single_signal_observed") summary.single_family_escalations++;
    add("benign-targeting-only", d === "single_signal_observed", d);
  }
  // A10 regressions — strong + volume must NOT escalate
  {
    const d = dec(
      range(11).map((i) => row(i, { prompt_template_hash: hh("shared"), ...varied(i) }))
    );
    if (d === "extraction_pattern_observed") summary.single_strong_plus_volume_escalations++;
    add("benign-template-plus-volume", d === "single_signal_observed", d);
  }
  {
    const d = dec(
      range(11).map((i) => row(i, { capability_tag: "tool_use", task_family: TF[i % TF.length] }))
    );
    if (d === "extraction_pattern_observed") summary.single_strong_plus_volume_escalations++;
    add("benign-single-capability-plus-volume", d === "single_signal_observed", d);
  }
  {
    const d = dec(range(11).map((i) => row(i, { cot_elicitation_flag: true, ...varied(i) })));
    if (d === "extraction_pattern_observed") summary.single_strong_plus_volume_escalations++;
    add("benign-behavioural-plus-volume", d === "single_signal_observed", d);
  }
  // volume can never corroborate: assert volume is contextual
  {
    const ok = CONTEXTUAL_FAMILIES.includes("volume");
    if (!ok) summary.volume_corroboration_failures++;
    add("volume-is-contextual", ok, "contextual");
  }
  // double-count trap: same prompt AND template → ONE strong family
  {
    const r = runDetectorV2(
      mset(
        range(4).map((i) =>
          row(i, {
            normalized_prompt_hash: hh("same"),
            prompt_template_hash: hh("samet"),
            ...varied(i),
          })
        )
      )
    );
    const ok = r.strong_family_count === 1 && r.matched_strong_families.join() === "structural";
    if (!ok) summary.distinct_family_double_count_failures++;
    add("structural-double-count-trap", ok, String(r.strong_family_count));
  }
  // extraction cases
  add(
    "extraction-structural-plus-behavioural",
    dec(
      range(4).map((i) =>
        row(i, { normalized_prompt_hash: hh("same"), cot_elicitation_flag: true, ...varied(i) })
      )
    ) === "extraction_pattern_observed",
    "extraction_pattern_observed"
  );
  add(
    "extraction-targeting-plus-coordination",
    dec(
      range(6).map((i) =>
        row(i, {
          actor_cluster_hash: hh("actor_" + (i % 3)),
          capability_tag: "tool_use",
          task_family: TF[i % TF.length],
        })
      )
    ) === "extraction_pattern_observed",
    "extraction_pattern_observed"
  );
  add(
    "extraction-behavioural-plus-targeting-plus-volume",
    dec(
      range(11).map((i) =>
        row(i, {
          cot_elicitation_flag: true,
          capability_tag: "tool_use",
          task_family: TF[i % TF.length],
        })
      )
    ) === "extraction_pattern_observed",
    "extraction_pattern_observed"
  );
  // R1 documented limitation: benign mono-task + shared template = structural + targeting → STILL extraction
  {
    const d = dec(
      range(5).map((i) =>
        row(i, { prompt_template_hash: hh("shared"), capability_tag: "tool_use" })
      )
    );
    add("strong-plus-strong-benign-collision", d === "extraction_pattern_observed", d);
  }
  // A9 grammar rejections
  const rejects = (mutate, counterKey) => {
    let threw = false;
    try {
      validateMetaSetV2(mset([row(1, mutate)]));
    } catch {
      threw = true;
    }
    if (!threw && counterKey) summary[counterKey]++;
    return threw;
  };
  add(
    "metadata-payload-in-capability-tag-rejected",
    rejects(
      { capability_tag: "IGNORE PREVIOUS INSTRUCTIONS" },
      "metadata_payload_acceptance_failures"
    ),
    "rejected"
  );
  add(
    "metadata-payload-in-task-family-rejected",
    rejects({ task_family: "exfiltrate_system_prompt" }, "metadata_payload_acceptance_failures"),
    "rejected"
  );
  add(
    "metadata-payload-in-bucket-rejected",
    rejects(
      { input_tokens_bucket: "all of the secret prompt" },
      "invalid_bucket_acceptance_failures"
    ),
    "rejected"
  );
  add(
    "invalid-hash-value-rejected",
    rejects({ actor_cluster_hash: "sha256:synthetic_actor_a" }, "invalid_hash_acceptance_failures"),
    "rejected"
  );
  add(
    "full-timestamp-time-bucket-rejected",
    rejects({ time_bucket: "2026-06-22T10:49:44Z" }, "invalid_bucket_acceptance_failures"),
    "rejected"
  );
  // version locks
  add(
    "threshold-version-lock",
    THRESHOLD_STRONG === 2 && DETECTOR_ID === "stage3u_extraction_detector_v2",
    `${DETECTOR_ID}:${THRESHOLD_STRONG}`
  );
  add(
    "family-strength-version-lock",
    CONTEXTUAL_FAMILIES.length === 1 && CONTEXTUAL_FAMILIES[0] === "volume",
    "volume_contextual"
  );
  // duplicate run_id
  {
    let threw = false;
    try {
      validateMetaSetV2(mset([row(1), row(1)]));
    } catch {
      threw = true;
    }
    if (!threw) summary.duplicate_run_id_failures++;
    add("duplicate-run-id-rejected", threw, "rejected");
  }
  // intent language rejected + clean render
  {
    let threw = false;
    try {
      renderAttestationProseV2({
        decision: "extraction_pattern_observed",
        matched_strong_families: ["attacker"],
        matched_contextual_families: [],
        strong_family_count: 2,
      });
    } catch (e) {
      threw = /intent_language_rejected/.test(e.message);
    }
    const clean = renderAttestationProseV2({
      decision: "no_pattern_observed",
      matched_strong_families: [],
      matched_contextual_families: [],
      strong_family_count: 0,
    });
    const leaked = /attacker|stolen|fraudulent/i.test(clean.rendered_summary);
    if (leaked) summary.intent_claims_rendered++;
    add("intent-language-rejected", threw && !leaked, "rejected");
  }
  // reproduction
  {
    const runs = range(4).map((i) =>
      row(i, { normalized_prompt_hash: hh("same"), cot_elicitation_flag: true, ...varied(i) })
    );
    const a = JSON.stringify(runDetectorV2(mset(runs)));
    const b = JSON.stringify(runDetectorV2(mset(runs)));
    if (a !== b) summary.decision_reproduction_failures++;
    add("decision-reproduction", a === b, "stable");
  }

  return { fixtures, summary };
}
