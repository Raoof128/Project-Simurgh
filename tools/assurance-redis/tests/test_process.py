# SPDX-License-Identifier: AGPL-3.0-or-later
import fcntl
import tempfile
import unittest
from pathlib import Path

from simurgh_redis.connector import Connector, initialize
from simurgh_redis.service import RedisService
from simurgh_redis.transport import request
from simurgh_redis.worker import run_workers
from test_connector import ACTION, AUTHORITY


class ProcessTests(unittest.TestCase):
    def test_eight_processes_create_one_service_record(self):
        with tempfile.TemporaryDirectory(prefix="sr-race-") as directory:
            root = Path(directory) / "ledger"
            initialize(root, AUTHORITY)
            with RedisService(Path(directory) / "redis") as service:
                rows = run_workers(root, service.socket, [ACTION] * 8)
                self.assertEqual(len({row["pid"] for row in rows}), 8)
                self.assertEqual(sum(row["result"]["effectCreated"] for row in rows), 1)
                self.assertEqual(request(service.socket, ["DBSIZE"]), 1)
                self.assertEqual(
                    Connector(root, service.socket).ledger(),
                    {"intents": 1, "receipts": 1},
                )

    def test_lock_timeout_cannot_send_or_add_an_intent(self):
        with tempfile.TemporaryDirectory(prefix="sr-lock-") as directory:
            root = Path(directory) / "ledger"
            initialize(root, AUTHORITY)
            with (root / "connector.lock").open("w") as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                result = Connector(root, "/nonexistent.sock", timeout=0.02).execute(
                    ACTION
                )
                self.assertEqual(result["outcome"], "unknown")
            self.assertEqual(
                Connector(root, "/nonexistent.sock").ledger(),
                {"intents": 0, "receipts": 0},
            )


if __name__ == "__main__":
    unittest.main()
