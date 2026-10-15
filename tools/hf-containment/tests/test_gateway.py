import socket
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gateway import PUBLIC, Gateway


class GatewayTests(unittest.TestCase):
    def test_revocation_is_read_again_from_durable_registry(self):
        with tempfile.TemporaryDirectory() as temporary:
            gateway = Gateway(Path(temporary), True, "useful_report")
            self.assertEqual(len(set(gateway.tokens.values())), 6)
            connection = socket.create_connection(gateway.address)
            try:
                request = {
                    "token": gateway.tokens["valid"],
                    "run": "run-a",
                    "tenant": "tenant-a",
                    "op": "report",
                    "body": PUBLIC,
                }
                self.assertTrue(gateway.handle(request)["ok"])
                with sqlite3.connect(gateway.db) as db:
                    db.execute(
                        "UPDATE grants SET revoked=1 WHERE token=?", (request["token"],)
                    )
                self.assertEqual(
                    gateway.handle(request), {"ok": False, "reason": "revoked"}
                )
                self.assertEqual(
                    gateway.handle({**request, "tenant": "tenant-b"})["reason"],
                    "connection_identity",
                )
                self.assertEqual(
                    gateway.handle({**request, "token": "invented-token"})["reason"],
                    "unknown_token",
                )
                self.assertEqual(
                    gateway.handle({**request, "token": []})["reason"], "schema"
                )
            finally:
                connection.close()
                gateway.close()


if __name__ == "__main__":
    unittest.main()
