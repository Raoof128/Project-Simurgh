"""The committed 19ae pack: structure on any host, the full replay on request on Linux x86_64.

The replay takes about twelve minutes on a two-core server. It runs when
SIMURGH_REPLAY_19AE=1 is set on a host that can replay; the hosted suite checks structure.
Rows inherited from lanes 19y, 19z and 19ac depend on the host, so a replay off the host of
record may stop with ``report_mismatch``.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19ae as ev  # noqa: E402
import full19ae as m  # noqa: E402


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())
        cls.rows = cls.report["rows"]
        cls.seats = [r for r in cls.rows if r["source"] in m.SEATS]

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
        self.assertIs(c["independent_custody"], False)
        given = ev.read_files()
        for source in m.SOURCES:
            self.assertEqual(m.sha(given[source]), c["attempt_files"][source], source)

    def test_what_the_pages_say(self):
        t = self.committed["totals"]
        self.assertEqual((t["run"], t["recorded"], t["fresh"]), (467, 431, 36))
        self.assertEqual((t["bound_unrecorded"], t["bound_retry_marks"]), (24, 0))
        self.assertEqual((t["full_unrecorded"], t["full_refused_marks"]), (0, 27))
        self.assertEqual((t["full_long_runs"], t["full_retry_marks_match"]), (12, 465))
        self.assertEqual((t["recorded_same_on_full"], t["full_gained"]), (431, 0))
        self.assertEqual(
            (
                t["fresh_without_store_writes"],
                t["fresh_without_store_writes_latched"],
                t["fresh_without_store_writes_raised"],
            ),
            (31, 0, 16),
        )
        self.assertEqual(
            self.committed["hypotheses"],
            {"F0": True, "F1": True, "F2": False, "F3": True, "F4": True, "F5": False},
        )
        run = {s: v["run"] for s, v in self.committed["sources"].items()}
        self.assertEqual((run["seat-a"], run["seat-b"], run["seat-c"]), (9, 11, 16))
        self.assertEqual(
            sum(v for s, v in run.items() if s.startswith(("19t", "19y"))), 243
        )

    def test_every_raise_of_a_seat_with_no_store_write_is_the_same_fault(self):
        got = m.received(ev.read_files())
        steps = {
            (s, a["position"]): a["steps"] for s in m.SEATS for a in got[s]["attempts"]
        }
        quiet = [
            r
            for r in self.seats
            if not m.writes_stores(steps[(r["source"], r["position"])])
        ]
        raised = [r for r in quiet if r["full"]["raised"]]
        self.assertEqual((len(quiet), len(raised)), (31, 16))
        self.assertEqual({r["full"]["raised"] for r in raised}, {"KeyError"})
        for r in raised:
            last = [
                s for s in steps[(r["source"], r["position"])] if s["do"] == "body"
            ][-1]
            self.assertFalse(
                {"run", "id"} <= set(last["body"]), (r["source"], r["position"])
            )
            self.assertTrue(last["token"] is not None or last["text"] is not None)

    def test_the_two_rows_that_fail_f2_are_latched_by_the_seats_own_write(self):
        off = [
            r
            for r in self.rows
            if sorted(set(r["full"]["marks"]["retry_limit"])) != r["full"]["long_runs"]
        ]
        self.assertEqual(
            [(r["source"], r["position"]) for r in off], [("seat-a", 5), ("seat-b", 5)]
        )
        for r in off:
            self.assertTrue(r["full"]["latched"])
            self.assertEqual(
                (r["full"]["marks"]["retry_limit"], r["full"]["long_runs"]), ([], ["b"])
            )

    def test_the_six_gains_of_lane_19ac_do_not_gain_here(self):
        six = [
            r
            for r in self.rows
            if (r["source"], r["position"])
            in {
                ("19ac-seat-a", 0),
                ("19ac-seat-a", 1),
                ("19ac-seat-b", 0),
                ("19ac-seat-b", 1),
                ("19ac-seat-b", 2),
                ("19ac-seat-b", 3),
            }
        ]
        self.assertEqual(len(six), 6)
        self.assertEqual(
            {(r["bound"]["gained"], r["full"]["gained"]) for r in six}, {(False, False)}
        )

    def test_the_results_page_is_generated_from_the_report(self):
        page = (ev.DOCS / "RESULTS.md").read_text()
        self.assertIn(self.root, page)
        self.assertIn("raised 16", page)

    @unittest.skipUnless(
        os.environ.get("SIMURGH_REPLAY_19AE") == "1" and ev.host_can_replay(),
        "set SIMURGH_REPLAY_19AE=1 on Linux x86_64 in the hash-locked environment",
    )
    def test_replay_recomputes_the_committed_report(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["totals"], self.committed["totals"])


if __name__ == "__main__":
    unittest.main()
