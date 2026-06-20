# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3J suite-by-suite breakdown (reuses global metrics + Stage 3I analysis)."""

from __future__ import annotations

from typing import Any

from .stage3i_metrics import build_benign_recovery_analysis
from .stage3j_metrics import compute_stage3j_metrics


def _suites_in_order(rows: list[dict[str, Any]]) -> list[str]:
    seen: list[str] = []
    for r in rows:
        s = r.get("suite", "unknown")
        if s not in seen:
            seen.append(s)
    return sorted(seen)


def build_suite_breakdown(
    baseline_rows: list[dict[str, Any]], defended_rows: list[dict[str, Any]]
) -> dict[str, Any]:
    suites = _suites_in_order(defended_rows)
    per_suite: dict[str, Any] = {}
    for suite in suites:
        b = [r for r in baseline_rows if r.get("suite") == suite]
        d = [r for r in defended_rows if r.get("suite") == suite]
        metrics = compute_stage3j_metrics(b, d)
        native = metrics["agentdojo_native_metrics"]["defended"]
        analysis = build_benign_recovery_analysis(d)
        per_suite[suite] = {
            "benign_utility": native["benign_utility"],
            "utility_under_attack": native["utility_under_attack"],
            "targeted_asr": native["targeted_asr"],
            "over_defence": analysis["over_defence"],
            "dominant_failure_class": analysis["dominant_failure_class"],
            "containment_hard_gates_clean": metrics["hard_gates_clean"],
        }
    return {"stage": "3J", "suites": suites, "per_suite": per_suite}
