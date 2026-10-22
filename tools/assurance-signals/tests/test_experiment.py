import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class ExperimentTests(unittest.TestCase):
    def test_exact_matrix_native_effects_and_inflight_limit(self):
        self.assertIsNotNone(
            importlib.util.find_spec("experiment"), "phase6 experiment missing"
        )
        from experiment import CASES, POLICIES, execute, validate

        self.assertEqual(len(CASES), 21)
        self.assertEqual(POLICIES, ("local_only", "integrated"))
        with tempfile.TemporaryDirectory() as d:
            rows, files = execute(Path(d) / "matrix")
        self.assertEqual(len(rows), 44)
        self.assertEqual(len(files), 88)
        validate(rows)
        by_id = {(r["case"], r["policy"]): r for r in rows}
        for case in [
            "block_before",
            "alert_before",
            "monitor_missing",
            "lookup_unavailable",
        ]:
            self.assertEqual(len(by_id[case, "local_only"]["effects"]), 1)
            self.assertEqual(by_id[case, "integrated"]["effects"], [])
        for case in ["stream_block_after", "delayed_alert_after", "inflight"]:
            self.assertEqual(len(by_id[case, "integrated"]["effects"]), 1)
            self.assertEqual(by_id[case, "integrated"]["result"]["status"], "blocked")
        self.assertEqual(
            by_id["unknown_effect", "integrated"]["result"]["status"], "unknown"
        )
        with self.assertRaises(ValueError):
            validate(rows[:-1])
        with self.assertRaises(ValueError):
            validate(rows + [rows[0]])
        by_id["authorized", "integrated"]["effects"] = []
        with self.assertRaises(ValueError):
            validate(rows)


if __name__ == "__main__":
    unittest.main()
