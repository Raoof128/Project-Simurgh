import copy
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class ExperimentTests(unittest.TestCase):
    def test_exact_cases_native_dispatch_and_raw_evidence(self):
        self.assertIsNotNone(
            importlib.util.find_spec("experiment"),
            "phase 7 experiment implementation must exist",
        )
        from experiment import CASES, POLICIES, execute, validate

        with tempfile.TemporaryDirectory() as directory:
            rows, files = execute(Path(directory) / "matrix")
        self.assertEqual(len(rows), 36)
        self.assertEqual(len(files), 108)
        self.assertEqual(
            {(r["case"], r["policy"]) for r in rows},
            {(c, p) for c in CASES for p in POLICIES},
        )
        validate(rows)
        by = {(r["case"], r["policy"]): r for r in rows}
        for case in (
            "honest_resume",
            "authorized_child",
            "authorized_grandchild",
            "duplicate_handoff",
            "nonblocking_failure",
        ):
            self.assertEqual(by[case, "integrated"]["result"]["status"], "observed")
            self.assertEqual(
                sum(
                    len(x["effects"])
                    for x in by[case, "integrated"]["receivers"].values()
                ),
                1,
            )
        for case in ("forged_approval", "omitted_failure", "fabricated_success"):
            self.assertTrue(by[case, "integrated"]["audit"])
        self.assertEqual(
            by["unknown_effect", "integrated"]["result"]["status"], "unknown"
        )
        self.assertEqual(by["shared_budget", "local_only"]["effect_count"], 2)
        self.assertEqual(by["shared_budget", "integrated"]["effect_count"], 1)
        self.assertEqual(
            by["fabricated_success", "integrated"]["projection"]["attempts"][0][
                "status"
            ],
            "unknown",
        )
        for row in rows:
            self.assertTrue(row["result"]["native_interrupted"])
            self.assertEqual(
                row["result"]["worker"], {"path_denied": True, "socket_denied": True}
            )
        for bad in (rows[:-1], rows + [rows[0]], list(reversed(rows))):
            with self.assertRaises(ValueError):
                validate(bad)
        bad = copy.deepcopy(rows)
        bad[0]["result"]["status"] = "blocked"
        with self.assertRaises(ValueError):
            validate(bad)


if __name__ == "__main__":
    unittest.main()
