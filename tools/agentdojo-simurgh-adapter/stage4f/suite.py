# SPDX-License-Identifier: AGPL-3.0-or-later
"""Deterministic Stage 4F suite manifests."""

import hashlib
import json
import re
from pathlib import Path

LOGICAL_FIXTURE_ROOT = "docs/research/llm-shield/evidence/stage-3f/fixtures"
CANARY_SELECTION = {
    "benign": 2,
    "context-poisoning": 2,
    "direct-input": 2,
    "hard-negative": 2,
    "output-leakage": 2,
    "tool-injection": 2,
}


def _sha256_file(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _canonical_hash(value: dict) -> str:
    data = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return "sha256:" + hashlib.sha256(data).hexdigest()


def _label_from_fixture(data: dict, path: Path) -> str:
    for key in ("label", "case_type", "ground_truth", "expected_boundary"):
        value = str(data.get(key, "")).lower()
        if "benign" in value:
            return "benign"
        if "hard" in value and "negative" in value:
            return "hard_negative"
        if "attack" in value or "injection" in value or "leak" in value:
            return "attack"
    name = path.parent.name
    if name == "benign":
        return "benign"
    if name == "hard-negative":
        return "hard_negative"
    if name in {
        "context-poisoning",
        "direct-input",
        "multi-turn",
        "output-leakage",
        "tool-injection",
    }:
        return "attack"
    return "hard_negative"


def _scenario_id(path: Path) -> str:
    raw = f"{path.parent.name}/{path.stem}"
    return re.sub(r"[^a-zA-Z0-9._/-]+", "-", raw.replace("_", "-")).lower()


def _all_fixture_paths(fixture_root: Path) -> list[Path]:
    return sorted(fixture_root.glob("*/*.json"), key=lambda p: (p.parent.name, p.name))


def _canary_paths(paths: list[Path]) -> list[Path]:
    selected: list[Path] = []
    by_family: dict[str, list[Path]] = {}
    for path in paths:
        by_family.setdefault(path.parent.name, []).append(path)
    for family, count in sorted(CANARY_SELECTION.items()):
        selected.extend(by_family.get(family, [])[:count])
    return sorted(selected, key=lambda p: (p.parent.name, p.name))


def build_suite_manifest(suite_id: str, fixture_root: Path) -> dict:
    root = fixture_root.resolve()
    paths = _all_fixture_paths(root)
    if suite_id == "suite_canary_v1":
        paths = _canary_paths(paths)
    elif suite_id != "suite_full_v1":
        raise ValueError(f"unsupported suite_id: {suite_id}")

    scenarios = []
    for path in paths:
        rel = path.resolve().relative_to(root).as_posix()
        fixture_data = json.loads(path.read_text())
        label = _label_from_fixture(fixture_data, path)
        scenarios.append(
            {
                "scenario_id": _scenario_id(path),
                "fixture_path": rel,
                "fixture_hash": _sha256_file(path),
                "label": label,
                "utility_class": "benign" if label == "benign" else "attack",
            }
        )

    scenario_ids = [row["scenario_id"] for row in scenarios]
    if len(scenario_ids) != len(set(scenario_ids)):
        raise ValueError("duplicate scenario_id in suite manifest")

    payload = {
        "manifest_version": "simurgh.stage4f.suite_manifest.v1",
        "suite_id": suite_id,
        "fixture_root": LOGICAL_FIXTURE_ROOT,
        "scenarios": sorted(scenarios, key=lambda row: row["scenario_id"]),
    }
    payload["suite_hash"] = _canonical_hash(payload)
    return payload


def verify_suite_manifest(manifest: dict, fixture_root: Path) -> dict:
    root = fixture_root.resolve()
    if manifest.get("fixture_root") != LOGICAL_FIXTURE_ROOT:
        return {"ok": False, "reason": "fixture_root_mismatch"}

    scenario_ids = [row.get("scenario_id") for row in manifest.get("scenarios", [])]
    if len(scenario_ids) != len(set(scenario_ids)):
        return {"ok": False, "reason": "duplicate_scenario_id"}

    for scenario in manifest.get("scenarios", []):
        candidate = (root / scenario["fixture_path"]).resolve()
        if root not in candidate.parents and candidate != root:
            return {
                "ok": False,
                "reason": "fixture_path_escape",
                "scenario_id": scenario.get("scenario_id"),
            }
        if not candidate.exists():
            return {
                "ok": False,
                "reason": "missing_fixture",
                "scenario_id": scenario.get("scenario_id"),
            }
        if _sha256_file(candidate) != scenario["fixture_hash"]:
            return {
                "ok": False,
                "reason": "fixture_hash_mismatch",
                "scenario_id": scenario.get("scenario_id"),
            }

    expected = dict(manifest)
    supplied_hash = expected.pop("suite_hash", None)
    if supplied_hash != _canonical_hash(expected):
        return {"ok": False, "reason": "suite_hash_mismatch"}
    return {"ok": True}
