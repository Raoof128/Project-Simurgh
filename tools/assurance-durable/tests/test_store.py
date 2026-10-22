# SPDX-License-Identifier: AGPL-3.0-or-later
import copy
import sqlite3
import tempfile
import unittest
from pathlib import Path

from simurgh_durable.store import Store, initialize

ACTION = {
    "id": "a1",
    "run": "run-1",
    "principal": "alice",
    "tenant": "team-1",
    "operation": "write",
    "resource": "patch",
    "content": "approved",
    "policyRevision": "v1",
}
AUTHORITY = {"revision": "v1", "actions": [ACTION]}


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "store"
        initialize(self.root, AUTHORITY)

    def test_completion_survives_reopen_without_new_effect(self):
        first = Store(self.root).execute(ACTION)
        again = Store(self.root).execute(ACTION)
        self.assertEqual(first["disposition"], "created")
        self.assertTrue(first["effectCreated"])
        self.assertEqual(again["disposition"], "replayed")
        self.assertFalse(again["effectCreated"])
        self.assertEqual(Store(self.root).snapshot()["effects"], [{"action": ACTION}])
        self.assertEqual(len(Store(self.root).receipts()), 1)

    def test_escaped_valid_fields_roundtrip_without_truncated_read(self):
        action = {
            key: value if key in ("operation", "resource") else "\x00" * 256
            for key, value in ACTION.items()
        }
        root = Path(self.temp.name) / "escaped"
        initialize(root, {"revision": action["policyRevision"], "actions": [action]})
        self.assertTrue(Store(root).execute(action)["effectCreated"])
        self.assertEqual(
            Store(root).snapshot(), {"available": True, "effects": [{"action": action}]}
        )
        self.assertFalse(Store(root).execute(action)["effectCreated"])
        path = next((root / "effects").iterdir())
        self.assertGreater(path.stat().st_size, 8193)
        with path.open("ab") as stream:
            stream.write(b"x")
        with self.assertRaisesRegex(ValueError, "effect_conflict"):
            Store(root).execute(action)

    def test_every_binding_and_schema_is_checked_before_effect(self):
        for field in ACTION:
            changed = {**ACTION, field: "changed"}
            self.assertEqual(
                Store(self.root).execute(changed)["status"], "denied", field
            )
        for invalid in (
            None,
            {},
            {**ACTION, "extra": True},
            {**ACTION, "content": ""},
            {**ACTION, "content": "x" * 257},
        ):
            self.assertEqual(Store(self.root).execute(invalid)["status"], "denied")
        self.assertEqual(Store(self.root).snapshot()["effects"], [])
        self.assertEqual(Store(self.root).receipts(), [])

    def test_authority_is_immutable_and_captured(self):
        changed = copy.deepcopy(AUTHORITY)
        changed["actions"][0]["content"] = "later grant"
        with self.assertRaisesRegex(ValueError, "store_not_empty"):
            initialize(self.root, changed)
        self.assertEqual(
            Store(self.root).execute(changed["actions"][0])["status"], "denied"
        )
        self.assertEqual(Store(self.root).execute(ACTION)["status"], "executed")

    def test_missing_or_corrupt_receipted_effect_is_not_reexecuted(self):
        Store(self.root).execute(ACTION)
        path = next((self.root / "effects").iterdir())
        path.write_text("conflict")
        with self.assertRaisesRegex(ValueError, "effect_conflict"):
            Store(self.root).execute(ACTION)
        self.assertFalse(Store(self.root).snapshot()["available"])
        path.unlink()
        with self.assertRaisesRegex(ValueError, "effect_missing"):
            Store(self.root).execute(ACTION)
        self.assertEqual(list((self.root / "effects").iterdir()), [])
        self.assertEqual(len(Store(self.root).receipts()), 1)

    def test_missing_database_is_not_created_on_open(self):
        db = self.root / "state.sqlite3"
        db.unlink()
        with self.assertRaises(sqlite3.OperationalError):
            Store(self.root).execute(ACTION)
        self.assertFalse(db.exists())

    def test_uncommitted_authority_and_duplicate_grants_are_refused(self):
        for authority in (
            {},
            {**AUTHORITY, "actions": [ACTION, ACTION]},
            {**AUTHORITY, "actions": []},
            {**AUTHORITY, "revision": "v2"},
        ):
            with self.assertRaisesRegex(ValueError, "invalid_authority"):
                initialize(Path(self.temp.name) / "invalid", authority)
        self.assertFalse((Path(self.temp.name) / "invalid").exists())

    def test_locked_database_times_out_without_effect(self):
        connection = sqlite3.connect(self.root / "state.sqlite3", isolation_level=None)
        self.addCleanup(connection.close)
        connection.execute("BEGIN IMMEDIATE")
        with self.assertRaisesRegex(sqlite3.OperationalError, "locked"):
            Store(self.root, timeout=0.02).execute(ACTION)
        connection.rollback()
        self.assertEqual(Store(self.root).snapshot()["effects"], [])


if __name__ == "__main__":
    unittest.main()
