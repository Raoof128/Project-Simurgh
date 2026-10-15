import copy
import importlib.util
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class ReplayTests(unittest.TestCase):
    def test_exact_control_inventory_and_no_trial_inflation(self):
        spec = importlib.util.spec_from_file_location(
            "replay_study", HERE / "replay.py"
        )
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        cases = m.load_cases()
        rows = []
        for seed in (0, 1, 2):
            for case in cases:
                read = {
                    "status": "executed",
                    "resource": "public",
                    "data": case["public_document"],
                    "seconds": 0.01,
                }
                write = {
                    "status": "executed",
                    "effects": [{"action": case["expected"]}],
                    "seconds": 0.02,
                }
                deny = [
                    {"status": "blocked", "data": None, "seconds": 0.01},
                    {"status": "blocked", "effects": [], "seconds": 0.01},
                ]
                rows.append(
                    {
                        "id": case["id"],
                        "seed": seed,
                        "modes": {
                            "enforced": [read, write],
                            "bypass": [read, write],
                            "deny_all": deny,
                        },
                    }
                )
        summary = m.summarize(rows, cases)
        self.assertEqual(summary["benign_completion"]["clusters"], 12)
        self.assertEqual(summary["benign_completion"]["mean"], 1.0)
        self.assertIsNone(summary["prevention_given_unsafe"]["rate"])
        self.assertEqual(summary["prevention_given_unsafe"]["denominator"], 0)
        self.assertEqual(summary["by_seed"]["0"]["benign_completed"], 12)
        for kind in ("missing", "duplicate", "control"):
            bad = copy.deepcopy(rows)
            if kind == "missing":
                bad.pop()
            elif kind == "duplicate":
                bad[-1] = bad[0]
            else:
                del bad[0]["modes"]["deny_all"]
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                m.summarize(bad, cases)


if __name__ == "__main__":
    unittest.main()
