# SPDX-License-Identifier: AGPL-3.0-or-later
import json

import pytest

from simurgh_agentdojo_adapter.layer2_runner import Layer2Blocked, run_layer2_from_rows


def _sample(path):
    data = {
        "stage": "3H-L2",
        "suite": "workspace",
        "agentdojo_version_pin": "agentdojo==0.1.30",
        "benchmark_version": "v1.2.1",
        "attack_family": "important_instructions",
        "provider_mode": "mock",
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
            f"{task_id}::injection_task_{inj}"
            for task_id in [
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
            ]
            for inj in range(2)
        ],
    }
    path.write_text(json.dumps(data) + "\n")


def test_runner_writes_all_layer2_artifacts(tmp_path):
    sample = tmp_path / "sample-manifest.json"
    out = tmp_path / "out"
    _sample(sample)
    baseline = [
        {"agentdojo_run_id": f"b{i}", "kind": "benign", "utility_success": True}
        for i in range(10)
    ]
    baseline += [
        {
            "agentdojo_run_id": f"s{i}",
            "kind": "security",
            "utility_success": True,
            "attack_success": True,
        }
        for i in range(20)
    ]
    defended = [
        {"agentdojo_run_id": f"b{i}", "kind": "benign", "utility_success": True}
        for i in range(10)
    ]
    defended += [
        {
            "agentdojo_run_id": f"s{i}",
            "kind": "security",
            "utility_success": True,
            "attack_success": False,
            "gateway_contacted": True,
            "receipt_id": f"gw{i}",
            "audit_verified": True,
            "gateway_verdict": "blocked",
            "boundary": "tool_gate",
            "tool_execution_bypassed_gate": False,
            "unsafe_output_exported": False,
            "context_authority_escalated": False,
            "generated_evidence_leakage": False,
        }
        for i in range(20)
    ]
    for row in defended[:10]:
        row.update(
            {
                "gateway_contacted": True,
                "receipt_id": f"gw-{row['agentdojo_run_id']}",
                "audit_verified": True,
                "gateway_verdict": "accepted",
                "tool_execution_bypassed_gate": False,
                "unsafe_output_exported": False,
                "context_authority_escalated": False,
                "generated_evidence_leakage": False,
            }
        )
    run_layer2_from_rows(
        sample_manifest_path=sample,
        out_dir=out,
        baseline_rows=baseline,
        defended_rows=defended,
    )
    assert (out / "metrics.json").exists()
    assert (out / "agentdojo-native-results.json").exists()
    assert (out / "simurgh-containment-results.json").exists()
    assert (out / "simurgh-run-index.json").exists()


def test_runner_blocks_when_agentdojo_required_but_missing(monkeypatch, tmp_path):
    import simurgh_agentdojo_adapter.layer2_runner as mod

    monkeypatch.setattr(
        mod, "require_agentdojo", lambda: (_ for _ in ()).throw(RuntimeError("missing"))
    )
    with pytest.raises(Layer2Blocked, match="AgentDojo"):
        mod.run_external_agentdojo(sample_manifest_path=tmp_path / "missing.json", out_dir=tmp_path)
