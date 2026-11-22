"""The committed 19y pack: structure on any host, the full replay on request on Linux x86_64.

The replay runs 243 attempts against fifteen gates and takes about thirty minutes on a
two-core server, which the hosted suite's time budget does not have room for. It runs when
SIMURGH_REPLAY_19Y=1 is set on a host that can replay; the hosted suite checks structure.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19y as ev  # noqa: E402
import redteam19y as r  # noqa: E402

EMPTY = ("fable-r2", "codex-r2", "astra-r2")
ATTACKED = {"opus-r2": 37, "sonnet-r2": 60, "mythos-r2": 54}
BASELINE = {"b": "blocked", "a": "observed"}


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
        for key in ("submissions", "rounds", "hypotheses", "manifest_sha256"):
            self.assertEqual(c[key], self.committed[key], key)

    def test_the_pack_holds_the_committed_submissions(self):
        for attacker in r.ROUND_TWO:
            raw = (ev.SUBMISSIONS / (attacker + ".json")).read_bytes()
            self.assertEqual(
                self.committed["submissions"]["2"][attacker], r.sha(raw), attacker
            )
        _, first, _ = ev.round_one()
        for attacker in r.ROUND_ONE:
            self.assertEqual(
                self.committed["submissions"]["1"][attacker], r.sha(first[attacker])
            )

    def test_what_the_committed_receipt_says(self):
        c = self.committed
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["replay"], {"result": "verified"})
        one, two = c["rounds"]["1"], c["rounds"]["2"]
        self.assertEqual(
            one["totals"],
            {"run": 92, "before_differs": 49, "repaired_differs": 0, "potent": 26},
        )
        self.assertEqual(one["before_kinds"], {"audit": 39, "raised": 10})
        self.assertEqual(one["repaired_kinds"], {})
        self.assertEqual(
            two["totals"],
            {"run": 151, "before_differs": 44, "repaired_differs": 0, "potent": 29},
        )
        self.assertEqual(two["before_kinds"], {"audit": 32, "raised": 12})
        self.assertEqual(two["repaired_kinds"], {})
        # the repair held in both rounds; three seats are empty, so Y3 does not hold
        self.assertEqual(
            c["hypotheses"], {"Y0": True, "Y1": True, "Y2": True, "Y3": False}
        )
        self.assertIs(c["model_inference"], False)
        self.assertIs(c["independent_custody"], False)
        self.assertRegex(c["tree_state"], r"^[0-9a-f]{40}$")

    def test_the_seats_of_round_two(self):
        seats = self.committed["rounds"]["2"]["attackers"]
        self.assertEqual(set(seats), set(r.ROUND_TWO))
        for name in EMPTY:
            self.assertEqual(
                seats[name],
                {
                    "received": 0,
                    "rejected": 0,
                    "run": 0,
                    "before_differs": 0,
                    "repaired_differs": 0,
                    "potent": 0,
                },
            )
            raw = (ev.SUBMISSIONS / (name + ".json")).read_bytes()
            self.assertEqual(json.loads(raw), {"attacker": name, "attempts": []})
        for name, run in ATTACKED.items():
            self.assertEqual((seats[name]["received"], seats[name]["run"]), (run, run))
            self.assertEqual(seats[name]["rejected"], 0)
            self.assertEqual(seats[name]["repaired_differs"], 0)
        self.assertEqual(
            {name: seats[name]["before_differs"] for name in ATTACKED},
            {"opus-r2": 10, "sonnet-r2": 16, "mythos-r2": 18},
        )
        self.assertEqual(
            {name: seats[name]["potent"] for name in ATTACKED},
            {"opus-r2": 5, "sonnet-r2": 13, "mythos-r2": 11},
        )

    def test_this_run_saw_on_the_old_gate_what_19t_recorded(self):
        _, _, record = ev.round_one()
        mine = {
            (x["attacker"], x["position"]): x["before"]
            for x in self.rows
            if x["round"] == 1
        }
        self.assertEqual(len(mine), 92)
        for x in record:
            self.assertEqual(mine[(x["attacker"], x["position"])], x["clean"])
        self.assertEqual(
            self.report["hypotheses"]["Y0"],
            {"recorded": 92, "run": 92, "same": 92, "holds": True},
        )

    def test_no_attempt_of_either_round_changes_the_repaired_gate(self):
        self.assertEqual(len(self.rows), 243)
        for row in self.rows:
            label = (row["round"], row["attacker"], row["position"])
            self.assertEqual(
                row["repaired"],
                {
                    "differs": False,
                    "kinds": [],
                    "raised": None,
                    "verdicts": BASELINE,
                    "effects": 1,
                },
                label,
            )

    def test_what_the_same_attempts_do_to_the_gate_as_it_was(self):
        raised = sorted(
            (x["round"], x["before"]["raised"])
            for x in self.rows
            if x["before"]["raised"] is not None
        )
        self.assertEqual(
            raised,
            [(1, "ProgrammingError")] * 7
            + [(1, "UnicodeEncodeError")] * 3
            + [(2, "ProgrammingError")] * 2
            + [(2, "UnicodeEncodeError")] * 10,
        )
        for row in self.rows:
            if row["before"]["raised"] is None:
                self.assertEqual(row["before"]["verdicts"], BASELINE)
                self.assertEqual(row["before"]["effects"], 1)
                self.assertIn(row["before"]["kinds"], ([], ["audit"]))

    def test_potent_attempts_change_naive_gates_and_not_the_repaired_one(self):
        potent = [x for x in self.rows if x["potent"]]
        self.assertEqual(len(potent), 55)
        for row in potent:
            self.assertTrue(row["mutants_changed"])
            self.assertIs(row["repaired"]["differs"], False)
        two = {m for x in potent if x["round"] == 2 for m in x["mutants_changed"]}
        self.assertEqual(len(two), r.MUTANTS)
        # with the repair mixed into the naive gates, changing one is never only the old audit
        self.assertEqual(
            sum(bool(x["mutants_changed"]) for x in self.rows), len(potent)
        )

    def test_files_beside_the_pack(self):
        names = {p.name for p in ev.DOCS.iterdir()}
        self.assertEqual(
            names,
            {
                "BRIEF.md",
                "README.md",
                "RESULTS.md",
                "ROOT.sha256",
                "evidence.zip",
                "protocol.json",
                "receipt.json",
                "report.json",
                "submissions",
            },
        )
        self.assertEqual(
            {p.name for p in ev.SUBMISSIONS.iterdir()},
            {a + ".json" for a in r.ROUND_TWO},
        )
        results = (ev.DOCS / "RESULTS.md").read_text()
        self.assertIn(self.root, results)
        self.assertIn(self.root, (ev.DOCS / "README.md").read_text())
        for page in ("README.md", "RESULTS.md"):
            text = (ev.DOCS / page).read_text()
            self.assertNotIn("@@", text)
            self.assertNotIn("/Users/", text)

    @unittest.skipUnless(
        os.environ.get("SIMURGH_REPLAY_19Y") == "1" and ev.host_can_replay(),
        "set SIMURGH_REPLAY_19Y=1 on Linux x86_64 in the hash-locked environment",
    )
    def test_every_attempt_reruns_to_the_same_report(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["rounds"], self.committed["rounds"])


if __name__ == "__main__":
    unittest.main()
