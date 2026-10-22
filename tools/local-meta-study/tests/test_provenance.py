import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import study


class ProvenanceTests(unittest.TestCase):
    def test_commit_artifact_settings_and_versions_are_bound(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = "docs/assurance/meta/evidence/model-manifest.json"
            source = root / manifest
            source.parent.mkdir(parents=True)
            source.write_text("{}")
            evidence = root / "docs/assurance/meta-study/evidence"
            evidence.mkdir(parents=True)
            protocol = {
                "inputs": {manifest: study.digest(source)},
                "generation_config": {"temperature": 0.7},
                "inference_packages": {"transformers": "test"},
            }
            (evidence / "protocol.json").write_text(json.dumps(protocol))
            protocol_hash = study.digest(evidence / "protocol.json")

            def git(*args):
                return (
                    subprocess.check_output(
                        ["git", *args], cwd=root, stderr=subprocess.DEVNULL
                    )
                    .decode()
                    .strip()
                )

            git("init")
            git("add", ".")
            git(
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.invalid",
                "commit",
                "-m",
                "freeze",
            )
            commit = git("rev-parse", "HEAD")
            capture = {
                "protocol_commit": commit,
                "model_artifacts_sha256": study.digest(source),
                "resolved_generation_config": protocol["generation_config"],
                "runtime": {"packages": protocol["inference_packages"]},
            }
            with (
                patch.object(study, "ROOT", root),
                patch.object(study, "EVIDENCE", evidence),
            ):
                study.validate_provenance(capture, protocol, protocol_hash)
                for mutation in (
                    "commit",
                    "artifact",
                    "settings",
                    "packages",
                    "protocol",
                ):
                    bad = copy.deepcopy(capture)
                    if mutation == "commit":
                        bad["protocol_commit"] = "not-a-commit"
                    elif mutation == "artifact":
                        bad["model_artifacts_sha256"] = "wrong"
                    elif mutation == "settings":
                        bad["resolved_generation_config"]["temperature"] = 42
                    elif mutation == "packages":
                        bad["runtime"]["packages"]["transformers"] = "other"
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        study.validate_provenance(
                            bad,
                            protocol,
                            "wrong" if mutation == "protocol" else protocol_hash,
                        )


if __name__ == "__main__":
    unittest.main()
