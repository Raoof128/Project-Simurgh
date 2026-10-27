"""Regression tests for the post-freeze successor pipeline.

Each defect test fails against the frozen ``composition.Pipeline``. To see that, run
``SUCCESSOR_IMPL=frozen python -m unittest discover -s tools/assurance-composed-successor/tests``.
The frozen run is expected to fail and is not part of CI. The default run exercises the
successor. No test patches ``fcntl.flock``: the macOS lock defect is part of what is tested.
"""

import base64
import fcntl
import hmac
import os
import sqlite3
import sys
import tempfile
import threading
import time
import types
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "tools" / "assurance-composed"))
sys.path.insert(0, str(HERE))

IMPL = os.environ.get("SUCCESSOR_IMPL", "successor")
if IMPL == "frozen":
    import composition as mod
elif IMPL == "successor":
    import successor as mod
else:
    raise SystemExit("SUCCESSOR_IMPL must be 'successor' or 'frozen'")
from core import encode  # noqa: E402
from transport import Service  # noqa: E402

SECRET = b"phase9-public-webhook-fixture-key"
WHSEC = "whsec_" + base64.b64encode(SECRET).decode()
OPERATOR = b"o" * 32
DEFAULT_IDS = {
    "a": {"response_id": "response-a", "request_id": "request-a"},
    "b": {"response_id": "response-b", "request_id": "request-b"},
}
REAL_IDS = {
    "a": {"response_id": "resp_68f0c0ffee", "request_id": "req_9f8e7d"},
    "b": {"response_id": "resp_68f0c0ffe0", "request_id": "req_9f8e7c"},
}


def signed(route, *, header_case=lambda k: k, secret=SECRET):
    event_id, alert_id = "evt_" + route, "alert_" + route
    raw = encode(
        {
            "object": "event",
            "id": event_id,
            "type": "safety.alert.created",
            "created_at": 1700000000,
            "data": {"id": alert_id},
        }
    )
    stamp = str(int(time.time()))
    signature = base64.b64encode(
        hmac.digest(secret, f"{event_id}.{stamp}.{raw}".encode(), "sha256")
    ).decode()
    headers = {
        "webhook-id": event_id,
        "webhook-timestamp": stamp,
        "webhook-signature": "v1," + signature,
    }
    return raw, {header_case(k): v for k, v in headers.items()}


def title(name):
    return "-".join(part.capitalize() for part in name.split("-"))


class Rig:
    """One receiver, two routes, a controllable clock; mirrors the frozen composition suite."""

    def __init__(self, case, *, policy="continuous", revoker=None, ids=None):
        self.case = case
        self.tmp = tempfile.TemporaryDirectory()
        case.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.service = Service(
            self.path / "service.sqlite",
            policy,
            admin_key="a" * 64,
            issuer="test-issuer",
        )
        case.addCleanup(self.service.close)
        credential = self.service.issue(
            "c1", "alice", "tenant", "inbox", 200, secret="c" * 64
        )
        self.client = self.service.login(credential)
        self.ids = ids or DEFAULT_IDS
        self.actions = {
            k: {
                "id": k,
                "run": "test",
                "principal": "alice",
                "tenant": "tenant",
                "operation": "send_report",
                "resource": "inbox",
                "content": "report " + k,
                "policyRevision": "v1",
            }
            for k in ("a", "b")
        }
        self.now = 100.0
        by_alert = {
            "alert_" + k: dict(
                id="alert_" + k, request_paused=True, reason="misalignment", **v
            )
            for k, v in self.ids.items()
        }
        self.args = {
            "actions": self.actions,
            "client": self.client,
            "revoker": revoker or self.service.revoke,
            "task": "task",
            "source": "v1",
            "registry": {
                "child": {"parent": "root", "task": "task"},
                "grandchild": {"parent": "child", "task": "task"},
            },
            "webhook_secret": WHSEC,
            "operator_key": OPERATOR,
            "lookup": lambda alert_id: by_alert[alert_id],
            "clock": lambda: self.now,
            "boot": "test-boot",
            "bindings": self.ids,
        }
        self.pipe = self.open(create=True)
        self.pipe.update(self.activate)

    def open(self, *, create=False, directory="controls", **overrides):
        args = dict(self.args, **overrides)
        if IMPL == "frozen":
            # The frozen pipeline has no way to take bindings; it hard-wires response-<name>.
            args.pop("bindings")
        if create:
            return mod.Pipeline.create(self.path / directory, **args)
        return mod.Pipeline(self.path / directory, **args)

    def reopen(self, **overrides):
        self.pipe = self.open(**overrides)
        return self.pipe

    def activate(self):
        for key, signal in self.pipe.signals.items():
            signal.heartbeat()
            self.case.assertTrue(
                signal.restart(
                    mod.restart_token(signal, OPERATOR, self.now, "start-" + key)
                )
            )

    def effects(self):
        with sqlite3.connect(self.service.path) as db:
            return db.execute("SELECT count(*) FROM effects").fetchone()[0]

    def events(self):
        with sqlite3.connect(self.pipe.path) as db:
            return [k for (k,) in db.execute("SELECT kind FROM events ORDER BY seq")]

    def dispatch(self, route):
        return self.pipe.resume("root").dispatch(self.actions[route])["status"]


class HeaderCaseTests(unittest.TestCase):
    """H3: signature checking is case-insensitive, the event-id comparison was not."""

    def test_lowercase_headers_stop_the_route(self):
        rig = Rig(self)
        self.assertEqual(rig.pipe.signals["a"].receive(*signed("a")), "stopped")
        self.assertEqual(rig.dispatch("a"), "blocked")
        self.assertEqual(rig.effects(), 0)

    def test_title_and_upper_case_headers_latch_and_block(self):
        rig = Rig(self)
        raw_a, headers_a = signed("a", header_case=title)
        raw_b, headers_b = signed("b", header_case=str.upper)
        self.assertIn("Webhook-Id", headers_a)
        self.assertIn("WEBHOOK-ID", headers_b)
        self.assertEqual(rig.pipe.signals["a"].receive(raw_a, headers_a), "stopped")
        self.assertEqual(rig.pipe.signals["b"].receive(raw_b, headers_b), "stopped")
        for route in ("a", "b"):
            self.assertTrue(rig.pipe.signals[route].state()["terminal"])
            self.assertEqual(rig.dispatch(route), "blocked")
        self.assertEqual(rig.effects(), 0)

    def test_duplicate_headers_differing_only_in_case_are_ambiguous(self):
        rig = Rig(self)
        raw, headers = signed("a")
        headers["Webhook-Id"] = headers["webhook-id"]
        with self.assertRaisesRegex(ValueError, "^invalid_webhook$"):
            rig.pipe.signals["a"].receive(raw, headers)
        self.assertFalse(rig.pipe.signals["a"].state()["terminal"])
        self.assertNotIn(
            "alert_pending", [e["type"] for e in rig.pipe.signals["a"].events()]
        )
        self.assertEqual(rig.dispatch("a"), "observed")

    def test_unicode_case_folding_cannot_forge_a_header_name(self):
        rig = Rig(self)
        raw, headers = signed("a")
        # KELVIN SIGN (U+212A) lowercases to ASCII k, so str.lower() would fold this
        # name onto webhook-id; the SDK's own lookup does exactly that.
        headers["webhoo\u212a-id"] = headers.pop("webhook-id")
        with self.assertRaisesRegex(ValueError, "^invalid_webhook$"):
            rig.pipe.signals["a"].receive(raw, headers)

    def test_title_case_does_not_bypass_signature_verification(self):
        rig = Rig(self)
        raw, headers = signed("a", header_case=title, secret=b"x" * 33)
        with self.assertRaisesRegex(ValueError, "invalid_webhook_signature"):
            rig.pipe.signals["a"].receive(raw, headers)
        self.assertFalse(rig.pipe.signals["a"].state()["terminal"])

    def test_non_dict_headers_still_rejected(self):
        rig = Rig(self)
        raw, headers = signed("a")
        with self.assertRaisesRegex(ValueError, "^invalid_webhook$"):
            rig.pipe.signals["a"].receive(raw, list(headers.items()))


class BindingTests(unittest.TestCase):
    """M5: the frozen pipeline hard-wires response-<name> and request-<name>."""

    def test_real_provider_ids_bound_through_bindings_stop_the_route(self):
        rig = Rig(self, ids=REAL_IDS)
        self.assertEqual(rig.pipe.signals["a"].receive(*signed("a")), "stopped")
        self.assertTrue(rig.pipe.signals["a"].state()["terminal"])
        self.assertEqual(rig.dispatch("a"), "blocked")
        self.assertEqual(rig.effects(), 0)

    def test_alert_for_another_response_stays_unrelated(self):
        rig = Rig(self, ids=REAL_IDS)
        # Route b's alert names b's ids, so it must not stop route a's signal gate.
        self.assertEqual(rig.pipe.signals["a"].receive(*signed("b")), "unrelated")
        self.assertFalse(rig.pipe.signals["a"].state()["terminal"])

    def test_bindings_are_required_and_validated(self):
        bad = {
            "missing route": {"a": REAL_IDS["a"]},
            "unknown route": dict(REAL_IDS, c=REAL_IDS["a"]),
            "extra field": dict(REAL_IDS, a=dict(REAL_IDS["a"], extra="x")),
            "missing field": dict(REAL_IDS, a={"response_id": "resp_x"}),
            "empty id": dict(REAL_IDS, a=dict(REAL_IDS["a"], request_id="")),
            "non-string id": dict(REAL_IDS, a=dict(REAL_IDS["a"], response_id=7)),
            "oversized id": dict(
                REAL_IDS, a=dict(REAL_IDS["a"], response_id="r" * 257)
            ),
            "not a dict": [REAL_IDS["a"], REAL_IDS["b"]],
            "route value not a dict": dict(REAL_IDS, b="req_9f8e7c"),
        }
        rig = Rig(self, ids=REAL_IDS)
        for label, bindings in bad.items():
            with self.subTest(label):
                with self.assertRaisesRegex(ValueError, "^bindings$"):
                    rig.open(
                        create=True,
                        directory=label.replace(" ", "-"),
                        bindings=bindings,
                    )
                # Validation precedes any filesystem write.
                self.assertFalse((rig.path / label.replace(" ", "-")).exists())

    def test_bindings_are_persisted_and_a_reopen_must_present_the_same(self):
        rig = Rig(self, ids=REAL_IDS)
        with sqlite3.connect(rig.pipe.path) as db:
            (payload,) = db.execute("SELECT payload FROM config").fetchone()
        self.assertIn("resp_68f0c0ffee", payload)
        self.assertIn("req_9f8e7c", payload)
        rig.reopen()
        other = dict(REAL_IDS, a=dict(REAL_IDS["a"], request_id="req_other"))
        with self.assertRaisesRegex(ValueError, "^pipeline_binding$"):
            rig.reopen(bindings=other)
        swapped = {"a": REAL_IDS["b"], "b": REAL_IDS["a"]}
        with self.assertRaisesRegex(ValueError, "^pipeline_binding$"):
            rig.reopen(bindings=swapped)


class SiblingRouteTests(unittest.TestCase):
    """M6: one route's stop must stop the others; stop() must not abort part-way."""

    def test_latched_route_blocks_the_sibling_under_session_snapshot(self):
        rig = Rig(self, policy="session_snapshot")
        self.assertEqual(rig.pipe.signals["a"].receive(*signed("a")), "stopped")
        self.assertEqual(rig.pipe.gateways["a"].state()["revocation"], "acknowledged")
        self.assertFalse(rig.pipe.signals["b"].state()["terminal"])
        self.assertEqual(rig.dispatch("b"), "blocked")
        self.assertEqual(rig.effects(), 0)
        self.assertIn("dispatch_sibling_latched", rig.events())

    def test_sibling_block_survives_reopen(self):
        rig = Rig(self, policy="session_snapshot")
        rig.pipe.signals["a"].receive(*signed("a"))
        rig.reopen()
        self.assertEqual(rig.dispatch("b"), "blocked")
        self.assertEqual(rig.effects(), 0)

    def test_sibling_block_also_holds_below_the_bound_session(self):
        rig = Rig(self, policy="session_snapshot")
        rig.pipe.signals["a"].receive(*signed("a"))
        session = rig.pipe.resume("root")
        # The context session is reachable from the handle; it must not be a bypass.
        self.assertEqual(
            session.context.dispatch(rig.actions["b"])["status"], "blocked"
        )
        self.assertEqual(rig.effects(), 0)

    def test_unlatched_pipeline_still_dispatches(self):
        rig = Rig(self, policy="session_snapshot")
        self.assertEqual(rig.dispatch("b"), "observed")
        self.assertEqual(rig.effects(), 1)
        self.assertNotIn("dispatch_sibling_latched", rig.events())

    def test_stop_attempts_every_route_then_reraises_the_first_error(self):
        class Boom(Exception):
            pass

        calls = []

        def revoker(credential_id):
            calls.append(credential_id)
            raise Boom(len(calls))

        rig = Rig(self, revoker=revoker)
        with self.assertRaises(Boom) as raised:
            rig.pipe.stop()
        self.assertEqual(raised.exception.args, (1,))
        self.assertEqual(calls, ["c1", "c1"])
        for route, signal in rig.pipe.signals.items():
            self.assertTrue(signal.state()["terminal"], route)
        self.assertEqual(rig.dispatch("b"), "blocked")
        self.assertEqual(rig.effects(), 0)

    def test_stop_without_errors_latches_both_and_returns(self):
        rig = Rig(self)
        self.assertIsNone(rig.pipe.stop())
        for signal in rig.pipe.signals.values():
            self.assertTrue(signal.state()["terminal"])
            self.assertIn("host_revoked", [e["type"] for e in signal.events()])


class LockTests(unittest.TestCase):
    """macOS: flock on the SQLite file itself breaks SQLite on the same file (Darwin)."""

    def test_flock_is_not_patched_in_this_suite(self):
        self.assertIsInstance(fcntl.flock, types.BuiltinFunctionType)

    def test_full_cycle_runs_without_a_flock_shim(self):
        rig = Rig(self, policy="session_snapshot")
        self.assertEqual(rig.dispatch("a"), "observed")
        rig.pipe.signals["b"].receive(*signed("b"))
        self.assertTrue(rig.pipe.signals["b"].state()["terminal"])
        self.assertEqual(rig.effects(), 1)

    def test_sqlite_is_usable_while_the_pipeline_lock_is_held(self):
        rig = Rig(self)
        with rig.pipe.locked():
            self.assertFalse(rig.pipe.held())
            with rig.pipe.db() as db:
                db.execute("INSERT INTO events(kind) VALUES('probe')")

    def test_locks_live_in_sidecar_files(self):
        rig = Rig(self)
        rig.dispatch("a")
        directory = rig.path / "controls"
        for name in ("pipeline", "a-gateway"):  # b is never admitted: shared budget
            self.assertTrue((directory / (name + ".sqlite.lock")).is_file(), name)
        self.assertEqual((directory / "pipeline.sqlite.lock").stat().st_size, 0)

    def test_symlinked_sidecar_is_refused(self):
        rig = Rig(self)
        directory = rig.path / "controls"
        target = rig.path / "elsewhere"
        target.write_bytes(b"")
        for name in ("pipeline", "a-gateway"):
            lock = directory / (name + ".sqlite.lock")
            lock.unlink(missing_ok=True)
            lock.symlink_to(target)
        with self.assertRaisesRegex(ValueError, "^lock_state$"):
            with rig.pipe.locked():
                pass
        with self.assertRaisesRegex(ValueError, "^lock_state$"):
            with rig.pipe.gateways["a"].admission():
                pass

    def test_missing_sidecar_is_recreated(self):
        rig = Rig(self)
        lock = rig.path / "controls" / "pipeline.sqlite.lock"
        lock.unlink()
        with rig.pipe.locked():
            self.assertTrue(lock.is_file())

    def test_lock_still_serialises_parallel_distinct_actions(self):
        rig = Rig(self)
        actor = rig.pipe.resume("root")
        results = []
        threads = [
            threading.Thread(
                target=lambda k=k: results.append(
                    actor.dispatch(rig.actions[k])["status"]
                )
            )
            for k in ("a", "b")
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join(15)
        self.assertEqual(sorted(results), ["blocked", "observed"])
        self.assertEqual(rig.effects(), 1)


class InheritedBehaviourTests(unittest.TestCase):
    """The subclass must keep the frozen pipeline's own guarantees."""

    def test_interrupted_update_stays_held_after_reopen(self):
        rig = Rig(self)

        def broken():
            rig.pipe.context.revoke("root")
            raise RuntimeError("partial operation")

        with self.assertRaises(RuntimeError):
            rig.pipe.update(broken)
        rig.reopen()
        self.assertTrue(rig.pipe.held())
        self.assertEqual(rig.dispatch("a"), "blocked")
        self.assertEqual(rig.effects(), 0)

    def test_shared_budget_and_delegation(self):
        rig = Rig(self)
        root = rig.pipe.resume("root")
        self.assertTrue(
            rig.pipe.update(lambda: root.context.delegate("child", ["a", "b"]))
        )
        child = rig.pipe.resume("child")
        self.assertEqual(child.dispatch(rig.actions["a"])["status"], "observed")
        self.assertEqual(child.dispatch(rig.actions["b"])["status"], "blocked")
        self.assertEqual(rig.effects(), 1)

    def test_expired_monitor_does_not_restart_on_reopen(self):
        rig = Rig(self)
        rig.now = 131
        rig.reopen()
        self.assertEqual(rig.dispatch("a"), "blocked")
        self.assertEqual(rig.effects(), 0)


if __name__ == "__main__":
    unittest.main()
