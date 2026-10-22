# SPDX-License-Identifier: AGPL-3.0-or-later
import tempfile
import unittest
from pathlib import Path

from simurgh_redis.connector import Connector, initialize
from simurgh_redis.service import RedisService
from simurgh_redis.transport import DropReply, request

ACTION = {
    "id": "a1",
    "run": "r1",
    "principal": "alice",
    "tenant": "team",
    "operation": "write",
    "resource": "patch",
    "content": "approved",
    "policyRevision": "v1",
}
AUTHORITY = {"revision": "v1", "actions": [ACTION]}


class ConnectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="sc-test-")
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.service = RedisService(self.directory / "redis")
        self.service.start()
        self.addCleanup(self.service.close)
        self.root = self.directory / "ledger"
        initialize(self.root, AUTHORITY)
        self.connector = Connector(self.root, self.service.socket)

    def test_actual_service_and_idempotent_cached_completion(self):
        self.assertEqual(request(self.service.socket, ["PING"]), b"PONG")
        first = self.connector.execute(ACTION)
        again = Connector(self.root, self.service.socket).execute(ACTION)
        self.assertEqual(first["disposition"], "created")
        self.assertEqual(again["disposition"], "replayed")
        self.assertFalse(again["effectCreated"])
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 1)
        self.assertEqual(self.connector.observe()["effects"], [{"action": ACTION}])
        self.assertEqual(self.connector.ledger(), {"intents": 1, "receipts": 1})

    def test_lost_reply_after_real_set_recovers_using_get_only(self):
        with DropReply(self.service.socket) as proxy:
            result = Connector(self.root, proxy.socket).execute(ACTION)
        self.assertEqual(proxy.reply, b"OK")
        self.assertEqual(proxy.command[0], b"SET")
        self.assertEqual(result["outcome"], "unknown")
        self.assertIsNone(result["effectCreated"])
        self.assertEqual(self.connector.ledger(), {"intents": 1, "receipts": 0})
        self.assertEqual(len(self.connector.observe()["effects"]), 1)
        with DropReply(self.service.socket, forward=True) as proxy:
            recovered = Connector(self.root, proxy.socket).execute(ACTION)
        self.assertEqual(proxy.command[0], b"GET")
        self.assertEqual(recovered["disposition"], "recovered")
        self.assertFalse(recovered["effectCreated"])
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 1)

    def test_disconnect_before_send_stays_unknown_without_false_retry(self):
        with DropReply(self.service.socket, before_send=True) as proxy:
            result = Connector(self.root, proxy.socket).execute(ACTION)
        self.assertIsNone(proxy.reply)
        self.assertEqual(result["outcome"], "unknown")
        retried = self.connector.execute(ACTION)
        self.assertEqual(retried["outcome"], "unknown")
        self.assertEqual(retried["reason"], "pending_effect_absent")
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)
        self.assertEqual(self.connector.ledger(), {"intents": 1, "receipts": 0})

    def test_binding_changes_and_malformed_actions_never_reach_service(self):
        for field in ACTION:
            result = Connector(self.root, self.directory / "nonexistent.sock").execute(
                {**ACTION, field: "changed"}
            )
            self.assertEqual(result["status"], "denied")
        self.assertEqual(
            self.connector.execute({**ACTION, "extra": True})["status"], "denied"
        )
        self.assertEqual(self.connector.ledger(), {"intents": 0, "receipts": 0})
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)

    def test_missing_and_conflicting_completed_keys_are_not_recreated(self):
        self.connector.execute(ACTION)
        key = self.connector.key(ACTION)
        request(self.service.socket, ["SET", key, b"conflict"])
        self.assertEqual(self.connector.execute(ACTION)["reason"], "effect_conflict")
        self.assertFalse(self.connector.observe()["available"])
        request(self.service.socket, ["DEL", key])
        self.assertEqual(
            self.connector.execute(ACTION)["reason"], "completed_effect_missing"
        )
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)
        self.assertFalse(self.connector.observe()["available"])

    def test_server_kill_restart_retains_the_effect_and_receipt(self):
        self.connector.execute(ACTION)
        self.assertEqual(self.service.kill(), -9)
        self.assertEqual(self.connector.execute(ACTION)["outcome"], "unknown")
        self.service.start()
        self.assertEqual(self.connector.execute(ACTION)["disposition"], "replayed")
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 1)

    def test_non_idempotent_control_really_duplicates(self):
        with (
            DropReply(self.service.socket) as proxy,
            self.assertRaises((OSError, ValueError)),
        ):
            request(proxy.socket, ["RPUSH", "control", "effect"])
        self.assertEqual(proxy.reply, 1)
        self.assertEqual(
            request(self.service.socket, ["RPUSH", "control", "effect"]), 2
        )
        self.assertEqual(request(self.service.socket, ["LLEN", "control"]), 2)


if __name__ == "__main__":
    unittest.main()
