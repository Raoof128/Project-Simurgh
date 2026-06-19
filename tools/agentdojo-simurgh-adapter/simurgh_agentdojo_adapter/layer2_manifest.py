# SPDX-License-Identifier: AGPL-3.0-or-later
"""Layer-2 sample and run manifest helpers.

The sample manifest is a scientific control: it must be committed before
execution and reused identically for baseline and defended runs.
"""

from __future__ import annotations

import hashlib
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class ManifestError(ValueError):
    pass


def _require(data: dict[str, Any], key: str) -> Any:
    if key not in data:
        raise ManifestError(f"missing required key: {key}")
    return data[key]


def _require_unique_ids(data: dict[str, Any], key: str, expected: int) -> list[str]:
    ids = _require(data, key)
    if not isinstance(ids, list) or not all(isinstance(v, str) and v for v in ids):
        raise ManifestError(f"{key} must be a list of non-empty strings")
    if len(ids) != expected:
        raise ManifestError(f"{key} must contain exactly {expected} ids")
    if len(set(ids)) != len(ids):
        raise ManifestError(f"{key} contains duplicate ids")
    return ids


def validate_sample_manifest(data: dict[str, Any]) -> dict[str, Any]:
    if _require(data, "stage") != "3H-L2":
        raise ManifestError("stage must be 3H-L2")
    if _require(data, "suite") != "workspace":
        raise ManifestError("suite must be workspace")
    if not str(_require(data, "agentdojo_version_pin")).startswith("agentdojo=="):
        raise ManifestError("agentdojo_version_pin must pin a package version")
    if _require(data, "benchmark_version") != "v1.2.1":
        raise ManifestError("benchmark_version must be v1.2.1")
    if _require(data, "selection_locked_before_execution") is not True:
        raise ManifestError("selection_locked_before_execution must be true")
    _require(data, "attack_family")
    _require(data, "provider_mode")
    _require_unique_ids(data, "benign_task_ids", 10)
    _require_unique_ids(data, "security_case_ids", 20)
    overlap = set(data["benign_task_ids"]) & set(data["security_case_ids"])
    if overlap:
        raise ManifestError(f"benign/security ids overlap: {sorted(overlap)}")
    return data


def _suite_keys(suite: Any, attr: str) -> set[str]:
    value = getattr(suite, attr, None)
    if value is None and isinstance(suite, dict):
        value = suite.get(attr)
    if not isinstance(value, dict):
        raise ManifestError(f"AgentDojo suite missing {attr}")
    return set(value.keys())


def validate_agentdojo_sample_ids(data: dict[str, Any], suite: Any) -> bool:
    user_ids = _suite_keys(suite, "user_tasks")
    injection_ids = _suite_keys(suite, "injection_tasks")
    for task_id in data["benign_task_ids"]:
        if task_id not in user_ids:
            raise ManifestError(f"missing AgentDojo user task: {task_id}")
    for case_id in data["security_case_ids"]:
        try:
            user_task_id, injection_task_id = case_id.split("::", 1)
        except ValueError as exc:
            raise ManifestError(f"invalid security case id: {case_id}") from exc
        if user_task_id not in user_ids:
            raise ManifestError(f"missing AgentDojo user task: {user_task_id}")
        if injection_task_id not in injection_ids:
            raise ManifestError(f"missing AgentDojo injection task: {injection_task_id}")
    return True


def load_sample_manifest(path: str | Path) -> dict[str, Any]:
    with Path(path).open() as f:
        return validate_sample_manifest(json.load(f))


def sample_manifest_sha256(path: str | Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def build_run_manifest(
    *,
    sample_manifest_path: str | Path,
    sample_manifest: dict[str, Any],
    benchmark_pin: str,
    provider_mode: str,
    model_provider: str,
    scorer_modified: bool,
    agentdojo_pin_substitution_reason: str | None = None,
) -> dict[str, Any]:
    return {
        "stage": "3H-L2",
        "suite": sample_manifest["suite"],
        "agentdojo_version_pin": benchmark_pin,
        "benchmark_version": sample_manifest["benchmark_version"],
        "agentdojo_pin_substitution_reason": agentdojo_pin_substitution_reason,
        "sample_manifest_sha256": sample_manifest_sha256(sample_manifest_path),
        "sample_manifest_committed_before_execution": True,
        "sample_manifest_ids_exist_in_agentdojo": True,
        "attack_family": sample_manifest["attack_family"],
        "provider_mode": provider_mode,
        "model_provider": model_provider,
        "scorer_modified": scorer_modified,
        "simurgh_commit": _git_commit(),
        "python_version": sys.version.split()[0],
        "operating_system": platform.platform(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
