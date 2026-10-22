import copy
import importlib.util
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class EvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if importlib.util.find_spec("evidence") is None:
            return
        import evidence
        from experiment import execute
        from reproduce import wire

        cls.evidence = evidence
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.rows, cls.files = execute(Path(cls.temp.name) / "matrix")
        cls.report = {
            "schema": "simurgh-phase6-report-v1",
            "protocol_sha256": "a" * 64,
            "protocol_commit": "b" * 40,
            "rows": cls.rows,
            "summary": evidence.summarize(cls.rows),
        }
        cls.files["report.json"] = wire(cls.report)

    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("evidence"), "phase6 evidence missing"
        )

    def test_raw_effects_controller_state_and_exact_inventory_are_bound(self):
        from reproduce import wire

        e = self.evidence
        self.assertEqual(len(e.check_files(self.files)["rows"]), 44)
        for mutation in [
            "omit_row",
            "extra_file",
            "raw_effect",
            "controller_event",
            "duplicate_json",
            "summary",
        ]:
            files = dict(self.files)
            report = copy.deepcopy(self.report)
            if mutation == "omit_row":
                report["rows"].pop()
            elif mutation == "extra_file":
                files["unexplained.txt"] = b"not permitted"
            elif mutation == "raw_effect":
                files["snapshots/authorized-integrated-observed.sqlite"] = files[
                    "snapshots/block_before-integrated-observed.sqlite"
                ]
            elif mutation == "controller_event":
                report["rows"][1]["events"][0]["type"] = "invented"
            elif mutation == "summary":
                report["summary"]["integrated"]["blocked"] = 0
            files["report.json"] = wire(report)
            if mutation == "duplicate_json":
                files["report.json"] = files["report.json"].replace(
                    b'"schema":', b'"schema":"duplicate","schema":', 1
                )
            with (
                self.subTest(mutation=mutation),
                self.assertRaises((ValueError, KeyError)),
            ):
                e.check_files(files)

    def test_all_deterministic_controller_fields_are_verified(self):
        for mutation in ("config", "decisions", "inbox", "lease"):
            files = dict(self.files)
            name = "snapshots/alert_before-integrated-control.sqlite"
            with tempfile.TemporaryDirectory() as d:
                path = Path(d) / "control.sqlite"
                path.write_bytes(files[name])
                with sqlite3.connect(path) as db:
                    if mutation == "config":
                        db.execute("UPDATE config SET payload='{}'")
                    elif mutation == "decisions":
                        db.execute("DELETE FROM decisions")
                    elif mutation == "inbox":
                        db.execute("UPDATE inbox SET digest='forged',alert_id='forged'")
                    else:
                        db.execute("UPDATE state SET lease_until=99999,boot='forged'")
                files[name] = path.read_bytes()
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                self.evidence.check_files(files)

    def test_fresh_replay_rejects_coordinated_trace_and_snapshot_fabrication(self):
        from reproduce import wire, write_pack

        e = self.evidence
        # Protocol freezing is a separate publication requirement, unavailable while
        # developing. Only those two prerequisites are mocked in this unit test.
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(e, "check_protocol", return_value="a" * 64),
            patch.object(e, "committed_protocol"),
        ):
            d = Path(directory)
            root = write_pack(d / "valid.zip", self.files)
            self.assertTrue(e.verify(d / "valid.zip", root)["verified"])
            report = copy.deepcopy(self.report)
            files = dict(self.files)
            row = report["rows"][1]
            row["events"][0]["type"] = "invented"
            name = "snapshots/authorized-integrated-control.sqlite"
            dbpath = d / "control.sqlite"
            dbpath.write_bytes(files[name])
            with sqlite3.connect(dbpath) as db:
                from core import encode

                event = {k: v for k, v in row["events"][0].items() if k != "seq"}
                db.execute("UPDATE events SET payload=? WHERE seq=1", (encode(event),))
                row["storage"]["tables"]["events"][0][1] = encode(event)
            files[name] = dbpath.read_bytes()
            files["report.json"] = wire(report)
            e.check_files(files)
            root = write_pack(d / "tampered.zip", files)
            with self.assertRaisesRegex(ValueError, "fresh_replay_mismatch"):
                e.verify(d / "tampered.zip", root)


if __name__ == "__main__":
    unittest.main()
