import json
from pathlib import Path

from stage4g.library import build_library_manifest, verify_library_manifest


def test_library_manifest_is_stable_and_class_covered():
    root = Path("stage4e/fixtures")
    first = build_library_manifest(root)
    second = build_library_manifest(root)
    assert first == second
    assert first["manifest_version"] == "simurgh.stage4g.library.v1"
    assert first["library_hash"].startswith("sha256:")
    classes = {item["target_class"] for item in first["attempt_templates"]}
    assert classes == {"I", "II", "III", "IV"}


def test_library_manifest_requires_fixtures(tmp_path):
    empty = tmp_path / "fixtures"
    empty.mkdir()
    try:
        build_library_manifest(empty)
    except FileNotFoundError as exc:
        assert "Stage 4G requires at least one committed fixture" in str(exc)
    else:
        raise AssertionError("missing fixtures should fail closed")


def test_library_manifest_rejects_path_escape(tmp_path):
    root = tmp_path / "fixtures"
    root.mkdir()
    outside = tmp_path / "outside.json"
    outside.write_text(json.dumps({"attempt": "escape"}) + "\n")
    manifest = {
        "manifest_version": "simurgh.stage4g.library.v1",
        "fixture_root": "stage4e/fixtures",
        "attempt_templates": [
            {
                "template_id": "escape",
                "target_class": "I",
                "fixture_path": "../outside.json",
                "fixture_hash": "sha256:" + "0" * 64,
            }
        ],
        "library_hash": "sha256:" + "1" * 64,
    }
    result = verify_library_manifest(manifest, root)
    assert result["ok"] is False
    assert result["reason"] == "fixture_path_escape"
