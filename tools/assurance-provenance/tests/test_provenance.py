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

    def test_approval_admitted_record_names_the_token(self):
        import gate19

        tmp = tempfile.TemporaryDirectory(prefix="p19b-prov-appr-")
        self.addCleanup(tmp.cleanup)
        rig = rigmod.ProvenanceRig(Path(tmp.name), gate_cls=gate19.ProvenancePipeline)
        self.addCleanup(rig.close)
        token = rig.mint("b", approver_id="operator-1", nonce="prov-1")
        verdict = rig.dispatch("b", approval=token)
        self.assertEqual(verdict, "observed")
        row = provenance.record(rig, "b", verdict, 7, approval=token)
        kinds = [i["kind"] for i in row["authority_inputs"]]
        self.assertIn("approval", kinds)
        approval_input = [
            i for i in row["authority_inputs"] if i["kind"] == "approval"
        ][0]
        self.assertEqual(approval_input["class"], "operator_signed_approval")
        self.assertEqual(approval_input["source_digest"], provenance.sha(token))
        self.assertEqual(row["approval_digest"], provenance.sha(token))
        self.assertEqual(provenance.verify_records([row], rig), 1)
        # a record that hides the token behind an ordinary row is a mismatch
        bad = provenance.clone([row])
        bad[0]["approval_digest"] = None
        bad[0]["signature"] = provenance.sign(bad[0], rigmod.OPERATOR)
        with self.assertRaises(ValueError) as ctx:
            provenance.verify_records(bad, rig)
        self.assertEqual(str(ctx.exception), "provenance_mismatch")

    def test_non_string_signature_is_a_value_error(self):
        bad = provenance.clone(self.rows)
        bad[0]["signature"] = 5
        with self.assertRaises(ValueError) as ctx:
            provenance.verify_records(bad, self.rig)
        self.assertEqual(str(ctx.exception), "provenance_signature")

    def test_decision_ids_are_distinct_across_the_lane(self):
        import lane

        ids = [r["decision_id"] for r in self.rows]
        self.assertEqual(len(set(ids)), len(ids))
        self.assertIn("decision_base", lane._run.__code__.co_varnames)

    def test_tampered_signature_is_rejected(self):
        bad = provenance.clone(self.rows)
        bad[1]["verdict"] = "blocked"
        with self.assertRaises(ValueError) as ctx:
            provenance.verify_records(bad, self.rig)
        self.assertEqual(str(ctx.exception), "provenance_signature")


if __name__ == "__main__":
    unittest.main()
