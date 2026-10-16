import importlib.util
import tempfile
import unittest
from pathlib import Path

import test_capture


class EvidenceTests(unittest.TestCase):
    def test_archive_root_and_inventory_are_binding(self):
        self.assertIsNotNone(importlib.util.find_spec("evidence"))
        import evidence

        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "pack.zip"
            files = {"one": b"a", "two": b"b", "three": b"c"}
            root = evidence.write_pack(path, files)
            self.assertEqual(evidence.read_pack(path, root), files)
            with self.assertRaises(ValueError):
                evidence.read_pack(path, "0" * 64)

    def test_report_is_recomputed_not_trusted(self):
        self.assertIsNotNone(importlib.util.find_spec("evidence"))
        import evidence

        c = test_capture.CaptureTests()
        c.setUp()
        try:
            tasks, cap, _files = c.capture()
            report = evidence.make_report(cap, tasks)
            evidence.check_report(report, cap, tasks)
            report["summary"]["controls"]["composed"]["active_completion"] = 999
            with self.assertRaises(ValueError):
                evidence.check_report(report, cap, tasks)
        finally:
            c.doCleanups()


if __name__ == "__main__":
    unittest.main()
