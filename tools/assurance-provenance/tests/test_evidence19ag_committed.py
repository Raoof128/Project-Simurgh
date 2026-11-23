"""The committed 19ag pack: structure on any host, the full replay on request on Linux x86_64.

The replay takes about twenty minutes on a two-core server. It runs when
SIMURGH_REPLAY_19AG=1 is set on a host that can replay; the hosted suite checks structure.
Rows inherited from lanes 19y, 19z and 19ac depend on the host, so a replay off the host of
record may stop with ``report_mismatch``.
"""

import json
import os
import subprocess
import sys
import unittest
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19ag as ev  # noqa: E402
import guard19ag as m  # noqa: E402
import results19ag as results  # noqa: E402
from retry19aa import sha  # noqa: E402


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())
        cls.rows = cls.report["rows"]
        cls.recorded = [r for r in cls.rows if r["source"] in m.RECORDED]
        cls.fresh = [r for r in cls.rows if r["source"] in m.SEATS]

    def test_structure_verifies(self):
        # The verifier is run as a command, the way an operator runs it. Two seats' files hold
        # bodies nested 1,486 and 1,487 levels deep, a few levels inside the limit of the JSON
        # reader in Python 3.12.0 to 3.12.2. On those versions the check passes from the
        # command line and can fail when called from inside a test runner, where less of the
        # interpreter's stack is left, with ``report_rows``.
        done = subprocess.run(
            [
                sys.executable,
                "-B",
                str(HERE / "evidence19ag.py"),
                "verify",
                str(ev.DOCS / "evidence.zip"),
                "--expected-root",
                self.root,
            ],
            capture_output=True,
            text=True,
            cwd=HERE,
        )
        self.assertEqual(done.returncode, 0, done.stderr[-400:])
        c = json.loads(done.stdout)
        self.assertTrue(c["verified"])
        self.assertEqual(c["kind"], "structure_checked")
        self.assertEqual(c["totals"], self.committed["totals"])
        self.assertEqual(c["hypotheses"], self.committed["hypotheses"])

    def test_how_deep_the_seats_bodies_go(self):
        def depth(raw):
            best = cur = 0
            quoted = escaped = False
            for ch in raw.decode():
                if quoted:
                    if escaped:
                        escaped = False
                    elif ch == "\\":
                        escaped = True
                    elif ch == '"':
                        quoted = False
                elif ch == '"':
                    quoted = True
                elif ch in "[{":
                    cur += 1
                    best = max(best, cur)
                elif ch in "]}":
                    cur -= 1
            return best

        deepest = {
            seat: depth((ev.DOCS / "submissions" / f"{seat}.json").read_bytes())
            for seat in m.SEATS
        }
        self.assertEqual(deepest, {"seat-a": 1486, "seat-b": 1487, "seat-c": 906})

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
            self.assertEqual(sha(given[source]), c["attempt_files"][source], source)

    def test_the_hypotheses_as_published(self):
        self.assertEqual(
            self.committed["hypotheses"],
            {"G0": True, "G1": False, "G2": True, "G3": True, "G4": True, "G5": True},
        )

    def test_what_the_pages_say(self):
        t = self.committed["totals"]
        self.assertEqual((t["run"], t["recorded"], t["fresh"]), (558, 467, 91))
        self.assertEqual((t["full_raised"], t["recorded_guarded_raised"]), (18, 2))
        self.assertEqual(
            (
                t["recorded_not_raised_on_full"],
                t["recorded_not_raised_same_on_guarded"],
            ),
            (449, 449),
        )
        self.assertEqual((t["guarded_unrecorded"], t["guarded_gained"]), (0, 0))
        self.assertEqual(
            (
                t["fresh_without_store_writes"],
                t["fresh_without_store_writes_latched"],
                t["fresh_without_store_writes_raised"],
            ),
            (89, 0, 0),
        )
        self.assertEqual(
            [self.committed["sources"][s]["run"] for s in m.SEATS], [36, 29, 26]
        )
        raised = Counter(
            (r["full"]["raised"], r["guarded"]["raised"])
            for r in self.recorded
            if r["full"]["raised"] or r["guarded"]["raised"]
        )
        self.assertEqual(
            raised,
            {
                ("KeyError", None): 16,
                ("WorkerDied", "WorkerDied"): 1,
                ("ValueError", "ValueError"): 1,
            },
        )
        # every attempt that raised KeyError is one of lane 19ae's seats', and on the guarded
        # gate it is refused where it raised
        was = [r for r in self.recorded if r["full"]["raised"] == "KeyError"]
        self.assertEqual({r["source"] for r in was}, set(m.EARLIER_SEATS))
        self.assertEqual(
            sum(
                sum(d[2] == "blocked" for d in r["guarded"]["dispatches"]) for r in was
            ),
            64,
        )
        self.assertTrue(all(r["guarded"]["effects"] <= 1 for r in self.rows))
        dispatches = [d for r in self.fresh for d in r["guarded"]["dispatches"]]
        self.assertEqual(
            (len(dispatches), sum(d[2] == "blocked" for d in dispatches)), (3302, 2999)
        )
        self.assertEqual(sum(bool(r["guarded"]["latched"]) for r in self.fresh), 1)
        self.assertEqual(sum(r["guarded"]["raised"] is not None for r in self.fresh), 0)

    def test_the_results_page_is_generated_from_the_report(self):
        page = (ev.DOCS / "RESULTS.md").read_text()
        made = results.render(ev.DOCS)
        # The committed page is the generator's output after the Markdown formatter.
        self.assertEqual(results.unformatted(made), results.unformatted(page))
        self.assertIn(self.root, page)
        self.assertIn("same in 449 of 449", page)
        self.assertIn("89 such attempts: latched 0, raised 0", page)
        # The comparison can fail: one changed number on the page is seen.
        changed = page.replace("same in 449 of 449", "same in 448 of 449")
        self.assertNotEqual(results.unformatted(made), results.unformatted(changed))

    def test_the_seats_files_in_the_pack_are_the_committed_ones(self):
        import zipfile

        with zipfile.ZipFile(ev.DOCS / "evidence.zip") as z:
            for seat in m.SEATS:
                self.assertEqual(
                    z.read(ev.member(seat)),
                    (ev.DOCS / "submissions" / f"{seat}.json").read_bytes(),
                    seat,
                )

    def test_the_loose_report_is_the_packs_report(self):
        # The pages and the results generator read the loose file; the verifier reads the pack.
        import zipfile

        with zipfile.ZipFile(ev.DOCS / "evidence.zip") as z:
            self.assertEqual(
                z.read("report.json"), (ev.DOCS / "report.json").read_bytes()
            )

    def test_replay_on_the_host_of_record(self):
        if os.environ.get("SIMURGH_REPLAY_19AG") != "1" or not ev.host_can_replay():
            self.skipTest("set SIMURGH_REPLAY_19AG=1 on Linux x86_64 to replay")
        c = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["hypotheses"], self.committed["hypotheses"])


if __name__ == "__main__":
    unittest.main()
