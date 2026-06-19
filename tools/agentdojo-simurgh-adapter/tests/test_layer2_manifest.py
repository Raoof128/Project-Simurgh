# SPDX-License-Identifier: AGPL-3.0-or-later
import json

import pytest

from simurgh_agentdojo_adapter.layer2_manifest import (
    ManifestError,
    load_sample_manifest,
    sample_manifest_sha256,
    validate_agentdojo_sample_ids,
    validate_sample_manifest,
)


def _manifest():
    return {
        "stage": "3H-L2",
        "suite": "workspace",
        "agentdojo_version_pin": "agentdojo==0.1.30",
        "benchmark_version": "v1.2.1",
        "attack_family": "important_instructions",
        "provider_mode": "local_or_configured_agentdojo_provider",
        "selection_locked_before_execution": True,
        "benign_task_ids": [
            "user_task_0",
            "user_task_1",
            "user_task_2",
            "user_task_3",
            "user_task_5",
            "user_task_6",
            "user_task_7",
            "user_task_8",
            "user_task_9",
            "user_task_10",
        ],
        "security_case_ids": [
            "user_task_0::injection_task_0",
            "user_task_0::injection_task_1",
            "user_task_1::injection_task_0",
            "user_task_1::injection_task_1",
            "user_task_2::injection_task_0",
            "user_task_2::injection_task_1",
            "user_task_3::injection_task_0",
            "user_task_3::injection_task_1",
            "user_task_5::injection_task_0",
            "user_task_5::injection_task_1",
            "user_task_6::injection_task_0",
            "user_task_6::injection_task_1",
            "user_task_7::injection_task_0",
            "user_task_7::injection_task_1",
            "user_task_8::injection_task_0",
            "user_task_8::injection_task_1",
            "user_task_9::injection_task_0",
            "user_task_9::injection_task_1",
            "user_task_10::injection_task_0",
            "user_task_10::injection_task_1",
        ],
    }


def test_valid_manifest_requires_exact_sample_sizes():
    validated = validate_sample_manifest(_manifest())
    assert validated["suite"] == "workspace"
    assert len(validated["benign_task_ids"]) == 10
    assert len(validated["security_case_ids"]) == 20


def test_manifest_rejects_runtime_random_sampling():
    data = _manifest()
    data["selection_locked_before_execution"] = False
    with pytest.raises(ManifestError, match="selection_locked_before_execution"):
        validate_sample_manifest(data)


def test_manifest_rejects_duplicate_ids():
    data = _manifest()
    data["benign_task_ids"][1] = data["benign_task_ids"][0]
    with pytest.raises(ManifestError, match="duplicate"):
        validate_sample_manifest(data)


def test_load_and_hash_manifest(tmp_path):
    path = tmp_path / "sample-manifest.json"
    path.write_text(json.dumps(_manifest(), sort_keys=True) + "\n")
    loaded = load_sample_manifest(path)
    assert loaded["agentdojo_version_pin"] == "agentdojo==0.1.30"
    assert len(sample_manifest_sha256(path)) == 64


def test_agentdojo_id_validator_reports_success_for_existing_ids():
    suite = {
        "user_tasks": {task_id: object() for task_id in _manifest()["benign_task_ids"]},
        "injection_tasks": {"injection_task_0": object(), "injection_task_1": object()},
    }
    assert validate_agentdojo_sample_ids(_manifest(), suite) is True


def test_agentdojo_id_validator_rejects_missing_ids():
    suite = {"user_tasks": {}, "injection_tasks": {}}
    with pytest.raises(ManifestError, match="missing AgentDojo user task"):
        validate_agentdojo_sample_ids(_manifest(), suite)
