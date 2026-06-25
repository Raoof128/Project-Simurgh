# SPDX-License-Identifier: AGPL-3.0-or-later
"""Tests for the model-free authority-decision emitter (corpus, record shape, privacy, summary)."""
import json
import pathlib

from simurgh_agentdojo_adapter.authority_evidence import (
    build_corpus,
    emit_decisions,
    summarise,
    sha256_target,
)


def _root():
    return pathlib.Path(__file__).resolve().parents[3]


def _prereg():
    p = _root() / "docs/research/llm-shield/evidence/stage-1-live/llama-3.3-70b-fp8/injection-taxonomy-prereg.json"
    return json.loads(p.read_text())


def _load_corpus():
    p = _root() / "docs/research/llm-shield/evidence/stage-4a-lite/corpus-actions.json"
    return json.loads(p.read_text())


def test_build_corpus_covers_full_prereg_taxonomy():
    corpus = build_corpus(_prereg())
    inj_tasks = {c["case_id"].split("::")[0] for c in corpus if c["kind"] == "injection"}
    assert inj_tasks == {f"injection_task_{i}" for i in range(14)}
    # egress_plus_delete tasks contribute BOTH a send and a delete row
    epd = [c for c in corpus if c["case_id"].startswith("injection_task_5::")]
    assert {c["tool_name"] for c in epd} == {"send_email", "delete_email"}
    # benign grounded authority patterns present (allow), each gated
    benign = [c for c in corpus if c["kind"] == "benign"]
    assert {c["expected_verdict"] for c in benign} == {"allow"}
    assert len(benign) >= 3
    # attacker destination appears only in injection rows, never benign
    for c in benign:
        assert "mark.black-2134@gmail.com" not in json.dumps(c["args"])


def test_emit_produces_one_record_per_action_with_required_shape():
    decisions = emit_decisions(_load_corpus(), run_id="stage-4a-lite-test")
    assert len(decisions) >= 6
    for d in decisions:
        assert d["schema"] == "simurgh.authority_decision.v1"
        assert d["run_id"] == "stage-4a-lite-test"
        assert d["action"]["family"] in ("egress", "destructive_mutation")
        assert d["action"]["target_hash"].startswith("sha256:")
        assert d["decision"]["verdict"] in ("allow", "block")
        assert d["decision"]["would_execute"] is False
        assert d["capability_checked"]["policy_version"] == "stage4a-lite.authority-policy.v1"
        assert d["privacy"] == {
            "raw_prompt_recorded": False,
            "raw_tool_args_recorded": False,
            "raw_destination_recorded": False,
        }
        blob = json.dumps(d)
        assert "mark.black-2134@gmail.com" not in blob
        assert "bluesparrowtech.com" not in blob


def test_emit_matches_expected_verdict_for_every_corpus_case():
    corpus = _load_corpus()
    decisions = emit_decisions(corpus, run_id="x")
    by_case = {}
    for d in decisions:
        by_case.setdefault(d["case_id"], []).append(d["decision"]["verdict"])
    for case in corpus:
        verdicts = by_case[case["case_id"]]
        if case["expected_verdict"] == "block":
            assert "block" in verdicts, case["case_id"]
        else:
            assert all(v == "allow" for v in verdicts), case["case_id"]


def test_summary_counts_and_no_confirmation_emitted():
    s = summarise(emit_decisions(_load_corpus(), run_id="x"))
    assert s["requires_confirmation_count"] == 0
    assert s["total_decisions"] >= 6
    assert s["by_verdict"]["block"] >= 3
    assert s["by_verdict"]["allow"] >= 3
    assert set(s["by_family"]) <= {"egress", "destructive_mutation"}


def test_sha256_target_prefix():
    assert sha256_target("x@y.com").startswith("sha256:")
    assert sha256_target("x@y.com") == sha256_target("x@y.com")


def test_manifest_binds_frozen_1live_evidence_by_digest():
    from simurgh_agentdojo_adapter.authority_evidence import build_manifest

    root = _root()
    m = build_manifest(root)
    assert m["schema"] == "simurgh.stage4a.manifest.v1"
    assert m["frozen_1live_commit"] == "37f2de0"
    binds = {b["path"]: b["sha256"] for b in m["inherited_evidence"]}
    assert len(binds) == 5
    for path, digest in binds.items():
        assert digest.startswith("sha256:")
        assert (root / path).exists(), path
    assert "differential equivalence" in m["inheritance_statement"]
    assert "not through replay of the live model" in m["inheritance_statement"]
    assert m["non_claims"]["not_a_live_per_action_replay"] is True
