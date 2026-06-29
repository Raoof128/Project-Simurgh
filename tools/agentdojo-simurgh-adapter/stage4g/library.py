import hashlib
import json
from pathlib import Path


ATTACK_CLASSES = ("I", "II", "III", "IV")


def _sha256_file(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _sha256_json(value: object) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def build_library_manifest(fixture_root: Path) -> dict:
    fixture_root = fixture_root.resolve()
    fixtures = sorted(fixture_root.glob("*.json"))
    if not fixtures:
        raise FileNotFoundError(
            f"Stage 4G requires at least one committed fixture under {fixture_root}"
        )
    templates = []
    for index, klass in enumerate(ATTACK_CLASSES):
        fixture = fixtures[index % len(fixtures)]
        templates.append(
            {
                "template_id": f"class-{klass.lower()}-template",
                "target_class": klass,
                "fixture_path": fixture.name,
                "fixture_hash": _sha256_file(fixture),
            }
        )
    manifest = {
        "manifest_version": "simurgh.stage4g.library.v1",
        "fixture_root": "stage4e/fixtures",
        "attempt_templates": templates,
    }
    manifest["library_hash"] = _sha256_json(manifest)
    return manifest


def verify_library_manifest(manifest: dict, fixture_root: Path) -> dict:
    root = fixture_root.resolve()
    for template in manifest.get("attempt_templates", []):
        path = (root / template["fixture_path"]).resolve()
        if root not in path.parents and path != root:
            return {"ok": False, "reason": "fixture_path_escape"}
    return {"ok": True, "reason": None}
