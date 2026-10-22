import importlib.util
import json
import subprocess
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "assurance-eval"))


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(importlib.util.find_spec("reproduce"))
        import reproduce

        self.r = reproduce
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.contract = self.directory / "contract.json"
        self.contract.write_text("{}")
        self.case = json.loads((reproduce.DOCS / "development-tasks.json").read_text())[
            "tasks"
        ][0]

    def invoke_one_then_fail(self, cap, tasks, **kwargs):
        import bridge

        with (
            tempfile.TemporaryDirectory() as d,
            bridge.Session(self.case, 0, "enforced", Path(d)) as session,
        ):
            result = session.step(
                {"status": "call", "arguments": self.case["expected"]}
            )
            self.assertEqual(result["status"], "observed")
        raise ValueError("deliberate_after_real_effect")

    def context(self):
        return patch.multiple(
            self.r,
            CONTRACT=self.contract,
            preflight=dict,
            frozen_inputs=lambda: (
                types.SimpleNamespace(analyze=self.invoke_one_then_fail),
                {},
                [],
                {"batch_size": 1},
                {},
                [{}],
            ),
        )

    def test_real_sdk_effect_and_snapshot_survive_incomplete_run(self):
        import bridge

        original = bridge.Session
        out = self.directory / "run"
        with (
            self.context(),
            self.assertRaisesRegex(ValueError, "deliberate_after_real_effect"),
        ):
            self.r.reproduce(out)
        self.assertIs(bridge.Session, original)
        failure = json.loads((out / "failure.json").read_text())
        self.assertFalse(failure["complete"])
        self.assertEqual(failure["observed_decisions"], 1)
        record = json.loads((out / "observations.jsonl").read_text())
        self.assertEqual(
            record["effects"][0]["content"], self.case["expected"]["content"]
        )
        self.assertTrue((out / record["witness"]).is_file())
        self.assertFalse((out / "receipt.json").exists())
        self.assertFalse((out / "evidence.zip").exists())

    def test_observer_process_loss_cannot_publish_success(self):
        real_run = subprocess.run

        def fail_observer(argv, *args, **kwargs):
            if str(HERE / "observer.py") in argv:
                raise subprocess.TimeoutExpired(argv, 15)
            return real_run(argv, *args, **kwargs)

        out = self.directory / "lost"
        with (
            self.context(),
            patch("subprocess.run", fail_observer),
            self.assertRaises(subprocess.TimeoutExpired),
        ):
            self.r.reproduce(out)
        failure = json.loads((out / "failure.json").read_text())
        self.assertEqual(failure["observed_decisions"], 0)
        self.assertFalse(failure["complete"])
        self.assertFalse((out / "receipt.json").exists())

    def test_existing_output_is_not_overwritten(self):
        out = self.directory / "existing"
        out.mkdir()
        sentinel = out / "preserve"
        sentinel.write_bytes(b"prior evidence")
        with self.context(), self.assertRaises(FileExistsError):
            self.r.reproduce(out)
        self.assertEqual(list(out.iterdir()), [sentinel])
        self.assertEqual(sentinel.read_bytes(), b"prior evidence")

    def test_contract_rejects_changed_or_missing_source(self):
        source = self.directory / "source.py"
        source.write_bytes(b"original")
        self.contract.write_bytes(
            self.r.wire(
                {
                    "schema": "simurgh-phase4-contract-v1",
                    "sources": {"source.py": self.r.sha(b"original")},
                }
            )
        )
        with patch.multiple(self.r, ROOT=self.directory, CONTRACT=self.contract):
            self.r.check_contract()
            source.write_bytes(b"changed")
            with self.assertRaisesRegex(ValueError, "source_binding"):
                self.r.check_contract()
            source.unlink()
            with self.assertRaisesRegex(ValueError, "source_binding"):
                self.r.check_contract()


if __name__ == "__main__":
    unittest.main()
