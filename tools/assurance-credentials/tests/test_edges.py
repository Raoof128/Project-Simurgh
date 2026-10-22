"""Failure-boundary checks beyond the scripted publication matrix."""

import json
import sqlite3
import subprocess
import sys
import threading
import time
import unittest
from dataclasses import asdict

import test_gateway as fixtures
import test_service as data


class EdgeTests(unittest.TestCase):
    def fresh(self):
        fixture = fixtures.GatewayTests()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        return fixture

    def test_revoke_waits_for_admitted_dispatch_across_gateway_instances(self):
        t = self.fresh()
        with sqlite3.connect(t.service.path) as db:
            db.execute("UPDATE state SET policy='session_snapshot'")
        entered, release, revoked = (
            threading.Event(),
            threading.Event(),
            threading.Event(),
        )
        results = {}

        class PausedClient:
            binding = t.client.binding

            def send(self, action):
                entered.set()
                if not release.wait(5):
                    raise TimeoutError("test barrier")
                return t.client.send(action)

        sender = t.Gateway(t.path / "gate.sqlite", PausedClient())
        stopper = t.Gateway(t.path / "gate.sqlite", t.client)

        def revoke(cid):
            reply = t.service.revoke(cid)
            revoked.set()
            return reply

        dispatch = threading.Thread(
            target=lambda: results.update(send=sender.dispatch(data.ACTION))
        )
        stop = threading.Thread(
            target=lambda: results.update(revoke=stopper.revoke(revoke))
        )
        dispatch.start()
        try:
            self.assertTrue(entered.wait(3))
            stop.start()
            deadline = time.monotonic() + 3
            while not stopper.state()["stopped"] and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(stopper.state()["stopped"])
            self.assertFalse(revoked.wait(0.2), "revoke overtook an admitted RPC")
        finally:
            release.set()
            dispatch.join(5)
            if stop.ident is not None:
                stop.join(5)
        self.assertFalse(dispatch.is_alive())
        self.assertFalse(stop.is_alive())
        self.assertEqual(results["send"]["status"], "observed")
        self.assertEqual(results["revoke"]["status"], "acknowledged")
        self.assertEqual(sender.dispatch(data.ACTION)["status"], "blocked")
        with sqlite3.connect(t.service.path) as db:
            kinds = [
                row[0] for row in db.execute("SELECT kind FROM events ORDER BY seq")
            ]
        self.assertLess(kinds.index("effect"), kinds.index("revoked"))

    def test_malformed_revocation_ack_cannot_confirm(self):
        t = self.fresh()
        good = {
            "status": "revoked",
            "issuer": t.client.issuer,
            "credential_id": "c1",
            "seq": 1,
        }
        for reply in (
            dict(good, seq=True),
            dict(good, seq=0),
            dict(good, credential_id="c2"),
            dict(good, extra="invented"),
            None,
        ):
            self.assertEqual(t.gate.revoke(lambda cid, r=reply: r)["status"], "unknown")
            self.assertTrue(t.gate.state()["stopped"])

    def test_discarded_revoke_ack_stays_unknown_after_remote_commit(self):
        t = self.fresh()

        def discard(cid):
            t.service.revoke(cid)
            raise OSError("simulated caller loses acknowledgment")

        self.assertEqual(t.gate.revoke(discard)["status"], "unknown")
        self.assertEqual(t.client.send(data.ACTION)["status"], "denied")
        self.assertEqual(t.gate.dispatch(data.ACTION)["status"], "blocked")
        with sqlite3.connect(t.service.path) as db:
            self.assertEqual(
                db.execute("SELECT revoked FROM credentials").fetchone()[0], 1
            )

    def test_bad_admin_requests_and_reissue_cannot_change_credentials(self):
        t = self.fresh()
        self.assertEqual(
            t.service.admin("advance", {"now": False})["status"], "invalid"
        )
        self.assertEqual(
            t.service.admin("revoke", {"credential_id": "c1", "extra": 1})["status"],
            "invalid",
        )
        reply = t.service.admin(
            "issue",
            {
                "credential_id": "c1",
                "secret": "replacement-public-key-with-32-characters",
                "subject": "mallory",
                "tenant": "other",
                "resource": "other",
                "expires": 300,
            },
        )
        self.assertEqual(reply["status"], "invalid")
        self.assertEqual(t.client.send(data.ACTION)["status"], "observed")

    def test_process_exit_after_gateway_intent_does_not_resend(self):
        t = self.fresh()
        script = """import json,os,sys
sys.path.insert(0,sys.argv[1])
from gateway import Gateway
from transport import SessionClient
value=json.loads(sys.stdin.read())
client=SessionClient(**value['client'])
SessionClient.send=lambda *args:os._exit(73)
gate=Gateway(sys.argv[2],client)
gate.dispatch(value['action'])
"""
        result = subprocess.run(
            [
                sys.executable,
                "-B",
                "-c",
                script,
                str(fixtures.HERE),
                str(t.path / "gate.sqlite"),
            ],
            input=json.dumps({"client": asdict(t.client), "action": data.ACTION}),
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 73, result.stderr)
        gate = t.Gateway(t.path / "gate.sqlite", t.client)
        self.assertEqual(gate.dispatch(data.ACTION)["status"], "unknown")
        with sqlite3.connect(t.service.path) as db:
            self.assertEqual(
                db.execute("SELECT count(*) FROM effects").fetchone()[0], 0
            )


if __name__ == "__main__":
    unittest.main()
