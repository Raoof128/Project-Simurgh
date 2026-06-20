# SPDX-License-Identifier: AGPL-3.0-or-later
import json

import pytest

from simurgh_agentdojo_adapter.stage3k_manifest import build_stage3k_manifest


def test_manifest_records_source_provenance_and_claim_boundary():
    m = build_stage3k_manifest(
        stage3j_source_tag="v1.3.0-stage-3j-full-agentdojo-external-evaluation",
        stage3j_evidence_hashes={"metrics.json": "a" * 64},
        agentdojo_version_pin="agentdojo==0.1.30",
        operators=["instruction_softening", "data_camouflage"],
        action_open_categories=["choose_from_untrusted_list"],
        expected_counts={"mutation_variant_count": 20, "action_open_case_count": 5},
    )
    assert m["stage"] == "3K"
    assert m["scorer"] == "native_agentdojo_unchanged"
    assert m["adapter_safety_logic"] is False
    assert m["pipeline"] == "deterministic_ground_truth"
    assert m["claiming_lanes"] == ["3K-A", "3K-B"]
    assert m["stage3j_source_tag"].startswith("v1.3.0-stage-3j")
    assert m["stage3j_evidence_hashes"]["metrics.json"] == "a" * 64
    assert m["operators"] == ["data_camouflage", "instruction_softening"]  # sorted
    assert m["claim_boundary"].startswith("deterministic")
    text = json.dumps(m, sort_keys=True)
    assert "user_task_" not in text
    assert "injection_task_" not in text
    assert "raw_prompt" not in text
    assert "transcript" not in text


def test_manifest_rejects_non_sha256_evidence_hash():
    with pytest.raises(ValueError):
        build_stage3k_manifest(
            stage3j_source_tag="v1.3.0-stage-3j-full-agentdojo-external-evaluation",
            stage3j_evidence_hashes={"metrics.json": "not-a-hash"},
            agentdojo_version_pin="agentdojo==0.1.30",
            operators=[],
            action_open_categories=[],
            expected_counts={},
        )
