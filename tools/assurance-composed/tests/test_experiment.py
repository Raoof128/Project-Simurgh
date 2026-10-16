import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class ExperimentTests(unittest.TestCase):
    def test_complete_native_matrix_and_raw_inventory(self):
        self.assertIsNotNone(
            importlib.util.find_spec("experiment"), "composition experiment must exist"
        )
        import experiment as e

        with tempfile.TemporaryDirectory() as directory:
            rows, files = e.execute(Path(directory) / "matrix")
        self.assertEqual(len(rows), 40)
        self.assertEqual(len(files), 360)
        e.validate(rows)
        lookup = {(r["case"], r["policy"]): r for r in rows}
        self.assertEqual(lookup["shared_budget", "composed"]["effect_count"], 1)
        self.assertEqual(lookup["shared_budget", "credential_only"]["effect_count"], 2)
        self.assertEqual(lookup["lost_ack", "composed"]["retry"]["status"], "unknown")
        self.assertEqual(
            lookup["credential_revoke", "composed"]["leaf_status"]["a"], "denied"
        )
        self.assertTrue(lookup["interrupted_transition", "composed"]["held"])
        self.assertEqual(
            lookup["unknown_then_sibling", "composed"]["initial"]["status"], "unknown"
        )
        self.assertEqual(lookup["unknown_then_sibling", "composed"]["effect_count"], 1)


if __name__ == "__main__":
    unittest.main()
