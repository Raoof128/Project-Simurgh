import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import lane  # noqa: E402


class LaneTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="p19b-lane-")
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.result = lane.write_anywhere(Path(cls.tmp.name) / "wa")

    def test_headline(self):
        r = self.result
        self.assertEqual(r["wired_deterministic_channels"], 4)
        self.assertEqual(r["clean_differences"], 0)
        self.assertEqual(r["kill_count"], 13)
        self.assertEqual(r["mutants_total"], 13)
        self.assertEqual(sorted(r["not_wired"]), sorted(lane.NOT_WIRED))

    def test_rows_cover_every_gate_channel_payload(self):
        rows = self.result["rows"]
        gates = {row["gate"] for row in rows}
        self.assertIn("composed_successor", gates)
        self.assertEqual(len(gates), 14)
        wired_rows = [r for r in rows if r["wired"]]
        self.assertEqual(len(wired_rows), 14 * 4 * len(lane.PAYLOADS))
        clean_unwired = [
            r for r in rows if not r["wired"] and r["gate"] == "composed_successor"
        ]
        self.assertEqual(len(clean_unwired), len(lane.NOT_WIRED) * len(lane.PAYLOADS))
        self.assertTrue(all(r["differs"] is False for r in clean_unwired))
        for r in rows:
            self.assertEqual(
                set(r),
                {
                    "gate",
                    "kind",
                    "channel",
                    "wired",
                    "payload",
                    "verdicts",
                    "effects",
                    "authority_hash",
                    "audit",
                    "differs",
                },
            )

    def test_mutant_report_names_the_killing_payloads(self):
        for m in self.result["mutants"]:
            self.assertTrue(m["killed"], m["name"])
            self.assertTrue(m["killed_by"], m["name"])
            if m["kind"] == "text_grant":
                self.assertIn("grant_claim", m["killed_by"])
            if m["kind"] == "text_stop":
                self.assertIn("stop_claim", m["killed_by"])
            if m["kind"] == "config_budget":
                self.assertIn("config_claim", m["killed_by"])
            if m["kind"] == "tool_result_trust":
                self.assertIn("approval_claim", m["killed_by"])

    def test_provenance_records_verify(self):
        self.assertGreater(self.result["provenance"]["records"], 0)
        self.assertEqual(
            self.result["provenance"]["verified"], self.result["provenance"]["records"]
        )

    def test_credential_only_arm_reported(self):
        arm = self.result["credential_only_frozen"]
        self.assertEqual(arm["differences"], 0)
        self.assertEqual(
            arm["baseline"]["verdicts"], {"a": "observed", "b": "observed"}
        )

    def test_determinism(self):
        again = lane.write_anywhere(Path(self.tmp.name) / "wa2")
        self.assertEqual(lane.wire(again), lane.wire(self.result))


class ApprovalMatrixTests(unittest.TestCase):
    def test_matrix(self):
        tmp = tempfile.TemporaryDirectory(prefix="p19b-matrix-")
        self.addCleanup(tmp.cleanup)
        m = lane.approval_matrix(Path(tmp.name) / "m")
        self.assertEqual(
            len(m["rows"]), 8
        )  # eight forgeries since P19-REPAIR03 (actor)
        self.assertIn("approval_actor", [r["forgery"] for r in m["rows"]])
        self.assertEqual(m["positive_control"]["native_decision_replay"], "reject")
        self.assertIn(
            "approval", m["positive_control"]["provenance_record"]["input_kinds"]
        )
        self.assertTrue(m["distinct_reasons"])
        self.assertTrue(m["all_forgeries_blocked"])
        self.assertTrue(all(r["native_decision"] == "reject" for r in m["rows"]))
        self.assertEqual(m["positive_control"]["verdict"], "observed")
        self.assertEqual(m["positive_control"]["native_decision"], "approve")
        self.assertEqual(m["positive_control"]["replay_after_spend"], "approval_replay")
        self.assertIs(m["native_path_exercised"], False)


class OutageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="p19b-outage-")
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.result = lane.outage(Path(cls.tmp.name) / "out")

    def test_exact_action_blocked_during_outage_and_admitted_in_control(self):
        r = self.result
        self.assertEqual(r["outage_exact_action"]["verdict"], "blocked")
        self.assertEqual(r["outage_exact_action"]["effects"], 0)
        self.assertIn(
            "dispatch_signal_unavailable", r["outage_exact_action"]["pipeline_events"]
        )
        self.assertEqual(r["no_outage_control"]["verdict"], "observed")
        self.assertEqual(r["no_outage_control"]["effects"], 1)

    def test_outage_after_reserve_is_unknown_and_consumes_budget(self):
        r = self.result["outage_after_reserve"]
        self.assertEqual(r["effects"], 0)
        self.assertEqual(r["attempt_status"], "unknown")
        self.assertEqual(r["budget_reserved"], 1)
        self.assertEqual(r["exception"], "OperationalError")

    def test_self_asserted_stop_is_a_killed_mutant_not_a_pass(self):
        r = self.result["self_asserted_stop"]
        self.assertEqual(r["clean"]["verdicts"]["a"], "observed")
        self.assertEqual(r["mutant"]["verdicts"]["a"], "blocked")
        self.assertTrue(r["mutant_killed"])

    def test_ack_bound_renewal(self):
        r = self.result["ack_renewal"]
        self.assertEqual(r["without_ack"]["verdict"], "blocked")
        self.assertIn("monitor_paused", r["without_ack"]["signal_events"])
        self.assertEqual(r["with_ack"]["verdict"], "observed")
        self.assertEqual(r["plain_heartbeat_control"]["verdict"], "observed")


if __name__ == "__main__":
    unittest.main()
