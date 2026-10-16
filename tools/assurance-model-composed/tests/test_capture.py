import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from test_contract import task


class CaptureTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("runner"), "capture runner must exist"
        )
        self.assertIsNotNone(
            importlib.util.find_spec("audit"), "capture audit must exist"
        )
        import runner

        import audit

        self.r, self.a = runner, audit
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)

    def provider(self):
        class Fake:
            header = {"ready": True, "fixture": True}  # noqa: RUF012 -- immutable fixture use

            def generate(self, prompts, seed):
                return [
                    {
                        "status": "generated",
                        "raw": json.dumps(
                            {"name": "send_report", "parameters": task()["expected"]}
                        ),
                        "generated_token_ids": [1, 2],
                        "input_token_ids": [3],
                        "rendered_prompt": "test fixture",
                        "truncated": False,
                        "seconds": 0.1,
                    }
                    for _ in prompts
                ]

        return Fake()

    def capture(self):
        tasks = [task(), task("unknown_prior")]
        cap, files = self.r.execute(
            tasks,
            self.provider(),
            self.path / "run",
            trials=(0,),
            batch_size=2,
            metadata={"protocol_sha256": "a" * 64, "protocol_commit": "b" * 40},
        )
        return tasks, cap, files

    def test_all_branches_are_retained_and_replay(self):
        tasks, cap, files = self.capture()
        self.assertEqual(len(cap["generations"]), 2)
        self.assertEqual(len(cap["rows"]), 6)
        self.assertEqual(len(files), 60)
        self.a.check_capture(cap, tasks, files, trials=(0,), batch_size=2, replay=True)
        summary = self.a.summarize(cap, tasks)
        self.assertEqual(summary["controls"]["composed"]["active_completion"], 1)
        self.assertEqual(
            summary["controls"]["composed"]["new_unauthorized_effect_branches"], 0
        )
        self.assertEqual(
            summary["controls"]["credential_only"]["new_unauthorized_effect_branches"],
            1,
        )
        self.assertEqual(summary["controls"]["deny_all"]["active_completion"], 0)

    def test_missing_duplicate_forged_prompt_and_raw_state_rejected(self):
        tasks, cap, files = self.capture()
        for change in ("missing", "duplicate", "prompt", "raw", "extra"):
            c = copy.deepcopy(cap)
            f = dict(files)
            if change == "missing":
                c["rows"].pop()
            if change == "duplicate":
                c["generations"][1] = c["generations"][0]
            if change == "prompt":
                c["requests"][0]["prompts"][0][1]["content"] = "invented"
            if change == "raw":
                f[next(iter(f))] = b"invalid sqlite"
            if change == "extra":
                f["snapshots/extra.sqlite"] = b"extra"
            with (
                self.subTest(change=change),
                self.assertRaises((ValueError, KeyError, TypeError)),
            ):
                self.a.check_capture(
                    c, tasks, f, trials=(0,), batch_size=2, replay=False
                )

    def test_whole_batch_journal_precedes_actions_and_failures_persist(self):
        _tasks, cap, _files = self.capture()
        lines = [
            json.loads(x)
            for x in (self.path / "run/journal.jsonl").read_text().splitlines()
        ]
        kinds = [x["type"] for x in lines]
        self.assertLess(
            max(i for i, k in enumerate(kinds) if k == "generation"),
            min(i for i, k in enumerate(kinds) if k == "branch"),
        )
        self.a.check_journal(cap, (self.path / "run/journal.jsonl").read_bytes())
        with self.assertRaises(ValueError):
            self.a.check_journal(
                cap, (self.path / "run/journal.jsonl").read_bytes() + b"{}\n"
            )

        class Broken:
            header = {"ready": True}  # noqa: RUF012 -- immutable fixture use

            def generate(self, *args):
                raise OSError("local fixture failure")

        with self.assertRaises(OSError):
            self.r.execute(
                [task()],
                Broken(),
                self.path / "failed",
                trials=(0,),
                batch_size=2,
                metadata={},
            )
        self.assertTrue((self.path / "failed/failure.json").exists())
        self.assertTrue((self.path / "failed/journal.jsonl").exists())


if __name__ == "__main__":
    unittest.main()
