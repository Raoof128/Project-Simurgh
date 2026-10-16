import copy
import importlib.util
import sqlite3
import subprocess
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
        spec = importlib.util.find_spec("evidence")
        if spec is None or Path(spec.origin) != HERE / "evidence.py":
            return
        import evidence
        from experiment import execute
        from reproduce import wire

        cls.e = evidence
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.rows, cls.files = execute(Path(cls.temp.name) / "matrix")
        cls.report = {
            "schema": "simurgh-phase9-report-v1",
            "protocol_sha256": "a" * 64,
            "protocol_commit": "b" * 40,
            "rows": cls.rows,
            "summary": evidence.summarize(cls.rows),
        }
        cls.files["report.json"] = wire(cls.report)

    def setUp(self):
        spec = importlib.util.find_spec("evidence")
        self.assertTrue(
            spec is not None and Path(spec.origin) == HERE / "evidence.py",
            "composed evidence verifier must exist",
        )

    def test_report_raw_inventory_and_summary_bound(self):
        from reproduce import wire

        self.assertEqual(len(self.e.check_files(self.files)["rows"]), 40)
        for change in (
            "missing_row",
            "extra_file",
            "summary",
            "raw_effect",
            "raw_gateway",
            "duplicate_json",
        ):
            report = copy.deepcopy(self.report)
            files = dict(self.files)
            if change == "missing_row":
                report["rows"].pop()
            if change == "extra_file":
                files["unexplained.txt"] = b"no"
            if change == "summary":
                report["summary"]["composed"]["observed"] = 0
            if change == "raw_effect":
                files["snapshots/authorized_child-composed-service.sqlite"] = files[
                    "snapshots/credential_revoke-composed-service.sqlite"
                ]
            if change == "raw_gateway":
                report["rows"][1]["held"] = True
            files["report.json"] = wire(report)
            if change == "duplicate_json":
                files["report.json"] = files["report.json"].replace(
                    b'"schema":', b'"schema":"fake","schema":', 1
                )
            with self.subTest(change=change), self.assertRaises((ValueError, KeyError)):
                self.e.check_files(files)

    def test_all_raw_tables_bound(self):
        from experiment import TABLES

        for kind, tables in TABLES.items():
            for table in tables:
                files = dict(self.files)
                name = "snapshots/authorized_child-composed-" + kind + ".sqlite"
                with tempfile.TemporaryDirectory() as d:
                    path = Path(d) / "db.sqlite"
                    path.write_bytes(files[name])
                    with sqlite3.connect(path) as db:
                        if db.execute("SELECT count(*) FROM " + table).fetchone()[0]:
                            db.execute("DELETE FROM " + table)
                        else:
                            db.execute(
                                "ALTER TABLE " + table + " ADD COLUMN injected TEXT"
                            )
                    files[name] = path.read_bytes()
                with (
                    self.subTest(kind=kind, table=table),
                    self.assertRaises((ValueError, KeyError, TypeError)),
                ):
                    self.e.check_files(files)

    def test_coordinated_forgery_rejected_by_fresh_replay(self):
        from experiment import observe
        from reproduce import wire, write_pack

        report = copy.deepcopy(self.report)
        files = dict(self.files)
        prefix = "snapshots/authorized_child-composed-"
        with tempfile.TemporaryDirectory() as d:
            from experiment import TABLES

            paths = {k: Path(d) / (k + ".sqlite") for k in TABLES}
            for k, p in paths.items():
                p.write_bytes(files[prefix + k + ".sqlite"])
            with sqlite3.connect(paths["service"]) as db:
                db.execute("INSERT INTO events(kind,payload) VALUES('invented','{}')")
            files[prefix + "service.sqlite"] = paths["service"].read_bytes()
            report["rows"][1].update(observe(paths))
            files["report.json"] = wire(report)
            self.e.check_files(files)
            pack = Path(d) / "pack.zip"
            root = write_pack(pack, files)
            with (
                patch.object(self.e, "check_protocol", return_value="a" * 64),
                patch.object(self.e, "committed_protocol"),
                self.assertRaisesRegex(ValueError, "fresh_replay"),
            ):
                self.e.verify(pack, root)

    def test_protocol_source_omissions_and_cli(self):
        from reproduce import wire

        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "protocol.json"
            path.write_bytes(
                wire(
                    {
                        "schema": "simurgh-phase9-protocol-v1",
                        "cases": list(self.e.CASES),
                        "policies": list(self.e.POLICIES),
                        "sources": {},
                    }
                )
            )
            with patch.object(self.e, "PROTOCOL", path), self.assertRaises(ValueError):
                self.e.check_protocol()
        with self.assertRaises(ValueError):
            self.e.committed_protocol("main")
        result = subprocess.run(
            [sys.executable, "-B", str(HERE / "evidence.py"), "--help"],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("verify", result.stdout)


if __name__ == "__main__":
    unittest.main()
