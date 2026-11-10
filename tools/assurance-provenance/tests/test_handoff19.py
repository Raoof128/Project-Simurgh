import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import handoff19  # noqa: E402


class HandoffTests(unittest.TestCase):
    def test_handoff_document_is_recomputable(self):
        committed = (handoff19.DOCS / "HANDOFF.md").read_text()
        self.assertEqual(committed, handoff19.render())

    def test_template_is_committed(self):
        committed = json.loads(
            (handoff19.DOCS / "discrepancy-template.json").read_text()
        )
        self.assertEqual(committed, handoff19.discrepancy_template())
        self.assertEqual(set(committed["phases"]), {p["id"] for p in handoff19.PHASES})

    def test_expected_fields_exclude_host_dependent(self):
        for p in handoff19.PHASES:
            fields = handoff19.expected_fields(p["id"])
            for k in handoff19.EXCLUDED:
                self.assertNotIn(k, fields)
            self.assertEqual(
                fields["manifest_sha256"], handoff19.committed_root(p["id"])
            )
            self.assertIs(fields["verified"], True)

    def test_check_committed_receipt_is_empty(self):
        for p in handoff19.PHASES:
            self.assertEqual(
                handoff19.check(p["id"], handoff19.committed_receipt(p["id"])), []
            )

    def test_check_detects_changed_root_and_missing_field(self):
        r = handoff19.committed_receipt("19c")
        r["manifest_sha256"] = "0" * 64
        del r["new_reasons"]
        out = handoff19.check("19c", r)
        kinds = {(d["field"], d["kind"]) for d in out}
        self.assertEqual(
            kinds, {("manifest_sha256", "differs"), ("new_reasons", "missing")}
        )

    def test_check_follows_the_operators_own_replay_for_19a_kind(self):
        # The handoff tells a Linux x86_64 operator to add --replay; 19a's kind then reads
        # frozen_replay_chained (the hosted run at 94b8217b did exactly this). That is not a
        # discrepancy, but only when the operator's own receipt shows the replay verified.
        chained = handoff19.committed_receipt("19a")
        chained["replay"] = {"kind": "frozen_replay", "result": "verified"}
        chained["kind"] = "frozen_replay_chained"
        self.assertEqual(handoff19.check("19a", chained), [])

        unverified = dict(
            chained, replay={"kind": "frozen_replay", "result": "not_run"}
        )
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19a", unverified)],
            [("kind", "differs")],
        )
        mislabelled = dict(chained, kind="hash_bound_projection")
        self.assertEqual(
            [(d["field"], d["kind"]) for d in handoff19.check("19a", mislabelled)],
            [("kind", "differs")],
        )

    def test_check_flags_an_unexpected_field(self):
        receipt = dict(handoff19.committed_receipt("19c"), failures=[])
        out = handoff19.check("19c", receipt)
        self.assertEqual(
            [(d["field"], d["kind"]) for d in out], [("failures", "unexpected")]
        )

    def test_19d_socket_list_is_reported_not_compared(self):
        # The handoff tells the operator the socket list is theirs. A host that still exposes a
        # daemon socket outside the hidden directories is a report, not a discrepancy (P19-REPAIR05).
        r = handoff19.committed_receipt("19d")
        r["unix_sockets_reachable"] = ["/var/lib/example/daemon.sock"]
        r["unix_socket_egress_eliminated"] = False
        self.assertEqual(handoff19.check("19d", r), [])
        reported = handoff19.not_compared("19d", r)
        self.assertEqual(
            set(reported), {"unix_sockets_reachable", "unix_socket_egress_eliminated"}
        )
        self.assertEqual(reported["unix_sockets_reachable"]["got"], ["/var/lib/example/daemon.sock"])
        self.assertTrue(reported["unix_sockets_reachable"]["reason"])

    def test_19b_lean_host_fields_are_reported_not_compared_without_lean(self):
        # A Lean-less host reports the Lean checks null and closure false for itself; the handoff
        # says that is expected. The comparator must say so too, and still compare the rest.
        r = handoff19.committed_receipt("19b")
        r["lean"]["type_checked_on_this_host"] = None
        r["lean"]["differential_passed_on_this_host"] = None
        r["closed_by"]["lean_differential_passed_on_this_host"] = False
        r["phase_19b_closed"] = False
        self.assertEqual(handoff19.check("19b", r), [])
        reported = handoff19.not_compared("19b", r)
        self.assertEqual(
            set(reported),
            {
                "lean.type_checked_on_this_host",
                "lean.differential_passed_on_this_host",
                "closed_by.lean_differential_passed_on_this_host",
                "phase_19b_closed",
            },
        )
        # the rest of closed_by and lean are still compared
        broken = json.loads(json.dumps(r))
        broken["closed_by"]["outage_pair_holds"] = False
        broken["lean"]["states_compared"] = 48
        self.assertEqual(
            sorted((d["field"], d["kind"]) for d in handoff19.check("19b", broken)),
            [("closed_by", "differs"), ("lean", "differs")],
        )

    def test_19b_lean_host_fields_are_compared_with_lean(self):
        # With Lean present nothing is waived: a failed differential is a discrepancy.
        r = handoff19.committed_receipt("19b")
        r["lean"]["differential_passed_on_this_host"] = False
        r["closed_by"]["lean_differential_passed_on_this_host"] = False
        r["phase_19b_closed"] = False
        self.assertEqual(handoff19.not_compared("19b", r), {})
        self.assertEqual(
            sorted((d["field"], d["kind"]) for d in handoff19.check("19b", r)),
            [("closed_by", "differs"), ("lean", "differs"), ("phase_19b_closed", "differs")],
        )

    def test_handoff_text_matches_the_comparator(self):
        text = handoff19.render()
        self.assertIn("scripts/install-elan-toolchain", text)
        self.assertIn("not_compared", text)
        self.assertIn("unmapped", text)
        for f in handoff19.HOST_DEPENDENT["19d"]:
            self.assertIn(f, text)

    def test_time_estimates_follow_the_measured_runs(self):
        # three reviews measured these: 19a's frozen replay takes minutes, not seconds, and
        # the suite takes two to three times longer on a small server than on a laptop
        text = handoff19.render()
        self.assertNotIn("minute(s)", text)
        for p in handoff19.PHASES:
            self.assertIn(f"Time: {p['time']}.", text, p["id"])
        self.assertIn("--replay", handoff19.phase("19a")["time"])
        self.assertIn("sixty to ninety minutes on a small server", text)

    def test_status_is_owed(self):
        s = handoff19.status()
        self.assertEqual(s["iou"], "IOU-19-OPERATOR")
        self.assertEqual(s["status"], "owed")
        self.assertEqual(s["operator_receipts"], [])


if __name__ == "__main__":
    unittest.main()
