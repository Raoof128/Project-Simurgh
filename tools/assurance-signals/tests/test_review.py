"""Fresh-review regressions, each reproduced before repair."""

import concurrent.futures
import sqlite3
import subprocess
import sys
import threading
import unittest
from contextlib import contextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import test_signals as fixtures


class ReviewTests(unittest.TestCase):
    setUp = fixtures.SignalsTests.setUp
    activate = fixtures.SignalsTests.activate
    token = fixtures.SignalsTests.token

    def delayed(self, operation):
        attempt = threading.Event()
        original_db = self.gate.db

        @contextmanager
        def delayed_db():
            attempt.set()
            with original_db() as db:
                yield db

        self.gate.db = delayed_db
        lock = sqlite3.connect(self.gate.path)
        lock.execute("BEGIN IMMEDIATE")
        try:
            with concurrent.futures.ThreadPoolExecutor(1) as pool:
                future = pool.submit(operation)
                try:
                    self.assertTrue(attempt.wait(5))
                    self.now = 131.0
                finally:
                    lock.rollback()
                return future.result(timeout=5)
        finally:
            lock.close()
            self.gate.db = original_db

    def test_dispatch_rechecks_clock_after_waiting_for_admission_lock(self):
        self.activate()
        self.now = 129.0
        self.assertEqual(
            self.delayed(lambda: self.gate.dispatch(self.action))["status"], "blocked"
        )
        self.assertTrue(self.gate.state()["paused"])

    def test_restart_checks_expiry_after_acquiring_lock(self):
        self.gate.heartbeat()
        token = self.token()
        self.now = 129.0
        self.assertFalse(self.delayed(lambda: self.gate.restart(token)))

    def test_heartbeat_expiry_and_lease_start_follow_transaction_time(self):
        self.activate()
        self.now = 129.0
        self.delayed(self.gate.heartbeat)
        self.assertTrue(self.gate.state()["paused"])
        with sqlite3.connect(self.gate.path) as db:
            self.assertEqual(
                db.execute("SELECT lease_until FROM state").fetchone()[0], 161.0
            )

    def test_unused_restart_approval_cannot_cross_boots(self):
        self.gate.heartbeat()
        old = self.token()
        new = self.Gate(
            self.root / "gate.sqlite", self.host, **{**self.kw, "boot_id": "new-boot"}
        )
        new.heartbeat()
        self.assertFalse(new.restart(old))
        self.assertTrue(new.state()["paused"])

    def test_cli_bootstraps_dependencies_in_fresh_interpreter(self):
        result = subprocess.run(
            [
                sys.executable,
                "-B",
                str(Path(__file__).parents[1] / "evidence.py"),
                "--help",
            ],
            capture_output=True,
            check=False,
            text=True,
            timeout=15,
            env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("verify", result.stdout)


if __name__ == "__main__":
    unittest.main()
