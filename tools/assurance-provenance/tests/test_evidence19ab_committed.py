"""The committed 19ab pack: structure on any host, the full replay on request on Linux x86_64.

The replay starts one process per attempt and takes about two minutes on a two-core server.
It runs when SIMURGH_REPLAY_19AB=1 is set on a host that can replay; the hosted suite checks
structure.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import body19ab as m  # noqa: E402
import evidence19ab as ev  # noqa: E402


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())
        cls.rows = cls.report["rows"]
        raw = (ev.DOCS / "attempts-author.json").read_bytes()
        cls.raw = raw
        cls.attempts = json.loads(raw)["attempts"]

    def test_structure_verifies(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root)
        self.assertTrue(c["verified"])
        self.assertEqual(c["kind"], "structure_checked")
        self.assertEqual(c["totals"], self.committed["totals"])
        self.assertEqual(c["hypotheses"], self.committed["hypotheses"])

    def test_the_committed_receipt_is_the_run_of_record(self):
        c = self.committed
        self.assertEqual(
            (c["kind"], c["replay"]), ("gate_recomputed", {"result": "verified"})
        )
        self.assertEqual(c["manifest_sha256"], self.root)
        self.assertEqual(len(c["tree_state"]), 40)
        self.assertIs(c["model_inference"], False)
        self.assertIs(c["independent_custody"], False)
        self.assertEqual(m.sha(self.raw), c["attempt_files"]["author"])
        self.assertEqual(
            c["sources"], {"author": {"received": 69, "rejected": 0, "run": 69}}
        )

    def test_what_the_pages_say(self):
        t = self.committed["totals"]
        self.assertEqual((t["run"], t["changed"], t["changed_observed"]), (69, 64, 0))
        self.assertEqual((t["payloads"], t["payloads_not_the_unchanged_one"]), (69, 0))
        self.assertEqual(
            (t["route_a_changed_refused"], t["route_a_changed_refused_then_observed"]),
            (47, 47),
        )
        self.assertEqual(
            (
                t["route_b_changed"],
                t["route_b_changed_refused"],
                t["route_b_changed_then_honoured_once"],
            ),
            (17, 17, 17),
        )
        self.assertEqual(
            (t["unchanged"], t["unchanged_observed"], t["most_effects"]), (5, 5, 1)
        )
        self.assertEqual((t["latched"], t["raised"]), (0, 0))
        self.assertEqual(
            self.committed["hypotheses"],
            dict.fromkeys(("B1", "B2", "B3", "B4", "B5"), True),
        )
        self.assertEqual(
            self.committed["reasons"],
            {
                "approval_admitted": 19,
                "approval_denied:approval_action": 1,
                "approval_denied:approval_digest": 15,
                "approval_denied:approval_replay": 2,
                "approval_denied:approval_run": 1,
            },
        )

    def test_most_changed_bodies_keep_the_name_of_the_action_they_stand_in_for(self):
        fixture = self.report["summary"]["fixture"]
        moved = [a for a in self.attempts if m.changed(a["route"], a["body"], fixture)]
        keep = [a for a in moved if a["body"].get("id") == a["route"]]
        self.assertEqual((len(moved), len(keep)), (64, 56))

    def test_thirty_refusals_leave_no_blocked_event(self):
        refused = events = 0
        quiet = []
        for row in self.rows:
            o = row["outcome"]
            n = (o["first"] == "blocked") + (o["second"] == "blocked")
            refused += n
            events += o["blocked_events"]
            if o["blocked_events"] < n:
                quiet.append(row["position"])
        self.assertEqual((refused, events, len(quiet)), (66, 36, 30))
        well_formed_but_wrong = {1, 2, 5, 7, 8, 9, 10, 11, 12, 13}
        self.assertFalse(well_formed_but_wrong & set(quiet))
        self.assertTrue({14, 18, 40, 60, 61, 66} <= set(quiet))

    def test_reordered_keys_are_observed_with_the_same_payload(self):
        fixture = self.report["summary"]["fixture"]
        same = [r for r in self.rows if not r["facts"]["changed"]]
        self.assertEqual([r["position"] for r in same], [0, 48, 49, 50, 68])
        for row in same:
            self.assertEqual(row["outcome"]["first"], "observed")
            self.assertEqual(
                row["outcome"]["payloads"], [fixture["payload_sha256"][row["route"]]]
            )

    def test_the_results_page_is_generated_from_the_report(self):
        page = (ev.DOCS / "RESULTS.md").read_text()
        self.assertIn(self.root, page)
        self.assertIn("64 changed bodies, observed 0", page)
        self.assertEqual(
            sum(line.startswith("| ") for line in page.splitlines()),
            2 + 5 + 2 + 5 + 2 + 69,
        )

    @unittest.skipUnless(
        os.environ.get("SIMURGH_REPLAY_19AB") == "1" and ev.host_can_replay(),
        "set SIMURGH_REPLAY_19AB=1 on Linux x86_64 in the hash-locked environment",
    )
    def test_replay_recomputes_the_committed_report(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["totals"], self.committed["totals"])


if __name__ == "__main__":
    unittest.main()
