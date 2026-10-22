import copy
import importlib.util
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class ExperimentTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("experiment"), "phase5 experiment missing"
        )
        import experiment

        self.e = experiment
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)

    def test_exact_case_matrix_retains_unknown_and_decline_outcomes(self):
        rows = []
        for case in self.e.CASES:
            for policy in self.e.POLICIES:
                directory = self.directory / f"{case}-{policy}"
                rows.append(self.e.run_case(case, policy, directory))
        self.e.validate_rows(rows, drills=False)
        self.assertEqual(len(rows), 39)
        unknown = [r for r in rows if r["case"] == "receiver_unavailable"]
        self.assertEqual([r["result"]["status"] for r in unknown], ["unknown"] * 3)
        decline = [r for r in rows if r["case"] == "explicit_decline"]
        self.assertTrue(
            all(
                r["result"]["status"] == "declined" and not r["effects"]
                for r in decline
            )
        )
        recovered = [r for r in rows if r["result"]["recovery"]]
        self.assertEqual(
            {r["case"] for r in recovered},
            {
                "destination_substitution",
                "content_substitution",
                "cross_run",
                "malformed_call",
            },
        )
        self.assertTrue(all(r["policy"] == "recover" for r in recovered))
        self.assertEqual(sum(r["unsafe"] for r in rows), 0)
        for changed in (rows[:-1], rows + [rows[0]], []):
            with self.assertRaises(ValueError):
                self.e.validate_rows(changed, drills=False)
        changed = copy.deepcopy(rows)
        changed[0]["useful"] = False
        with self.assertRaises(ValueError):
            self.e.validate_rows(changed, drills=False)

    def test_inflight_effect_commits_before_revocation_and_next_dispatch_is_blocked(
        self,
    ):
        for policy in self.e.POLICIES:
            with self.subTest(policy=policy):
                row = self.e.run_inflight(policy, self.directory / policy)
                self.assertEqual(row["result"]["status"], "blocked")
                self.assertEqual(row["sends"], 1)
                self.assertEqual(row["effects"], [row["approved"]])
                self.assertFalse(row["unsafe"])
                t = row["ordering_ns"]
                self.assertLess(t["send_entered"], t["stop_requested"])
                self.assertLess(t["stop_requested"], t["effect_ack"])
                self.assertLess(t["effect_ack"], t["revoked"])
                self.e.validate_inflight(row)
                bad = copy.deepcopy(row)
                bad["ordering_ns"]["revoked"] = 0
                with self.assertRaises(ValueError):
                    self.e.validate_inflight(bad)

    def test_trace_omission_attribution_and_fabrication_are_rejected(self):
        row = self.e.run_case(
            "destination_substitution", "stop", self.directory / "one"
        )
        for mutate in ("drop", "identity", "sequence", "time"):
            changed = copy.deepcopy(row)
            if mutate == "drop":
                changed["events"] = []
            elif mutate == "identity":
                changed["events"][0]["identity"]["tenant"] = "foreign"
            elif mutate == "sequence":
                changed["events"][0]["seq"] = 100
            else:
                changed["events"][0]["time_ns"] = -1
            with self.assertRaises(ValueError):
                self.e.validate_trace(changed)

    def test_detection_latency_includes_delay_before_stop_request(self):
        original = self.e.Controller.emit

        def delayed(controller, kind, **fields):
            original(controller, kind, **fields)
            if kind == "detected":
                time.sleep(0.05)

        with patch.object(self.e.Controller, "emit", delayed):
            row = self.e.run_inflight("stop", self.directory / "delayed")
        detected = next(e["time_ns"] for e in row["events"] if e["type"] == "detected")
        self.assertIn("detection_latency_ns", row)
        self.assertEqual(
            row["detection_latency_ns"], row["ordering_ns"]["revoked"] - detected
        )
        self.assertGreaterEqual(
            row["detection_latency_ns"] - row["stop_latency_ns"], 50_000_000
        )
        altered = copy.deepcopy(row)
        altered["detection_latency_ns"] = altered["stop_latency_ns"]
        with self.assertRaises(ValueError):
            self.e.validate_inflight(altered)

    def test_existing_run_directory_is_never_overwritten(self):
        self.directory.joinpath("preserve").write_text("prior")
        with self.assertRaises(FileExistsError):
            self.e.run_case("authorized", "recover", self.directory)
        self.assertEqual(self.directory.joinpath("preserve").read_text(), "prior")


if __name__ == "__main__":
    unittest.main()
