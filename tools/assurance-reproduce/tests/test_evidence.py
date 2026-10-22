import hashlib
import importlib.util
import json
import sqlite3
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("reproduce"), "phase4 runner missing"
        )
        import observer
        import reproduce

        self.r, self.o = reproduce, observer
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def database(self, name="source.sqlite", effects=None):
        path = self.root / name
        with sqlite3.connect(path) as db:
            db.execute(
                "CREATE TABLE inbox(key TEXT PRIMARY KEY, payload TEXT NOT NULL)"
            )
            for index, effect in enumerate(effects or []):
                db.execute(
                    "INSERT INTO inbox VALUES (?, ?)",
                    (f"{index:064x}", json.dumps(effect)),
                )
        return path

    def fixture(self):
        effect = {
            "id": "r1",
            "run": "run1",
            "principal": "p1",
            "tenant": "t1",
            "content": "synthetic evidence",
        }
        source = self.database(effects=[effect])
        with sqlite3.connect(source) as db:
            key = hashlib.sha256(
                json.dumps(
                    {k: effect[k] for k in ("id", "run", "principal", "tenant")},
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode()
            ).hexdigest()
            db.execute("UPDATE inbox SET key=?", (key,))
        snapshot = self.root / "snapshot.sqlite"
        observed = self.o.snapshot(source, snapshot)
        steps = [
            {
                "case": "case-1",
                "trial": 0,
                "control": "enforced",
                "index": 0,
                "effects": [effect],
            }
        ]
        records = [
            {**steps[0], "witness": "witnesses/000000.sqlite", "keys": observed["keys"]}
        ]
        baseline = {"summary": {"useful": 1}}
        files = {
            "witnesses/000000.sqlite": snapshot.read_bytes(),
            "observations.json": self.r.wire(records),
            "report.json": self.r.wire(baseline),
            "metadata.json": self.r.wire({"schema": "simurgh-phase4-run-v1"}),
        }
        return files, steps, baseline

    def test_snapshot_is_readonly_and_preserves_empty_and_nonempty_effects(self):
        source = self.database(effects=[{"content": "approved"}])
        original = source.read_bytes()
        target = self.root / "observed.sqlite"
        result = self.o.snapshot(source, target)
        self.assertEqual(result["effects"], [{"content": "approved"}])
        self.assertEqual(source.read_bytes(), original)
        self.assertEqual(self.o.read_database(target), result)
        with self.assertRaises(FileExistsError):
            self.o.snapshot(source, target)
        empty = self.database("empty.sqlite")
        self.assertEqual(self.o.read_database(empty), {"effects": [], "keys": []})

    def test_missing_corrupt_or_wrong_schema_is_never_empty_success(self):
        missing = self.root / "missing.sqlite"
        with self.assertRaises((ValueError, OSError, sqlite3.DatabaseError)):
            self.o.read_database(missing)
        self.assertFalse(missing.exists())
        missing.write_bytes(b"not a database")
        with self.assertRaises((ValueError, sqlite3.DatabaseError)):
            self.o.read_database(missing)
        path = self.root / "wrong.sqlite"
        with sqlite3.connect(path) as db:
            db.execute("CREATE VIEW inbox AS SELECT 1 AS key, 2 AS payload")
        with self.assertRaises(ValueError):
            self.o.read_database(path)

    def test_complete_pack_has_exact_root_and_raw_effects(self):
        files, steps, baseline = self.fixture()
        path = self.root / "evidence.zip"
        root = self.r.write_pack(path, files)
        loaded = self.r.read_pack(path, root)
        self.assertEqual(loaded, files)
        self.r.check_evidence(loaded, steps, baseline)
        with self.assertRaises(FileExistsError):
            self.r.write_pack(path, files)
        with self.assertRaisesRegex(ValueError, "root"):
            self.r.read_pack(path, "0" * 64)

    def test_omitted_extra_duplicate_or_invented_observations_refuse(self):
        files, steps, baseline = self.fixture()
        original = json.loads(files["observations.json"])
        variants = [
            [],
            original * 2,
            [{**original[0], "case": "invented"}],
            [{**original[0], "effects": []}],
            [{**original[0], "keys": []}],
        ]
        for records in variants:
            with self.subTest(records=records):
                changed = {**files, "observations.json": self.r.wire(records)}
                with self.assertRaises(ValueError):
                    self.r.check_evidence(changed, steps, baseline)
        with self.assertRaises(ValueError):
            self.r.check_evidence(
                {k: v for k, v in files.items() if not k.startswith("witnesses/")},
                steps,
                baseline,
            )
        with self.assertRaises(ValueError):
            self.r.check_evidence({**files, "extra.txt": b"extra"}, steps, baseline)
        with self.assertRaises(ValueError):
            self.r.check_evidence(files, [], baseline)
        with self.assertRaises(ValueError):
            self.r.check_evidence(files, steps, {"summary": "invented"})

    def test_database_edit_or_truncation_refuses_even_with_resealed_manifest(self):
        files, steps, baseline = self.fixture()
        for data in (
            b"",
            b"SQLite format 3\x00",
            self.database("empty.sqlite").read_bytes(),
        ):
            with self.subTest(length=len(data)):
                changed = {**files, "witnesses/000000.sqlite": data}
                path = self.root / f"bad-{len(data)}.zip"
                digest = self.r.write_pack(path, changed)
                with self.assertRaises((ValueError, sqlite3.DatabaseError)):
                    self.r.check_evidence(
                        self.r.read_pack(path, digest), steps, baseline
                    )

    def test_archive_inventory_hash_and_duplicate_path_are_checked(self):
        files, _, _ = self.fixture()
        original = self.root / "valid.zip"
        root = self.r.write_pack(original, files)
        with zipfile.ZipFile(original) as z:
            members = {name: z.read(name) for name in z.namelist()}
        changes = [
            dict(list(members.items())[1:]),
            {**members, "extra": b"bad"},
            {**members, "report.json": b"{}"},
            {**members, "../escape": b"x"},
        ]
        for i, changed in enumerate(changes):
            path = self.root / f"archive-{i}.zip"
            with zipfile.ZipFile(path, "w") as z:
                for name, value in changed.items():
                    z.writestr(name, value)
            with self.assertRaises((ValueError, KeyError)):
                self.r.read_pack(path, root)
        path = self.root / "duplicate.zip"
        with zipfile.ZipFile(path, "w") as z:
            for name, value in members.items():
                z.writestr(name, value)
            import warnings

            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                z.writestr("report.json", b"{}")
        with self.assertRaises(ValueError):
            self.r.read_pack(path, root)

    def test_invented_receipt_key_refuses_even_when_database_and_journal_agree(self):
        files, steps, baseline = self.fixture()
        path = self.root / "forged.sqlite"
        path.write_bytes(files["witnesses/000000.sqlite"])
        with sqlite3.connect(path) as db:
            db.execute("UPDATE inbox SET key=?", ("f" * 64,))
        records = json.loads(files["observations.json"])
        records[0]["keys"] = ["f" * 64]
        files["observations.json"] = self.r.wire(records)
        files["witnesses/000000.sqlite"] = path.read_bytes()
        with self.assertRaisesRegex(ValueError, "receipt_binding"):
            self.r.check_evidence(files, steps, baseline)

    def test_sqlite_prefix_lookalike_table_cannot_hide_from_schema_check(self):
        files, steps, baseline = self.fixture()
        path = self.root / "hidden.sqlite"
        path.write_bytes(files["witnesses/000000.sqlite"])
        with sqlite3.connect(path) as db:
            db.execute("CREATE TABLE sqliteXhidden(secret TEXT)")
            db.execute("INSERT INTO sqliteXhidden VALUES ('synthetic hidden data')")
        files["witnesses/000000.sqlite"] = path.read_bytes()
        with self.assertRaisesRegex(ValueError, "database_schema"):
            self.r.check_evidence(files, steps, baseline)

    def test_duplicate_json_keys_and_nonfinite_numbers_refuse(self):
        for data in (b'{"a":1,"a":2}', b'{"value":NaN}', b'{"value":Infinity}'):
            with self.assertRaises(ValueError):
                self.r.decode(data)


if __name__ == "__main__":
    unittest.main()
