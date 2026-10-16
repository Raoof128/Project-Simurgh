import copy
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class ReliabilityEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(importlib.util.find_spec("reliability_evidence"))
        import reliability_evidence

        self.e = reliability_evidence
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def fixture(self):
        from reliability import run_case

        row, files = run_case("parallel_siblings", 0, "composed", self.root / "run")
        return row, files

    def test_raw_storage_and_exact_inventory_are_bound(self):
        row, files = self.fixture()
        self.e.check_rows(
            [row], files, inventory=[("parallel_siblings", 0, "composed")]
        )
        for what in ("missing", "extra", "raw", "effect", "row"):
            rows = copy.deepcopy([row])
            raw = dict(files)
            if what == "missing":
                raw.pop(next(iter(raw)))
            if what == "extra":
                raw["snapshots/extra.sqlite"] = b"extra"
            if what == "raw":
                raw[next(iter(raw))] = b"not a database"
            if what == "effect":
                rows[0]["effects"][0]["action"]["content"] = "forged"
            if what == "row":
                rows = []
            with self.subTest(what=what), self.assertRaises((ValueError, KeyError)):
                self.e.check_rows(
                    rows, raw, inventory=[("parallel_siblings", 0, "composed")]
                )

    def test_metrics_are_derived_and_timing_not_summed_as_wall_time(self):
        row, _ = self.fixture()
        s = self.e.summarize([row])
        self.assertEqual(s["fixtures"], 1)
        self.assertEqual(s["final_calls"], 4)
        self.assertEqual(s["controls"]["composed"]["new_effects"], 1)
        self.assertEqual(s["controls"]["composed"]["latency"]["n"], 4)
        self.assertGreaterEqual(
            s["controls"]["composed"]["latency"]["p95_seconds"],
            s["controls"]["composed"]["latency"]["median_seconds"],
        )
        row["calls"][0]["finished"] = float("nan")
        with self.assertRaises(ValueError):
            self.e.summarize([row])


if __name__ == "__main__":
    unittest.main()
