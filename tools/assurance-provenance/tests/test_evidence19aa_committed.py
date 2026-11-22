"""The committed 19aa pack: structure on any host, the full replay on request on Linux x86_64.

The replay starts one process per sequence and takes about one minute on a two-core server.
It runs when SIMURGH_REPLAY_19AA=1 is set on a host that can replay; the hosted suite checks
structure.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19aa as ev  # noqa: E402
import retry19aa as r  # noqa: E402


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
        self.assertIs(c["model_inference"], False)
        self.assertIs(c["independent_custody"], False)

    def test_the_committed_files_are_the_ones_in_the_pack(self):
        raw = (ev.DOCS / "attempts-author.json").read_bytes()
        self.assertEqual(r.sha(raw), self.committed["attempt_files"]["author"])
        self.assertEqual(json.loads((ev.DOCS / "report.json").read_text()), self.report)
        self.assertEqual(
            self.committed["sources"],
            {"author": {"received": 28, "rejected": 0, "run": 28}},
        )

    def test_what_the_pages_say(self):
        t = self.committed["totals"]
        self.assertEqual(
            (t["run"], t["dispatches"], t["refused"], t["blocked_events"]),
            (28, 1194, 1158, 1158),
        )
        self.assertEqual(
            (t["without_b_approval"], t["without_b_approval_b_observed"]), (21, 0)
        )
        self.assertEqual(
            (t["with_b_approval"], t["with_b_approval_b_observed_once"]), (6, 5)
        )
        self.assertEqual(
            (t["a_after_only_refusals"], t["a_after_only_refusals_observed"]), (20, 20)
        )
        self.assertEqual(
            (t["latched"], t["raised"], t["most_effects"], t["largest_retry_count"]),
            (0, 0, 1, 600),
        )
        self.assertEqual(
            self.committed["hypotheses"],
            {"R1": True, "R2": False, "R3": True, "R4": True, "R5": True},
        )

    def test_the_sequence_that_fails_r2(self):
        failing = [
            x
            for x in self.rows
            if x["facts"]["b_approval_uses"] and x["facts"]["b_observed"] != 1
        ]
        self.assertEqual([x["position"] for x in failing], [21])
        row = failing[0]
        self.assertEqual(
            [d[2] for d in row["outcome"]["dispatches"]], ["observed", "observed"]
        )
        self.assertEqual(
            (row["outcome"]["effects"], row["outcome"]["reasons"]),
            (1, {"approval_admitted": 1}),
        )

    def test_tokens_signed_with_the_fixture_key_are_refused_for_an_unknown_nonce(self):
        forged = [x for x in self.rows if "fixture operator key" in x["note"]]
        self.assertEqual([x["position"] for x in forged], [11, 12, 13, 25, 26])
        self.assertEqual(sum(x["facts"]["b_observed"] for x in forged), 0)
        replay = sum(
            x["outcome"]["reasons"].get("approval_denied:approval_replay", 0)
            for x in forged
        )
        self.assertEqual(replay, 113)

    def test_the_results_page_is_generated_from_the_report(self):
        page = (ev.DOCS / "RESULTS.md").read_text()
        self.assertIn(self.root, page)
        self.assertIn("1,158 refused, 1,158 `blocked` events", page)
        for row in self.rows:
            self.assertIn(row["note"].replace("|", "\\|"), page)

    @unittest.skipUnless(
        os.environ.get("SIMURGH_REPLAY_19AA") == "1" and ev.host_can_replay(),
        "set SIMURGH_REPLAY_19AA=1 on Linux x86_64 in the hash-locked environment",
    )
    def test_replay_recomputes_the_committed_report(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["totals"], self.committed["totals"])


if __name__ == "__main__":
    unittest.main()
