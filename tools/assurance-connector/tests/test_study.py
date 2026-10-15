import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class StudyTests(unittest.TestCase):
    def test_exact_matrix_observations_recovery_and_tamper(self):
        self.assertIsNotNone(
            importlib.util.find_spec("study"), "source-bound study missing"
        )
        from study import run, save, verify

        report = run()
        self.assertEqual(len(report["rows"]), 39)
        self.assertTrue(
            all(r.get("via_native_sdk") is True for r in report["recovery"][:2])
        )
        for control, useful, unsafe in (
            ("enforced", 2, 0),
            ("bypass", 2, 9),
            ("deny_all", 0, 0),
        ):
            self.assertEqual(
                report["totals"][control], {"useful": useful, "unauthorized": unsafe}
            )
        self.assertEqual(
            [r["status"] for r in report["recovery"]],
            ["not_observed", "observed", "unknown", "blocked"],
        )
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "report.json"
            save(path, report)
            self.assertTrue(verify(path))
            with self.assertRaises(FileExistsError):
                save(path, report)
            # JSON booleans must not compare equal to numbers in sealed evidence.
            report["rows"][0]["result"]["worker"]["path_denied"] = 1
            from core import encode

            path.write_text(encode(report))
            with self.assertRaises(ValueError):
                verify(path)
            report["rows"] = []
            from core import encode

            path.write_text(encode(report))
            with self.assertRaises(ValueError):
                verify(path)


if __name__ == "__main__":
    unittest.main()
