"""The committed 19z pack: structure on any host, the full replay on request on Linux x86_64.

The replay starts one process per attempt and gate and takes about three minutes on a
two-core server. It runs when SIMURGH_REPLAY_19Z=1 is set on a host that can replay; the
hosted suite checks structure.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19z as ev  # noqa: E402
import tamper19z as t  # noqa: E402


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())
        cls.rows = cls.report["rows"]

    def test_structure_verifies(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root)
        self.assertIs(c["verified"], True)
        self.assertEqual(c["kind"], "structure_checked")
        for key in (
            "attempt_files",
            "sources",
            "totals",
            "hypotheses",
            "manifest_sha256",
        ):
            self.assertEqual(c[key], self.committed[key], key)

    def test_the_pack_holds_the_committed_files_of_attempts(self):
        given = ev.read_files()
        for source in t.SOURCES:
            self.assertEqual(
                self.committed["attempt_files"][source], t.sha(given[source])
            )
        self.assertEqual(
            json.loads(given["seat-b"]), {"attacker": "seat-b", "attempts": []}
        )

    def test_what_the_committed_receipt_says(self):
        c = self.committed
        self.assertEqual(
            (c["kind"], c["replay"]), ("gate_recomputed", {"result": "verified"})
        )
        self.assertEqual(
            c["sources"],
            {
                "author": {"received": 31, "rejected": 0, "run": 31},
                "seat-a": {"received": 21, "rejected": 0, "run": 21},
                "seat-b": {"received": 0, "rejected": 0, "run": 0},
            },
        )
        self.assertEqual(
            c["totals"],
            {
                "run": 52,
                "open_gained": 13,
                "open_ran_changed": 4,
                "sealed_gained": 0,
                "sealed_ran_changed": 0,
                "sealed_latched": 36,
                "sealed_touched": 36,
                "sealed_latched_untouched": 0,
                "sealed_touched_unlatched": 0,
                "sealed_denied": 37,
            },
        )
        # the seal held; one seat is empty, so Z3 does not hold
        self.assertEqual(
            c["hypotheses"], {"Z0": True, "Z1": True, "Z2": True, "Z3": False}
        )
        self.assertIs(c["model_inference"], False)
        self.assertIs(c["independent_custody"], False)

    def test_no_attempt_gains_on_the_sealed_gate_and_thirteen_do_on_the_open_one(self):
        self.assertEqual(len(self.rows), 52)
        for row in self.rows:
            label = (row["source"], row["position"])
            self.assertIs(row["sealed"]["gained"], False, label)
            self.assertIs(row["sealed"]["ran_changed"], False, label)
            self.assertNotEqual(row["sealed"]["verdicts"].get("b"), "observed", label)
            self.assertLessEqual(row["sealed"]["effects"], 1, label)
            self.assertEqual(
                bool(row["sealed"]["latched"]), bool(row["sealed"]["touched"]), label
            )
            self.assertEqual(row["open"]["latched"], [], label)
        by = {
            s: sum(r["open"]["gained"] for r in self.rows if r["source"] == s)
            for s in t.SOURCES
        }
        self.assertEqual(by, {"author": 7, "seat-a": 6, "seat-b": 0})

    def test_the_one_attempt_that_stops_the_sealed_gate_without_touching_a_file(self):
        raised = [r for r in self.rows if r["sealed"]["raised"] is not None]
        self.assertEqual(len(raised), 1)
        row = raised[0]
        self.assertEqual((row["source"], row["position"]), ("seat-a", 0))
        self.assertEqual(row["sealed"]["raised"], "MemoryError")
        self.assertEqual((row["sealed"]["touched"], row["sealed"]["latched"]), ([], []))
        self.assertIs(row["sealed"]["gained"], False)
        self.assertIs(row["sealed"]["denied"], True)

    def test_the_controls_that_change_nothing_run_as_the_baseline(self):
        base = self.report["summary"]["baseline"]["sealed"]
        quiet = [
            r
            for r in self.rows
            if not r["sealed"]["touched"] and r["sealed"]["raised"] is None
        ]
        self.assertEqual(len(quiet), 15)
        for row in quiet:
            self.assertEqual(row["sealed"]["verdicts"], base["verdicts"])
            self.assertEqual(row["sealed"]["effects"], base["effects"])

    def test_files_beside_the_pack(self):
        self.assertEqual(
            {p.name for p in ev.DOCS.iterdir()},
            {
                "BRIEF.md",
                "README.md",
                "RESULTS.md",
                "ROOT.sha256",
                "attempts-author.json",
                "evidence.zip",
                "protocol.json",
                "receipt.json",
                "report.json",
                "submissions",
            },
        )
        for page in ("README.md", "RESULTS.md"):
            text = (ev.DOCS / page).read_text()
            self.assertIn(self.root, text)
            self.assertNotIn("@@", text)
            self.assertNotIn("/Users/", text)

    @unittest.skipUnless(
        os.environ.get("SIMURGH_REPLAY_19Z") == "1" and ev.host_can_replay(),
        "set SIMURGH_REPLAY_19Z=1 on Linux x86_64 in the hash-locked environment",
    )
    def test_every_attempt_reruns_to_the_same_report(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(c["totals"], self.committed["totals"])


if __name__ == "__main__":
    unittest.main()
