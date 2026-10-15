import contextlib
import copy
import io
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

try:
    from simurgh_isolation import study
except ImportError:
    study = None
from simurgh_isolation.kernel import Refusal


class StudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = study.run() if study else None

    def test_exact_complete_replay(self):
        self.assertIsNotNone(study, "study module missing")
        self.assertEqual(len(self.report["rows"]), 57)
        study.verify(self.report)

    def test_omission_duplicate_reorder_and_source_tamper_refuse(self):
        self.assertIsNotNone(study)
        for mutation in ("empty", "duplicate", "reorder", "source", "schema"):
            r = copy.deepcopy(self.report)
            if mutation == "empty":
                r["rows"] = []
            elif mutation == "duplicate":
                r["rows"][-1] = r["rows"][0]
            elif mutation == "reorder":
                r["rows"].reverse()
            elif mutation == "source":
                r["sources"] = {}
            else:
                r["schema"] = "wrong"
            with self.subTest(mutation=mutation), self.assertRaises(Refusal):
                study.check_shape(r)

    def test_changed_observation_refuses(self):
        self.assertIsNotNone(study)
        r = copy.deepcopy(self.report)
        r["rows"][0]["observed"]["output"] = "invented"
        with self.assertRaises(Refusal):
            study.verify(r)

    def test_missing_baseline_is_not_containment(self):
        self.assertIsNotNone(study)
        r = copy.deepcopy(self.report)
        row = next(
            r
            for r in r["rows"]
            if r["case"] == "file_write" and r["control"] == "baseline"
        )
        row["effect"] = False
        with self.assertRaises(Refusal):
            study.validate_results(r["rows"])

    def test_useful_and_negative_controls_required(self):
        self.assertIsNotNone(study)
        for case in ("transform", "approved_socket_payload"):
            r = copy.deepcopy(self.report)
            row = next(
                r
                for r in r["rows"]
                if r["case"] == case and r["control"] == "capability"
            )
            row["effect"] = False
            with self.assertRaises(Refusal):
                study.validate_results(r["rows"])

    def test_duplicate_json_keys_refuse(self):
        self.assertIsNotNone(study)
        with self.assertRaises(Refusal):
            json.loads('{"rows":[],"rows":[]}', object_pairs_hook=study.unique)

    def test_case_cli_refuses_malformed_worker_envelopes(self):
        envelopes = (
            '{"outcome":"blocked","errno":null,"data":null}',
            '{"outcome":"blocked","errno":true,"data":null}',
            '{"outcome":"blocked","errno":1.0,"data":null}',
            '{"outcome":"delivered","outcome":"blocked","errno":1,"data":null}',
            '{"outcome":"delivered","errno":1,"data":null}',
            '{"outcome":"blocked","errno":1,"data":"forged"}',
            '{"outcome":"closed","errno":9,"data":null}',
        )
        for envelope in envelopes:
            result = SimpleNamespace(returncode=0, stderr="", stdout=envelope)
            output, error = io.StringIO(), io.StringIO()
            with (
                self.subTest(envelope=envelope),
                patch("simurgh_isolation.harness.subprocess.run", return_value=result),
                patch("sys.argv", ["study", "case", "file_write", "capability"]),
                contextlib.redirect_stdout(output),
                contextlib.redirect_stderr(error),
            ):
                self.assertEqual(study.main(), 1)
                self.assertEqual(output.getvalue(), "")
                self.assertIn("refused:", error.getvalue())

    def test_boolean_errno_is_not_integer_errno(self):
        report = copy.deepcopy(self.report)
        row = next(
            r
            for r in report["rows"]
            if r["case"] == "file_write" and r["control"] == "capability"
        )
        row["worker"]["errno"] = True
        with self.assertRaises(Refusal):
            study.validate_results(report["rows"])


if __name__ == "__main__":
    unittest.main()
