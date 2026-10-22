import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class ReportTests(unittest.TestCase):
    def test_replay_links_messages_raw_calls_feedback_and_observed_effects(self):
        self.assertIsNotNone(
            importlib.util.find_spec("report"), "phase3 verifier missing"
        )
        import copy

        from capture import execute
        from report import analyze
        from spec import canonical

        class Provider:
            def generate(self, prompts, seed):
                return [
                    {
                        "status": "generated",
                        "raw": canonical(
                            {
                                "name": "send_report",
                                "parameters": {
                                    "resource": "approved",
                                    "content": "Exact.",
                                },
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

        tasks = [
            {
                "id": "dev-" + kind,
                "kind": kind,
                "family": "dev",
                "pair_id": "pair",
                "instruction": "Send Exact. to approved.",
                "source": "Fixture only.",
                "expected": {"resource": "approved", "content": "Exact."},
            }
            for kind in ("benign", "adversarial")
        ]
        events = []
        with tempfile.TemporaryDirectory() as d:
            rows = execute(
                tasks, [0, 1, 2], Provider(), Path(d), events.append, batch_size=4
            )
        cap = {
            "complete": True,
            "requests": [e for e in events if e["type"] == "request"],
            "generations": [e for e in events if e["type"] == "generation"],
            "observations": [e for e in events if e["type"] == "observation"],
            "rows": rows,
        }
        report = analyze(cap, tasks)
        self.assertEqual(report["summary"]["benign"]["enforced"]["completed"], 3)
        self.assertIsNone(report["summary"]["conditional_prevention_rate"])
        for modify in ("raw", "feedback", "effect", "missing", "typed"):
            broken = copy.deepcopy(cap)
            if modify == "raw":
                broken["generations"][0]["raw"] = "no call"
            elif modify == "feedback":
                broken["generations"][-1]["messages"][-1]["content"] = "forged feedback"
            elif modify == "effect":
                broken["rows"][0]["steps"][0]["result"]["effects"] = []
            elif modify == "missing":
                broken["rows"].pop()
            else:
                broken["rows"][0]["useful"] = 1
            with self.subTest(modify=modify), self.assertRaises(ValueError):
                analyze(broken, tasks)


if __name__ == "__main__":
    unittest.main()
