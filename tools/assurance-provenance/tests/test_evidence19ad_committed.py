"""The committed 19ad pack: structure on any host, the full replay on request on Linux x86_64.

The replay starts one process per sequence and gate and takes about four minutes on a
two-core server. It runs when SIMURGH_REPLAY_19AD=1 is set on a host that can replay; the
hosted suite checks structure. One row inherited from lane 19ac records a reason that depends
on the host's JSON parser, so a replay off the host of record may stop with
``report_mismatch``.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import bind19ad as m  # noqa: E402
import evidence19ad as ev  # noqa: E402


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())
        cls.rows = cls.report["rows"]

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

    def test_the_pack_reads_the_files_the_other_lanes_committed(self):
        given = ev.read_files()
        for source in m.SOURCES:
            self.assertEqual(
                m.sha(given[source]), self.committed["attempt_files"][source], source
            )
        other = json.loads(
            (ev.ROOT / "docs/research/provenance-phase-19ac/receipt.json").read_text()
        )
        self.assertEqual(
            self.committed["attempt_files"]["19ac-seat-a"],
            other["attempt_files"]["seat-a"],
        )
        self.assertEqual(
            self.committed["attempt_files"]["19ac-seat-b"],
            other["attempt_files"]["seat-b"],
        )

    def test_what_the_pages_say(self):
        t, s = self.committed["totals"], self.committed["sources"]
        self.assertEqual((t["run"], t["before_gained"], t["bound_gained"]), (67, 8, 0))
        self.assertEqual((t["seats_before_gained"], t["author_before_gained"]), (6, 2))
        self.assertEqual(
            (
                t["no_forged_token_admitted_before"],
                t["no_forged_token_admitted_before_same_on_bound"],
            ),
            (57, 57),
        )
        self.assertEqual(
            (
                t["resigned_for_an_approved_action"],
                t["resigned_for_an_approved_action_admitted_on_bound"],
            ),
            (2, 0),
        )
        self.assertEqual((t["bound_latched"], t["bound_raised"]), (0, 0))
        self.assertEqual(
            {k: v["run"] for k, v in s.items()},
            {
                "19aa-author": 28,
                "19ac-author": 5,
                "19ac-seat-a": 16,
                "19ac-seat-b": 9,
                "author": 9,
            },
        )
        self.assertEqual(
            self.committed["hypotheses"], dict.fromkeys(("D0", "D1", "D2", "D3"), True)
        )

    def test_the_gains_before_are_the_recorded_ones_and_each_is_refused_on_the_bound_gate(
        self,
    ):
        gains = [
            (r["source"], r["position"]) for r in self.rows if r["before"]["gained"]
        ]
        self.assertEqual(
            gains,
            [
                ("19ac-seat-a", 0),
                ("19ac-seat-a", 1),
                ("19ac-seat-b", 0),
                ("19ac-seat-b", 1),
                ("19ac-seat-b", 2),
                ("19ac-seat-b", 3),
                ("author", 0),
                ("author", 1),
            ],
        )
        for row in self.rows:
            if row["before"]["gained"]:
                bound_b = [v for r, _, v in row["bound"]["dispatches"] if r == "b"]
                self.assertTrue(
                    bound_b and set(bound_b) == {"blocked"}, row["position"]
                )
                self.assertGreater(
                    row["bound"]["reasons"].get("approval_denied:approval_replay", 0), 0
                )

    def test_ten_rows_differ_between_the_gates_and_the_page_lists_them(self):
        differ = [r for r in self.rows if not m.same_outcome(r)]
        self.assertEqual(len(differ), 10)
        page = (ev.DOCS / "RESULTS.md").read_text()
        self.assertIn(self.root, page)
        self.assertIn(
            "The other 57 sequences have the same verdicts and effects on both gates.",
            page,
        )

    @unittest.skipUnless(
        os.environ.get("SIMURGH_REPLAY_19AD") == "1" and ev.host_can_replay(),
        "set SIMURGH_REPLAY_19AD=1 on Linux x86_64 in the hash-locked environment",
    )
    def test_replay_recomputes_the_committed_report(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["totals"], self.committed["totals"])


if __name__ == "__main__":
    unittest.main()
