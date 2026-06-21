// SPDX-License-Identifier: AGPL-3.0-or-later
// Falsification harness (NOT an FP/FN benchmark). Proves the decision machinery has
// brakes: benign-heavy and single-phenomenon sets do not escalate; double-counted
// structural signals stay one family; intent wording never renders; results reproduce.
import { validateMetaSet } from "./metaSet.mjs";
import { DETECTOR_ID, THRESHOLD, runDetector } from "./detector.mjs";
import { renderAttestationProse } from "./renderer.mjs";

function row(id, over = {}) {
  return {
    run_id: id,
    actor_cluster_hash: "sha256:actor_a",
    session_cluster_hash: "sha256:session_" + id,
    normalized_prompt_hash: "sha256:np_" + id,
    prompt_template_hash: "sha256:tp_" + id,
    task_family: "tf_" + id,
    capability_tag: "cap_" + id,
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "tb_" + id,
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...over,
  };
}
function mset(rows) {
  return {
    type: "simurgh.capability_extraction.meta_set.v1",
    set_id: "selfproof",
    set_provenance: "synthetic_reference",
    live_traffic_used: false,
    identity_data_used: false,
    raw_content_used: false,
    runs: rows,
  };
}
const range = (n) => Array.from({ length: n }, (_, i) => i);

export function runExtractionSelfProof() {
  const fixtures = [];
  const summary = {
    benign_escalation_failures: 0,
    single_family_escalations: 0,
    distinct_family_double_count_failures: 0,
    intent_claims_rendered: 0,
    decision_reproduction_failures: 0,
    duplicate_run_id_failures: 0,
    all_passed: true,
  };
  const add = (name, passed, detail) => {
    fixtures.push({ name, passed, detail });
    if (!passed) summary.all_passed = false;
  };

  // 1. benign-heavy-power-user: 12 varied rows, 1 actor → at most volume (single family)
  {
    const res = runDetector(mset(range(12).map((i) => row("h" + i))));
    const ok = res.decision === "no_pattern_observed" || res.decision === "single_signal_observed";
    if (!ok) summary.benign_escalation_failures++;
    add("benign-heavy-power-user", ok, res.decision);
  }
  // 2. benign-repetition-only: structural only (5 identical prompt hashes, varied else, <10)
  {
    const rows = range(5).map((i) => row("rep" + i, { normalized_prompt_hash: "sha256:same" }));
    const res = runDetector(mset(rows));
    const ok = res.decision === "single_signal_observed" && res.distinct_family_count === 1;
    if (!ok) summary.single_family_escalations++;
    add("benign-repetition-only", ok, res.decision);
  }
  // 3. benign-volume-only: 11 varied rows → high_request_count only
  {
    const res = runDetector(mset(range(11).map((i) => row("v" + i))));
    const ok = res.decision === "single_signal_observed" && res.matched_families.join() === "volume";
    if (!ok) summary.single_family_escalations++;
    add("benign-volume-only", ok, res.decision);
  }
  // 4. benign-targeting-only: 5 rows same capability, varied else, <10, spread buckets
  {
    const rows = range(5).map((i) => row("t" + i, { capability_tag: "tool_use" }));
    const res = runDetector(mset(rows));
    const ok = res.decision === "single_signal_observed" && res.matched_families.join() === "targeting";
    if (!ok) summary.single_family_escalations++;
    add("benign-targeting-only", ok, res.decision);
  }
  // 5. structural-double-count-trap: same prompt AND template repeated → 1 family
  {
    const rows = range(4).map((i) =>
      row("d" + i, { normalized_prompt_hash: "sha256:same", prompt_template_hash: "sha256:same_t" })
    );
    const res = runDetector(mset(rows));
    const ok = res.distinct_family_count === 1 && res.matched_families.join() === "structural";
    if (!ok) summary.distinct_family_double_count_failures++;
    add("structural-double-count-trap", ok, String(res.distinct_family_count));
  }
  // 6. extraction-structural-plus-behavioural
  {
    const rows = range(4).map((i) =>
      row("sb" + i, { normalized_prompt_hash: "sha256:same", cot_elicitation_flag: true })
    );
    const res = runDetector(mset(rows));
    add("extraction-structural-plus-behavioural", res.decision === "extraction_pattern_observed", res.decision);
  }
  // 7. extraction-targeting-plus-coordination: 6 rows, 3 actors, same capability
  {
    const rows = range(6).map((i) =>
      row("tc" + i, { actor_cluster_hash: "sha256:actor_" + (i % 3), capability_tag: "tool_use" })
    );
    const res = runDetector(mset(rows));
    const ok =
      res.decision === "extraction_pattern_observed" &&
      res.matched_families.includes("targeting") &&
      res.matched_families.includes("coordination");
    add("extraction-targeting-plus-coordination", ok, res.matched_families.join());
  }
  // 8. threshold-version-lock: threshold frozen at 2, id at v1
  {
    const ok = THRESHOLD === 2 && DETECTOR_ID === "stage3t_frozen_detector_v1";
    add("threshold-version-lock", ok, `${DETECTOR_ID}:${THRESHOLD}`);
  }
  // 9. intent-language-rejected: forbidden family name must throw; clean render must not leak
  {
    let threw = false;
    try {
      renderAttestationProse({
        decision: "extraction_pattern_observed",
        attestation_claim: "x",
        matched_families: ["attacker"],
        distinct_family_count: 2,
      });
    } catch (e) {
      threw = /intent_language_rejected/.test(e.message);
    }
    const clean = renderAttestationProse({
      decision: "no_pattern_observed",
      attestation_claim: "none",
      matched_families: [],
      distinct_family_count: 0,
    });
    const leaked = /attacker|stolen|fraudulent/i.test(clean.rendered_summary);
    if (leaked) summary.intent_claims_rendered++;
    add("intent-language-rejected", threw && !leaked, String(threw));
  }
  // 10. duplicate-run-id-rejected
  {
    let threw = false;
    try {
      validateMetaSet(mset([row("dup"), row("dup")]));
    } catch (e) {
      threw = /meta_set_invalid/.test(e.message);
    }
    if (!threw) summary.duplicate_run_id_failures++;
    add("duplicate-run-id-rejected", threw, String(threw));
  }
  // 11. decision reproduction: same set → identical result twice
  {
    const rows = range(4).map((i) =>
      row("rep2_" + i, { normalized_prompt_hash: "sha256:same", cot_elicitation_flag: true })
    );
    const a = JSON.stringify(runDetector(mset(rows)));
    const b = JSON.stringify(runDetector(mset(rows)));
    if (a !== b) summary.decision_reproduction_failures++;
    add("decision-reproduction", a === b, "stable");
  }

  return { fixtures, summary };
}
