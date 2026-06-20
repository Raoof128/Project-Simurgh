# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3J full-inventory manifest.

Pure: callers pass suite objects (or dicts) exposing user_tasks/injection_tasks.
Records the locally discovered inventory; never forces the paper's case count.
"""

from __future__ import annotations

from typing import Any


def _task_map(suite: Any, attr: str) -> dict:
    value = getattr(suite, attr, None)
    if value is None and isinstance(suite, dict):
        value = suite.get(attr)
    if not isinstance(value, dict):
        raise ValueError(f"suite missing {attr}")
    return value


def suite_inventory(suite: Any) -> dict[str, int]:
    n_user = len(_task_map(suite, "user_tasks"))
    n_inj = len(_task_map(suite, "injection_tasks"))
    return {
        "user_task_count": n_user,
        "injection_task_count": n_inj,
        "security_cross_product": n_user * n_inj,
    }


def build_stage3j_manifest(
    inventory: dict[str, dict[str, int]],
    *,
    agentdojo_version_pin: str,
    benchmark_version: str,
    attack_family: str,
) -> dict[str, Any]:
    totals = {
        "user_task_count": sum(s["user_task_count"] for s in inventory.values()),
        "injection_task_count": sum(s["injection_task_count"] for s in inventory.values()),
        "security_cross_product": sum(s["security_cross_product"] for s in inventory.values()),
    }
    return {
        "stage": "3J",
        "agentdojo_version_pin": agentdojo_version_pin,
        "benchmark_version": benchmark_version,
        "attack_family": attack_family,
        "pipeline": "deterministic_ground_truth",
        "scorer": "native_agentdojo_unchanged",
        "adapter_safety_logic": False,
        "gateway": "simurgh_stage3i_context_calibrated",
        "suites": sorted(inventory),
        "per_suite_inventory": inventory,
        "discovered_totals": totals,
    }
