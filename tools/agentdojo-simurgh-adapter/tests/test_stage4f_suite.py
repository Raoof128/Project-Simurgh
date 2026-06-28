# SPDX-License-Identifier: AGPL-3.0-or-later
import json
from pathlib import Path

from stage4f.suite import build_suite_manifest, verify_suite_manifest


def test_canary_suite_is_stable_and_content_hashed():
    root = Path("../../docs/research/llm-shield/evidence/stage-3f/fixtures").resolve()
    first = build_suite_manifest("suite_canary_v1", root)
    second = build_suite_manifest("suite_canary_v1", root)
    assert first == second
    assert first["suite_id"] == "suite_canary_v1"
    assert first["fixture_root"] == "docs/research/llm-shield/evidence/stage-3f/fixtures"
    assert first["manifest_version"] == "simurgh.stage4f.suite_manifest.v1"
    assert len(first["scenarios"]) == 12
    assert first["suite_hash"] == second["suite_hash"]
    assert first["suite_hash"].startswith("sha256:")
    assert all(item["fixture_hash"].startswith("sha256:") for item in first["scenarios"])
    scenario_ids = [item["scenario_id"] for item in first["scenarios"]]
    assert len(scenario_ids) == len(set(scenario_ids))
    assert all("/" in item["scenario_id"] for item in first["scenarios"])


def test_full_suite_resolves_all_stage3f_fixtures():
    root = Path("../../docs/research/llm-shield/evidence/stage-3f/fixtures").resolve()
    manifest = build_suite_manifest("suite_full_v1", root)
    assert manifest["suite_id"] == "suite_full_v1"
    assert len(manifest["scenarios"]) == 240
    assert manifest["scenarios"] == sorted(manifest["scenarios"], key=lambda row: row["scenario_id"])
    scenario_ids = [item["scenario_id"] for item in manifest["scenarios"]]
    assert len(scenario_ids) == len(set(scenario_ids))


def test_manifest_rejects_path_escape(tmp_path):
    root = tmp_path / "fixtures"
    root.mkdir()
    outside = tmp_path / "outside.json"
    outside.write_text(json.dumps({"case_id": "escape"}) + "\n")
    manifest = {
        "manifest_version": "simurgh.stage4f.suite_manifest.v1",
        "suite_id": "suite_canary_v1",
        "fixture_root": "docs/research/llm-shield/evidence/stage-3f/fixtures",
        "scenarios": [
            {
                "scenario_id": "escape",
                "fixture_path": "../outside.json",
                "fixture_hash": "sha256:bad",
                "label": "attack",
                "utility_class": "attack",
            }
        ],
        "suite_hash": "sha256:bad",
    }
    result = verify_suite_manifest(manifest, root)
    assert result["ok"] is False
    assert result["reason"] == "fixture_path_escape"
