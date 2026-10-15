# SPDX-License-Identifier: AGPL-3.0-or-later
import signal
import tempfile
import unittest
from pathlib import Path

from simurgh_durable.process import run_workers
from simurgh_durable.store import CRASH_POINTS, Store, initialize
from test_store import ACTION, AUTHORITY


class ProcessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "store"
        initialize(self.root, AUTHORITY)

    def test_each_kill_boundary_and_fresh_retry_inspects_real_effects(self):
        for point in CRASH_POINTS:
            with self.subTest(point=point):
                root = Path(self.temp.name) / point
                initialize(root, AUTHORITY)
                killed = run_workers(root, [{"action": ACTION, "crashAt": point}])[0]
                self.assertEqual(killed["returncode"], -signal.SIGKILL)
                self.assertIsNone(killed["result"])
                before = Store(root).snapshot()
                self.assertTrue(before["available"])
                self.assertEqual(len(before["effects"]), int(point != "before_publish"))
                self.assertEqual(
                    len(Store(root).receipts()), int(point == "after_commit")
                )
                retry = run_workers(root, [{"action": ACTION}])[0]
                self.assertNotEqual(killed["pid"], retry["pid"])
                self.assertEqual(retry["returncode"], 0)
                expected = (
                    "created"
                    if point == "before_publish"
                    else "replayed"
                    if point == "after_commit"
                    else "recovered"
                )
                self.assertEqual(retry["result"]["disposition"], expected)
                self.assertEqual(len(Store(root).snapshot()["effects"]), 1)
                self.assertEqual(len(Store(root).receipts()), 1)

    def test_eight_simultaneous_workers_create_once(self):
        results = run_workers(self.root, [{"action": ACTION} for _ in range(8)])
        self.assertEqual(len({r["pid"] for r in results}), 8)
        self.assertTrue(all(r["returncode"] == 0 for r in results))
        self.assertEqual(sum(r["result"]["effectCreated"] for r in results), 1)
        self.assertEqual(len(Store(self.root).snapshot()["effects"]), 1)
        self.assertEqual(len(Store(self.root).receipts()), 1)

    def test_changed_retry_after_crash_cannot_recover_different_arguments(self):
        killed = run_workers(
            self.root, [{"action": ACTION, "crashAt": "after_publish"}]
        )[0]
        self.assertEqual(killed["returncode"], -signal.SIGKILL)
        changed = {**ACTION, "content": "substituted"}
        result = run_workers(self.root, [{"action": changed}])[0]
        self.assertEqual(result["returncode"], 0)
        self.assertEqual(result["result"]["status"], "denied")
        self.assertEqual(Store(self.root).receipts(), [])
        self.assertEqual(Store(self.root).snapshot()["effects"], [{"action": ACTION}])

    def test_unknown_operation_and_corrupt_database_fail_closed(self):
        result = run_workers(self.root, [{"action": ACTION, "authority": AUTHORITY}])[0]
        self.assertEqual(result["returncode"], 1)
        self.assertEqual(result["result"]["status"], "error")
        (self.root / "state.sqlite3").write_bytes(b"not a database")
        result = run_workers(self.root, [{"action": ACTION}])[0]
        self.assertEqual(result["returncode"], 1)
        self.assertEqual(result["result"]["status"], "error")
        self.assertFalse(Store(self.root).snapshot()["available"])
        self.assertEqual(list((self.root / "effects").iterdir()), [])


if __name__ == "__main__":
    unittest.main()
