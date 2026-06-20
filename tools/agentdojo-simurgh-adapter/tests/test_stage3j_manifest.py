# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.stage3j_manifest import (
    build_stage3j_manifest,
    suite_inventory,
)


class _FakeSuite:
    def __init__(self, n_user, n_inj):
        self.user_tasks = {f"user_task_{i}": object() for i in range(n_user)}
        self.injection_tasks = {f"injection_task_{i}": object() for i in range(n_inj)}


def test_suite_inventory_counts_and_cross_product():
    inv = suite_inventory(_FakeSuite(40, 14))
    assert inv == {
        "user_task_count": 40,
        "injection_task_count": 14,
        "security_cross_product": 560,
    }


def test_build_manifest_records_discovered_totals_not_paper_number():
    inventory = {
        "workspace": suite_inventory(_FakeSuite(40, 14)),
        "travel": suite_inventory(_FakeSuite(20, 7)),
        "banking": suite_inventory(_FakeSuite(16, 9)),
        "slack": suite_inventory(_FakeSuite(21, 5)),
    }
    m = build_stage3j_manifest(
        inventory,
        agentdojo_version_pin="agentdojo==0.1.30",
        benchmark_version="v1.2.1",
        attack_family="important_instructions",
    )
    assert m["stage"] == "3J"
    assert m["scorer"] == "native_agentdojo_unchanged"
    assert m["adapter_safety_logic"] is False
    assert m["pipeline"] == "deterministic_ground_truth"
    assert sorted(m["suites"]) == ["banking", "slack", "travel", "workspace"]
    assert m["discovered_totals"]["user_task_count"] == 97
    assert m["discovered_totals"]["injection_task_count"] == 35
    assert m["discovered_totals"]["security_cross_product"] == 949
    # never the paper number, and never raw task text
    assert "629" not in str(m["discovered_totals"])
    assert "raw" not in str(m).lower()
