import copy
import importlib.util
import tempfile
import unittest
from pathlib import Path

import test_projection


class ExportEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(importlib.util.find_spec("export_evidence"))
        import export_evidence

        self.e = export_evidence
        self.fixture = test_projection.ProjectionTests()
        self.fixture.setUp()
        self.view = self.fixture.build()
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "public.zip"

    def test_public_bundle_verification_is_explicitly_weaker(self):
        release = {
            "schema": "simurgh-phase14-release-v1",
            "protocol_sha256": "a" * 64,
            "protocol_commit": "b" * 40,
            "public_sha256": self.e.sha(self.e.wire(self.view)),
        }
        root = self.e.write_bundle(self.path, self.view, release)
        view, actual = self.e.read_bundle(self.path, root)
        self.assertEqual(view, self.view)
        self.assertEqual(actual, release)
        receipt = self.e.inspect(self.path, root)
        self.assertTrue(receipt["public_structure_verified"])
        self.assertFalse(receipt["source_consistency_verified"])
        with self.assertRaises(ValueError):
            self.e.read_bundle(self.path, "0" * 64)

    def test_consistent_public_forgery_requires_source_to_disprove(self):
        f = self.fixture
        self.e.match_source(self.view, f.cap, f.tasks, f.root)
        bad = copy.deepcopy(self.view)
        r = bad["rows"][0]
        r["status"] = "unknown"
        r["acknowledged_completion"] = False
        bad["summary"] = f.o.summarize(bad["rows"])
        f.o.validate(bad)
        with self.assertRaises(ValueError):
            self.e.match_source(bad, f.cap, f.tasks, f.root)


if __name__ == "__main__":
    unittest.main()
