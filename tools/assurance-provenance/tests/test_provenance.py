import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import provenance  # noqa: E402
import rig as rigmod  # noqa: E402


class ProvenanceTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory(prefix="p19b-prov-")
        self.addCleanup(tmp.cleanup)
        self.rig = rigmod.ProvenanceRig(Path(tmp.name))
        self.addCleanup(self.rig.close)
        self.rows = []
        for route in ("b", "a"):
            verdict = self.rig.dispatch(route)
            self.rows.append(
                provenance.record(self.rig, route, verdict, len(self.rows))
            )

    def test_record_shape(self):
        row = self.rows[1]
        self.assertEqual(row["schema"], provenance.SCHEMA)
        self.assertEqual(row["verdict"], "observed")
        self.assertEqual(row["action_key"], "a")
        kinds = {i["kind"] for i in row["authority_inputs"]}
        self.assertEqual(
            kinds, {"grant", "stop", "lease", "credential", "operator_decision"}
        )
        for i in row["authority_inputs"]:
            self.assertIn(i["class"], provenance.CLASSES)
            self.assertEqual(len(i["source_digest"]), 64)
        self.assertEqual(len(row["awm_hash"]), 64)
        self.assertEqual(len(row["impl_hash"]), 64)
        self.assertEqual(len(row["signature"]), 64)
        self.assertEqual(self.rows[0]["verdict"], "blocked")

    def test_clean_rows_verify(self):
        self.assertEqual(provenance.verify_records(self.rows, self.rig), 2)

    def test_relabelled_class_is_rejected(self):
        bad = provenance.clone(self.rows)
        bad[1]["authority_inputs"][0]["class"] = "operator_signed_approval"
        bad[1]["signature"] = provenance.sign(bad[1], rigmod.OPERATOR)
        with self.assertRaises(ValueError) as ctx:
            provenance.verify_records(bad, self.rig)
        self.assertEqual(str(ctx.exception), "provenance_mismatch")

    def test_altered_digest_is_rejected(self):
        bad = provenance.clone(self.rows)
        bad[0]["authority_inputs"][0]["source_digest"] = "0" * 64
        bad[0]["signature"] = provenance.sign(bad[0], rigmod.OPERATOR)
        with self.assertRaises(ValueError) as ctx:
            provenance.verify_records(bad, self.rig)
        self.assertEqual(str(ctx.exception), "provenance_mismatch")

    def test_tampered_signature_is_rejected(self):
        bad = provenance.clone(self.rows)
        bad[1]["verdict"] = "blocked"
        with self.assertRaises(ValueError) as ctx:
            provenance.verify_records(bad, self.rig)
        self.assertEqual(str(ctx.exception), "provenance_signature")


if __name__ == "__main__":
    unittest.main()
