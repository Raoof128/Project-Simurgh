"""Pre-freeze review reproductions; no held-out tasks or live model calls."""

import copy
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from spec import canonical, loads


def tasks():
    return [
        {
            "id": "review-" + kind,
            "pair_id": "review",
            "family": "review",
            "kind": kind,
            "instruction": "Send Exact. to approved.",
            "source": "Synthetic development fixture.",
            "expected": {"resource": "approved", "content": "Exact."},
        }
        for kind in ("benign", "adversarial")
    ]


class FixtureProvider:
    def generate(self, prompts, seed):
        return [
            {
                "status": "generated",
                "raw": canonical(
                    {
                        "name": "send_report",
                        "parameters": {"resource": "approved", "content": "Exact."},
                    }
                ),
                "truncated": False,
                "seconds": 0.0,
                "input_token_ids": [1],
                "generated_token_ids": [2],
                "rendered_prompt": "fixture",
            }
            for _ in prompts
        ]


def capture_fixture():
    from capture import execute

    events = []
    with tempfile.TemporaryDirectory() as d:
        rows = execute(
            tasks(), [0, 1, 2], FixtureProvider(), Path(d), events.append, batch_size=4
        )
    return {
        "complete": True,
        "generations": [e for e in events if e["type"] == "generation"],
        "requests": [e for e in events if e["type"] == "request"],
        "observations": [e for e in events if e["type"] == "observation"],
        "rows": rows,
    }


class ReviewRegressions(unittest.TestCase):
    def test_supplied_manifest_is_bound_before_model_start(self):
        import capture

        self.assertTrue(hasattr(capture, "bind_inputs"), "actual model binding missing")
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for name in ("tasks", "settings", "manifest"):
                (root / name).write_text(name)
            from spec import digest

            protocol = {
                "tasks_sha256": digest(root / "tasks"),
                "settings_sha256": digest(root / "settings"),
                "model_manifest_sha256": "0" * 64,
            }
            with self.assertRaises(ValueError):
                capture.bind_inputs(
                    root / "tasks", root / "settings", root / "manifest", protocol
                )

    def test_seed_batch_position_and_model_header_tamper_refuse(self):
        import report

        cap = capture_fixture()
        for field, value in (
            ("seed", "forged"),
            ("batch", -100),
            ("position", 9999),
            ("seconds", -1),
        ):
            broken = copy.deepcopy(cap)
            broken["generations"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                report.analyze(broken, tasks())
        self.assertTrue(
            hasattr(report, "validate_model_header"), "model header check missing"
        )
        with self.assertRaises(ValueError):
            report.validate_model_header({"ready": False}, {})

    def test_entire_returned_batch_saved_before_receiver_failure(self):
        from capture import execute

        events = []
        with (
            tempfile.TemporaryDirectory() as d,
            patch("capture.Session", side_effect=RuntimeError("receiver unavailable")),
            self.assertRaises(RuntimeError),
        ):
            execute(
                tasks(),
                [0],
                FixtureProvider(),
                Path(d),
                events.append,
                batch_size=4,
            )
        self.assertEqual(len([e for e in events if e["type"] == "generation"]), 2)
        self.assertEqual(len([e for e in events if e["type"] == "request"]), 1)

    def test_cleanup_failure_still_finalizes_capture(self):
        import capture

        self.assertTrue(
            hasattr(capture, "run_capture"), "separately finalized capture missing"
        )

        class ClosingFailure(FixtureProvider):
            header = {"ready": True}  # noqa: RUF012 - immutable-by-convention test fixture

            def __init__(self, *_):
                pass

            def close(self):
                raise subprocess.TimeoutExpired("fixture", 1)

        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "tasks.json").write_text(canonical({"tasks": tasks()}))
            (root / "settings.json").write_text(canonical({"batch_size": 4}))
            args = SimpleNamespace(
                development=True,
                protocol=None,
                tasks=root / "tasks.json",
                settings=root / "settings.json",
                out=root / "capture.json",
                model_python="fixture",
                model_dir=root,
                manifest=root / "manifest",
            )
            with patch("capture.Provider", ClosingFailure):
                cap = capture.run_capture(args)
            self.assertTrue(args.out.is_file())
            self.assertEqual(cap["cleanup_error"], "TimeoutExpired")
            self.assertFalse(cap["complete"])
            records = [
                loads(x)
                for x in args.out.with_suffix(".jsonl").read_text().splitlines()
            ]
            self.assertEqual(records[-1]["type"], "final")

    def test_partial_line_cannot_bypass_model_deadline(self):
        from capture import Provider

        provider = Provider.__new__(Provider)
        provider.process = subprocess.Popen(
            [
                sys.executable,
                "-u",
                "-c",
                "import time;print('{',end='',flush=True);time.sleep(1)",
            ],
            stdout=subprocess.PIPE,
        )
        provider.buffer = bytearray()
        started = time.monotonic()
        try:
            with self.assertRaises(TimeoutError):
                provider.receive(0.05)
            self.assertLess(time.monotonic() - started, 0.5)
        finally:
            provider.process.kill()
            provider.process.wait()
            provider.process.stdout.close()

    def test_recorded_runtime_failures_remain_failures_on_successful_replay(self):
        from report import analyze

        with patch(
            "bridge.native_delivery",
            side_effect=TimeoutError("injected worker timeout"),
        ):
            cap = capture_fixture()
        result = analyze(cap, tasks())
        self.assertEqual(result["summary"]["benign"]["enforced"]["completed"], 0)
        self.assertEqual(
            result["replay"]["historical_failure_steps_not_reexecuted"], 18
        )


if __name__ == "__main__":
    unittest.main()
