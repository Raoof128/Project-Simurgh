"""Reject coordinated retained-state inconsistencies found in whole-change review."""

import copy
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from reliability import run_case
from reliability_deps import observe
from reliability_evidence import check_rows


class RetainedConsistencyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def fixture(self, case):
        self.case = case
        self.directory = self.root / case
        self.row, self.files = run_case(case, 0, "composed", self.directory)
        self.check(self.row)

    def check(self, row):
        check_rows([row], self.files, inventory=[(self.case, 0, "composed")])

    def mutate_database(self, kind, sql):
        path = self.directory / "controls" / (kind + ".sqlite")
        with sqlite3.connect(path) as db:
            db.execute(sql)
        self.row.update(observe(self.directory))
        self.files[f"snapshots/{self.case}-0-composed-{kind}.sqlite"] = (
            path.read_bytes()
        )

    def test_per_route_winner_cannot_be_swapped(self):
        self.fixture("parallel_siblings")
        bad = copy.deepcopy(self.row)
        for call in bad["calls"]:
            call["native"]["status"] = (
                "blocked" if call["native"]["status"] == "observed" else "observed"
            )
        with self.assertRaises(ValueError):
            self.check(bad)

    def test_unknown_reservation_cannot_be_refunded(self):
        self.fixture("lost_ack_reopen")
        self.mutate_database("context", "DELETE FROM attempts")
        with self.assertRaises(ValueError):
            self.check(self.row)

    def test_interrupted_update_requires_durable_event_sequence(self):
        self.fixture("update_process_kill")
        self.mutate_database("pipeline", "DELETE FROM events")
        with self.assertRaises(ValueError):
            self.check(self.row)

    def test_kill_must_finish_before_queued_final_work(self):
        self.fixture("update_process_kill")
        end = max(c["finished"] for c in self.row["calls"])
        self.row["transition"] = {"start": end + 1, "end": end + 2, "exit_code": -9}
        with self.assertRaises(ValueError):
            self.check(self.row)

    def test_stop_cannot_have_active_signal_state(self):
        self.fixture("queued_stop")
        # Use the exact active state from an otherwise valid fixture.
        other, _ = run_case("authorized_reopen", 0, "composed", self.root / "active")
        path = self.directory / "controls/a-signal.sqlite"
        with sqlite3.connect(path) as db:
            db.execute("DELETE FROM state")
            db.execute(
                "INSERT INTO state VALUES(?,?,?,?,?,?)",
                other["storage"]["a-signal"]["tables"]["state"][0],
            )
        self.row.update(observe(self.directory))
        self.files["snapshots/queued_stop-0-composed-a-signal.sqlite"] = (
            path.read_bytes()
        )
        with self.assertRaises(ValueError):
            self.check(self.row)


if __name__ == "__main__":
    unittest.main()
