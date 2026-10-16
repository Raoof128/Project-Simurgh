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
        if importlib.util.find_spec("evidence") is None:
            return
        import evidence
        from experiment import execute
        from reproduce import wire

        cls.e = evidence
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.rows, cls.files = execute(Path(cls.temp.name) / "matrix")
        cls.report = {
            "schema": "simurgh-phase7-report-v1",
            "protocol_sha256": "a" * 64,
            "protocol_commit": "b" * 40,
            "rows": cls.rows,
            "summary": evidence.summarize(cls.rows),
        }
        cls.files["report.json"] = wire(cls.report)

    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("evidence"),
            "phase 7 verifier implementation must exist",
        )

    def test_raw_tables_inventory_and_report_are_bound(self):
        from reproduce import wire

        self.assertEqual(len(self.e.check_files(self.files)["rows"]), 36)
        for mutation in (
            "missing_row",
            "extra_row",
            "extra_file",
            "receiver",
            "projection",
            "summary",
            "duplicate_json",
        ):
            report = copy.deepcopy(self.report)
            files = dict(self.files)
            if mutation == "missing_row":
                report["rows"].pop()
            if mutation == "extra_row":
                report["rows"].append(report["rows"][0])
            if mutation == "extra_file":
                files["extra.txt"] = b"forged"
            if mutation == "receiver":
                files["snapshots/honest_resume-integrated-a.sqlite"] = files[
                    "snapshots/omitted_failure-integrated-a.sqlite"
                ]
            if mutation == "projection":
                report["rows"][1]["projection"]["facts"] = []
                report["rows"][1]["projection"]["budget"]["reserved"] = 0
            if mutation == "summary":
                report["summary"]["integrated"]["observed"] = 18
            files["report.json"] = wire(report)
            if mutation == "duplicate_json":
                files["report.json"] = files["report.json"].replace(
                    b'"schema":', b'"schema":"forged","schema":', 1
                )
            with (
                self.subTest(mutation=mutation),
                self.assertRaises((ValueError, KeyError)),
            ):
                self.e.check_files(files)

    def test_every_controller_table_is_bound(self):
        for table in ("attempts", "config", "events", "facts", "grants", "state"):
            files = dict(self.files)
            case = "omitted_failure" if table == "facts" else "honest_resume"
            name = "snapshots/" + case + "-integrated-context.sqlite"
            with tempfile.TemporaryDirectory() as d:
                p = Path(d) / "db.sqlite"
                p.write_bytes(files[name])
                with sqlite3.connect(p) as db:
                    db.execute("DELETE FROM " + table)
                files[name] = p.read_bytes()
            with (
                self.subTest(table=table),
                self.assertRaises((ValueError, KeyError, TypeError)),
            ):
                self.e.check_files(files)

    def test_coordinated_raw_and_report_forgery_fails_fresh_replay(self):
        from experiment import read_storage
        from reproduce import wire, write_pack

        report = copy.deepcopy(self.report)
        files = dict(self.files)
        name = "snapshots/honest_resume-integrated-context.sqlite"
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "db.sqlite"
            p.write_bytes(files[name])
            with sqlite3.connect(p) as db:
                db.execute(
                    "INSERT INTO events(payload) VALUES(?)", ('{"kind":"invented"}',)
                )
            files[name] = p.read_bytes()
            report["rows"][1]["storage"] = read_storage(p)
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

    def test_source_binding_and_protocol_inventory_fail_closed(self):
        from reproduce import wire

        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "protocol.json"
            base = {
                "schema": "simurgh-phase7-protocol-v1",
                "cases": list(self.e.CASES),
                "policies": list(self.e.POLICIES),
                "sources": {"tools/assurance-context/context_gate.py": "0" * 64},
            }
            p.write_bytes(wire(base))
            with patch.object(self.e, "PROTOCOL", p), self.assertRaises(ValueError):
                self.e.check_protocol()
        with self.assertRaises(ValueError):
            self.e.committed_protocol("main")

    def test_standalone_cli_imports(self):
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
