"""The committed 19ac pack: structure on any host, the full replay on request on Linux x86_64.

The replay starts one process per attempt and gate and takes about two minutes on a two-core
server. It runs when SIMURGH_REPLAY_19AC=1 is set on a host that can replay; the hosted suite
checks structure. One row's reasons depend on how deep the host's JSON parser goes, so a
replay on a host other than the host of record may stop with ``report_mismatch``.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19ac as ev  # noqa: E402
import planted19ac as m  # noqa: E402


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())
        cls.rows = cls.report["rows"]
        cls.given = ev.read_files()
        cls.got = m.received(cls.given)

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
        for source in m.SOURCES:
            self.assertEqual(m.sha(self.given[source]), c["attempt_files"][source])

    def test_what_the_pages_say(self):
        t, s = self.committed["totals"], self.committed["sources"]
        self.assertEqual((t["run"], t["seat_attempts"]), (30, 25))
        self.assertEqual((t["seat_real_gained"], t["seat_planted_gained"]), (6, 9))
        self.assertEqual((t["real_latched"], t["real_raised"]), (0, 0))
        self.assertEqual(
            {k: (v["received"], v["rejected"], v["run"]) for k, v in s.items()},
            {"author": (5, 0, 5), "seat-a": (16, 0, 16), "seat-b": (9, 0, 9)},
        )
        self.assertEqual(
            (s["author"]["planted"]["gained"], s["author"]["real"]["gained"]), (2, 0)
        )
        self.assertEqual(
            (s["seat-a"]["real"]["gained"], s["seat-b"]["real"]["gained"]), (2, 4)
        )
        self.assertEqual(
            (s["seat-a"]["planted"]["gained"], s["seat-b"]["planted"]["gained"]), (3, 6)
        )
        self.assertEqual(
            self.committed["hypotheses"],
            {"P0": True, "P1": False, "P2": True, "P3": True},
        )
        self.assertEqual(max(r[g]["effects"] for r in self.rows for g in m.GATES), 1)

    def test_every_gain_on_the_real_gate_reuses_a_nonce_minted_for_the_other_action(
        self,
    ):
        attempts = {
            (s, a["position"]): a for s in m.SOURCES for a in self.got[s]["attempts"]
        }
        gains = [(r["source"], r["position"]) for r in self.rows if r["real"]["gained"]]
        self.assertEqual(
            gains,
            [
                ("seat-a", 0),
                ("seat-a", 1),
                ("seat-b", 0),
                ("seat-b", 1),
                ("seat-b", 2),
                ("seat-b", 3),
            ],
        )
        for key in gains:
            steps = attempts[key]["steps"]
            self.assertEqual(m.minted(steps), ["a"], key)
            names = {s["name"] for s in steps if s["do"] == "mint"}
            relayed = [
                json.loads(s["text"])["approval"]["payload"]
                for s in steps
                if s["do"] == "relay" and "text" in s
            ]
            self.assertTrue(relayed, key)
            self.assertTrue(all(p["action_key"] == "b" for p in relayed), key)
            self.assertTrue(
                any(p["nonce"] in {"n-" + n for n in names} for p in relayed), key
            )
            self.assertIn("operator key", attempts[key]["note"], key)

    def test_each_seat_also_gains_on_the_planted_gate_alone(self):
        only = [
            (r["source"], r["position"])
            for r in self.rows
            if r["planted"]["gained"] and not r["real"]["gained"]
        ]
        self.assertEqual(
            only,
            [("author", 1), ("author", 2), ("seat-a", 3), ("seat-b", 4), ("seat-b", 5)],
        )

    def test_the_results_page_is_generated_from_the_report(self):
        page = (ev.DOCS / "RESULTS.md").read_text()
        self.assertIn(self.root, page)
        self.assertIn("6 of 25", page)

    @unittest.skipUnless(
        os.environ.get("SIMURGH_REPLAY_19AC") == "1" and ev.host_can_replay(),
        "set SIMURGH_REPLAY_19AC=1 on Linux x86_64 in the hash-locked environment",
    )
    def test_replay_recomputes_the_committed_report(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["totals"], self.committed["totals"])


if __name__ == "__main__":
    unittest.main()
