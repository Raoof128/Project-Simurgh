import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19w as cap  # noqa: E402
import control19w as c  # noqa: E402
from test_control19w import log_bytes, sample  # noqa: E402

MODEL = "claude-haiku-5-5"
USAGE = {
    "anthropic/claude-haiku-5-5": {
        "input_tokens": 1000,
        "output_tokens": 2000,
        "input_tokens_cache_write": 0,
        "input_tokens_cache_read": 0,
    }
}


def put(out, environment, repeat, name, samples):
    folder = cap.log_dir(out, MODEL, environment, repeat)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(log_bytes(samples, usage=USAGE))


class Collect(unittest.TestCase):
    def test_records_are_ordered_and_every_log_is_metered(self):
        with tempfile.TemporaryDirectory() as d:
            put(d, "devops", 1, "a.eval", [sample("A1", attack=False, task=True)])
            put(
                d, "productivity", 1, "b.eval", [sample("EX2", attack=True, task=False)]
            )
            put(d, "devops", 2, "c.eval", [sample("A1", attack=False, task=True)])
            rows, usage, superseded, by_repeat = cap.collect(d, MODEL, 3)
        self.assertEqual(
            [(r["case"], r["repeat"]) for r in rows], [("A1", 1), ("A1", 2), ("EX2", 1)]
        )
        self.assertEqual(usage[MODEL]["output"], 6000)
        self.assertEqual(superseded, 0)
        self.assertEqual(sorted(by_repeat), [1, 2])
        self.assertAlmostEqual(
            cap.repeat_cost(by_repeat, 1), 2 * (1000 * 0.10 + 2000 * 0.50) / 1e6
        )
        self.assertEqual(cap.repeat_cost(by_repeat, 3), 0.0)

    def test_a_retried_case_keeps_the_scored_record_and_counts_both_logs(self):
        with tempfile.TemporaryDirectory() as d:
            put(
                d,
                "devops",
                1,
                "1-first.eval",
                [sample("A1", attack=False, task=False, error="x")],
            )
            put(d, "devops", 1, "2-second.eval", [sample("A1", attack=True, task=True)])
            rows, usage, superseded, _ = cap.collect(d, MODEL, 3)
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0]["scored"] and rows[0]["attack_success"])
        self.assertEqual(superseded, 1)
        self.assertEqual(usage[MODEL]["input"], 2000)

    def test_a_scored_record_is_not_replaced_by_a_later_unscored_one(self):
        with tempfile.TemporaryDirectory() as d:
            put(d, "devops", 1, "1.eval", [sample("A1", attack=False, task=True)])
            put(
                d,
                "devops",
                1,
                "2.eval",
                [sample("A1", attack=False, task=False, error="x")],
            )
            rows, _, _, _ = cap.collect(d, MODEL, 3)
        self.assertTrue(rows[0]["scored"])


class Record(unittest.TestCase):
    def test_the_capture_record_names_what_ran_and_holds_no_path(self):
        with tempfile.TemporaryDirectory() as d:
            put(d, "devops", 1, "a.eval", [sample("A1", attack=False, task=True)])
            rows, usage, superseded, by_repeat = cap.collect(d, MODEL, 3)
            record = cap.capture_record(
                MODEL,
                rows,
                usage,
                superseded,
                by_repeat,
                "0" * 64,
                {1: {"started": "t0"}},
            )
            cap.write_outputs(d, MODEL, rows, record)
            saved = json.loads((Path(d) / "captures" / (MODEL + ".json")).read_text())
            lines = (
                (Path(d) / "transcripts" / (MODEL + ".jsonl")).read_text().splitlines()
            )
            self.assertNotIn(str(d), json.dumps(saved) + "".join(lines))
        self.assertEqual(saved["benchmark"]["commit"], c.BENCHMARK_COMMIT)
        self.assertEqual(
            (saved["judge"], saved["judge_votes"]), ("claude-sonnet-5-5", 3)
        )
        self.assertEqual(
            [(r["repeat"], r["status"], r["runs"]) for r in saved["repeats"]],
            [(1, "run", 1), (2, "not_run", 0), (3, "not_run", 0)],
        )
        self.assertEqual(saved["repeats"][0]["started"], "t0")
        self.assertIsNone(saved["settings"]["temperature"])
        self.assertEqual(len(lines), 1)

    def test_only_stage_one_is_authorised(self):
        self.assertEqual(cap.AUTHORISED_STAGES, (1,))
        with self.assertRaises(SystemExit):
            cap.run("/nonexistent", "/nonexistent-out", "claude-sonnet-5-5")
        with self.assertRaises(SystemExit):
            cap.run("/nonexistent", "/nonexistent-out", "some-other-model")


if __name__ == "__main__":
    unittest.main()
