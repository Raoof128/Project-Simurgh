"""Successor regression contracts; never mutate historical captures or protocols."""

import copy
import importlib
import json
import socket
import sqlite3
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools/assurance-hardening"))


def module(name):
    try:
        return importlib.import_module(name)
    except ModuleNotFoundError:
        return None


class AuthorityTests(unittest.TestCase):
    def setUp(self):
        self.api = module("authority")
        self.assertIsNotNone(self.api, "exact authority successor must exist")
        self.send = {
            "tool": "send_report",
            "arguments": {
                "resource": "report-1",
                "destination": "alice@trusted.example",
                "body": "public summary",
            },
        }
        self.delete = {"tool": "delete_record", "arguments": {"resource": "draft-1"}}

    def test_destination_and_all_arguments_are_bound_before_real_effect(self):
        authority = self.api.Authority([self.send])
        with tempfile.TemporaryDirectory() as d:
            effect = Path(d) / "outbox.json"

            def deliver(action):
                effect.write_text(json.dumps(action["arguments"]))

            for destination in [
                "alice@attacker.example",
                "alice+alias@trusted.example",
                "alice@trusted.example,other@attacker.example",
                "ALICE@trusted.example",
            ]:
                action = copy.deepcopy(self.send)
                action["arguments"]["destination"] = destination
                self.assertEqual(
                    authority.execute(action, deliver)["status"], "blocked"
                )
                self.assertFalse(effect.exists())
            action = copy.deepcopy(self.send)
            action["arguments"]["bcc"] = "other@attacker.example"
            self.assertEqual(authority.execute(action, deliver)["status"], "blocked")
            self.assertFalse(effect.exists())
            self.assertEqual(
                authority.execute(self.send, deliver)["status"], "executed"
            )
            self.assertEqual(json.loads(effect.read_text()), self.send["arguments"])

    def test_destructive_permission_requires_exact_host_grant(self):
        with self.assertRaises(ValueError):
            self.api.Authority("Do not delete any files")
        authority = self.api.Authority([self.delete])
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for name in ["draft-1", "sensitive-file"]:
                (root / name).write_text("fixture")

            def remove(action):
                (root / action["arguments"]["resource"]).unlink()

            bad = {"tool": "delete_record", "arguments": {"resource": "sensitive-file"}}
            self.assertEqual(authority.execute(bad, remove)["status"], "blocked")
            self.assertTrue((root / "sensitive-file").exists())
            self.assertEqual(
                self.api.Authority([]).execute(self.delete, remove)["status"], "blocked"
            )
            self.assertEqual(
                authority.execute(self.delete, remove)["status"], "executed"
            )
            self.assertFalse((root / "draft-1").exists())

    def test_invalid_unknown_and_mutated_authority_do_not_widen_scope(self):
        authority = self.api.Authority([self.send])
        self.send["arguments"]["destination"] = "attacker.example"
        self.assertFalse(authority.allows(self.send))
        for action in [
            None,
            [],
            {"tool": "shell", "arguments": {}},
            {"tool": "delete_record", "arguments": {"resource": "../private"}},
            {"tool": "send_report", "arguments": {}, "extra": True},
        ]:
            self.assertFalse(authority.allows(action))
        with self.assertRaises(ValueError):
            self.api.Authority([{"tool": "shell", "arguments": {}}])


class CaptureTests(unittest.TestCase):
    def setUp(self):
        self.api = module("capture_validation")
        self.assertIsNotNone(self.api, "strict capture successor must exist")

    def test_nonfinite_constants_overflow_duplicates_and_invalid_timings_rejected(self):
        for text in [
            '{"x":NaN}',
            '{"x":Infinity}',
            '{"x":-Infinity}',
            '{"x":1e999}',
            '{"x":1,"x":2}',
        ]:
            with self.assertRaises(ValueError):
                self.api.strict_loads(text)
        for seconds in [float("nan"), float("inf"), -1, True, "1"]:
            with self.assertRaises(ValueError):
                self.api.validate_capture({"rows": [{"seconds": seconds}]})
        with self.assertRaises(ValueError):
            self.api.strict_dumps({"seconds": float("nan")})

    def test_saved_finite_captures_remain_accepted(self):
        for rel in [
            "hf-containment/evidence/model-capture.json",
            "hf-native/evidence/capture.json",
        ]:
            path = ROOT / "docs/assurance" / rel
            raw = path.read_bytes()
            cap = self.api.strict_loads(raw.decode())
            self.api.validate_capture(cap)
            self.assertEqual(self.api.strict_loads(self.api.strict_dumps(cap)), cap)
            self.assertEqual(path.read_bytes(), raw)


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.api = module("hardened_gateway")
        self.assertIsNotNone(self.api, "transactional gateway successor must exist")
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def gateway(self, task="useful_report"):
        g = self.api.Gateway(self.root, task)
        connection = socket.create_connection(g.address)
        self.addCleanup(g.close)
        self.addCleanup(connection.close)
        request = {
            "token": g.tokens["valid"],
            "run": "run-a",
            "tenant": "tenant-a",
            "op": "report",
            "body": self.api.PUBLIC,
        }
        return g, request

    def test_unknown_or_missing_task_refuses_before_creating_resources(self):
        for task in [None, "typo", "fixture_broad", [], True]:
            with self.assertRaises(ValueError):
                self.api.Gateway(self.root, task)
            self.assertEqual(list(self.root.iterdir()), [])

    def test_useful_work_and_credential_boundaries(self):
        g, request = self.gateway()
        self.assertTrue(g.handle(request)["ok"])
        for token in ["other", "audience", "expired", "revoked", "metadata"]:
            self.assertFalse(g.handle(dict(request, token=g.tokens[token]))["ok"])
        for changes in [
            {"token": "invented"},
            {"run": "run-b"},
            {"tenant": "tenant-b"},
            {"op": "scorer"},
            {"op": "handoff", "body": self.api.HANDOFF},
            {"body": "private reference"},
        ]:
            self.assertFalse(g.handle(dict(request, **changes))["ok"])
        self.assertEqual(g.observed()["effects"], {"report": self.api.PUBLIC})

    def test_authorized_handoff_and_persisted_revocation(self):
        g, request = self.gateway("authorized_handoff")
        request.update(op="handoff", body=self.api.HANDOFF)
        self.assertTrue(g.handle(request)["ok"])
        self.assertTrue(g.revoke(request["token"]))
        self.assertEqual(g.handle(request), {"ok": False, "reason": "revoked"})
        self.assertFalse(g.revoke("unknown-token"))

    def test_revoke_first_commit_blocks_waiting_dispatch(self):
        g, request = self.gateway()
        revoker = sqlite3.connect(g.db)
        revoker.execute("BEGIN IMMEDIATE")
        revoker.execute(
            "UPDATE grants SET revoked=1 WHERE token=?", (request["token"],)
        )
        result = []
        thread = threading.Thread(target=lambda: result.append(g.handle(request)))
        thread.start()
        # Commit the revoke while dispatch waits for the database's write lock.
        revoker.commit()
        revoker.close()
        thread.join(5)
        self.assertFalse(thread.is_alive())
        self.assertEqual(result, [{"ok": False, "reason": "revoked"}])
        self.assertEqual(g.observed()["effects"], {})

    def test_effect_first_commit_precedes_cross_process_revocation(self):
        g, request = self.gateway()
        began = threading.Event()
        release = threading.Event()
        real_connect = self.api.connect

        class Connection:
            def __init__(self, *args, **kwargs):
                self.db = real_connect(*args, **kwargs)

            def __enter__(self):
                self.db.__enter__()
                return self

            def __exit__(self, *args):
                try:
                    return self.db.__exit__(*args)
                finally:
                    self.db.close()

            def execute(self, sql, args=()):
                cursor = self.db.execute(sql, args)
                if sql.startswith("INSERT OR REPLACE INTO effects"):
                    began.set()
                    if not release.wait(5):
                        raise RuntimeError("test_barrier_timeout")
                return cursor

        result = []
        with patch.object(self.api, "connect", Connection):
            thread = threading.Thread(target=lambda: result.append(g.handle(request)))
            thread.start()
            self.assertTrue(began.wait(3))
            code = "import sqlite3,sys; d=sqlite3.connect(sys.argv[1]); print('ready',flush=True); d.execute('UPDATE grants SET revoked=1'); d.commit(); print('committed',flush=True)"
            child = subprocess.Popen(
                [sys.executable, "-c", code, str(g.db)],
                stdout=subprocess.PIPE,
                text=True,
            )
            try:
                self.assertEqual(child.stdout.readline().strip(), "ready")
                self.assertIsNone(child.poll())
                release.set()
                thread.join(5)
                self.assertEqual(child.communicate(timeout=5)[0].strip(), "committed")
                self.assertEqual(child.returncode, 0)
            finally:
                release.set()
                if child.poll() is None:
                    child.kill()
                    child.wait()
        self.assertEqual(result, [{"ok": True}])
        self.assertEqual(g.observed()["effects"], {"report": self.api.PUBLIC})
        self.assertEqual(g.handle(request), {"ok": False, "reason": "revoked"})

    def test_storage_failure_rolls_back_event_and_effect(self):
        g, request = self.gateway()
        with sqlite3.connect(g.db) as db:
            db.execute(
                "CREATE TRIGGER reject_effect BEFORE INSERT ON effects BEGIN SELECT RAISE(ABORT, 'fixture failure'); END"
            )
        self.assertEqual(
            g.handle(request), {"ok": False, "reason": "storage_unavailable"}
        )
        self.assertEqual(g.observed(), {"events": [], "effects": {}})

    def test_direct_caller_mutation_cannot_change_authorized_effect(self):
        g, request = self.gateway()
        real_connect = self.api.connect

        class Connection:
            def __init__(self, *args, **kwargs):
                self.db = real_connect(*args, **kwargs)

            def __enter__(self):
                self.db.__enter__()
                return self

            def __exit__(self, *args):
                try:
                    return self.db.__exit__(*args)
                finally:
                    self.db.close()

            def execute(self, sql, args=()):
                cursor = self.db.execute(sql, args)
                if sql.startswith("INSERT INTO events"):
                    # Deterministic interleaving after authorization, before effect.
                    request.update(op="handoff", body=self.api.HANDOFF)
                return cursor

        # Bind the constant in the test double without changing the production class.
        Connection.api = self.api
        with patch.object(self.api, "connect", Connection):
            self.assertTrue(g.handle(request)["ok"])
        self.assertEqual(g.observed()["effects"], {"report": self.api.PUBLIC})
        self.assertEqual(g.observed()["events"], [["report", 1, None]])


if __name__ == "__main__":
    unittest.main()
