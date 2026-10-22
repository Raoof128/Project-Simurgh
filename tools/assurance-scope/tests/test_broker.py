import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from simurgh_scope.broker import Broker, Refusal
from simurgh_scope.fixtures import Fixture, policy, proposal


class BrokerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="simurgh-scope-test-")
        self.root = Path(self.tmp.name)
        self.policy = policy()
        self.db = self.root / "run.sqlite"
        Broker.create(self.db, self.policy)
        self.calls = []

    def tearDown(self):
        self.tmp.cleanup()

    def transport(self, request):
        self.calls.append(request)
        return {"status": 200, "location": None}

    def broker(self, **kw):
        return Broker(self.db, self.policy, self.transport, **kw)

    def test_allowed_read_and_write(self):
        b = self.broker()
        self.assertEqual(b.execute(proposal())["status"], "completed")
        self.assertEqual(b.execute(proposal("write"))["status"], "completed")
        self.assertEqual(len(self.calls), 2)

    def test_unknown_credentials_field_stops_before_transport_and_after_reopen(self):
        r = proposal()
        r["credential"] = "fixture-only-not-a-secret"
        self.assertEqual(self.broker().execute(r)["reason"], "scope")
        self.assertEqual(self.broker().execute(proposal())["reason"], "stopped")
        self.assertEqual(self.calls, [])

    def test_each_binding_mutation_refused(self):
        for key, value in {
            "run": "other",
            "principal": "other",
            "tenant": "other",
            "method": "POST",
            "url": "http://stats.test/admin",
            "body": "changed",
        }.items():
            with self.subTest(key=key):
                path = self.root / ("mutation-" + key + ".sqlite")
                Broker.create(path, self.policy)
                request = proposal()
                request[key] = value
                self.assertEqual(
                    Broker(path, self.policy, self.transport).execute(request)[
                        "reason"
                    ],
                    "scope",
                )
        self.assertEqual(self.calls, [])

    def test_budget_is_durable_and_counts_dispatches(self):
        p = policy(budget=1)
        path = self.root / "budget.sqlite"
        Broker.create(path, p)
        self.assertEqual(
            Broker(path, p, self.transport).execute(proposal())["status"], "completed"
        )
        self.assertEqual(
            Broker(path, p, self.transport).execute(proposal())["reason"], "budget"
        )
        self.assertEqual(len(self.calls), 1)

    def test_monitor_failure_refuses_before_send(self):
        def broken():
            raise OSError("observer unavailable")

        self.assertEqual(
            self.broker(monitor=broken).execute(proposal())["reason"], "monitor"
        )
        self.assertEqual(self.calls, [])

    def test_transport_unknown_stays_stopped(self):
        def broken(_):
            raise OSError("reply lost")

        self.assertEqual(
            Broker(self.db, self.policy, broken).execute(proposal())["status"],
            "unknown",
        )
        self.assertEqual(self.broker().execute(proposal())["reason"], "stopped")
        self.assertEqual(self.calls, [])

    def test_policy_substitution_and_missing_state_refuse(self):
        altered = policy(budget=99)
        with self.assertRaises(Refusal):
            Broker(self.db, altered, self.transport).execute(proposal())
        self.db.unlink()
        with self.assertRaises(Refusal):
            self.broker().execute(proposal())
        self.assertFalse(self.db.exists())

    def test_corrupt_state_and_unknown_state_fields_refuse(self):
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE state SET status='invented'")
        with self.assertRaises(Refusal):
            self.broker().execute(proposal())
        self.db.write_bytes(b"broken")
        with self.assertRaises(Refusal):
            self.broker().execute(proposal())
        self.assertEqual(self.calls, [])

    def test_malformed_policy_and_reprovisioning_refuse(self):
        for invalid in (
            policy(budget=True),
            policy(budget=0),
            {**policy(), "extra": True},
        ):
            with self.assertRaises(Refusal):
                Broker.create(self.root / "bad.sqlite", invalid)
        with self.assertRaises(Refusal):
            Broker.create(self.db, self.policy)

    def test_audit_failure_prevents_transport(self):
        with sqlite3.connect(self.db) as db:
            db.execute(
                "CREATE TRIGGER fail_audit BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT, 'no audit'); END"
            )
        with self.assertRaises(Refusal):
            self.broker().execute(proposal())
        self.assertEqual(self.calls, [])

    def test_concurrent_calls_share_budget(self):
        p = policy(budget=1)
        path = self.root / "concurrent.sqlite"
        Broker.create(path, p)
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(
                pool.map(
                    lambda _: Broker(path, p, self.transport).execute(proposal()),
                    range(4),
                )
            )
        self.assertEqual(sum(r["status"] == "completed" for r in results), 1)
        self.assertEqual(len(self.calls), 1)

    def test_response_audit_failure_leaves_pending_and_never_retries(self):
        def delivered(request):
            self.calls.append(request)
            with sqlite3.connect(self.db) as db:
                db.execute(
                    "CREATE TRIGGER fail_response BEFORE INSERT ON events WHEN NEW.kind='response' BEGIN SELECT RAISE(ABORT, 'no response audit'); END"
                )
            return {"status": 200, "location": None}

        with self.assertRaises(Refusal):
            Broker(self.db, self.policy, delivered).execute(proposal())
        self.assertEqual(
            self.broker().execute(proposal()),
            {"status": "unknown", "reason": "pending_intent"},
        )
        self.assertEqual(self.broker().execute(proposal())["reason"], "stopped")
        self.assertEqual(len(self.calls), 1)

    def test_terminal_response_stop_write_failure_cannot_reactivate_run(self):
        responses = (
            {"status": 404, "location": None},
            {"status": 302, "location": None},
            {"status": 302, "location": "http://outside.test/collect"},
        )
        for index, response in enumerate(responses):
            with self.subTest(response=response):
                path = self.root / f"stop-failure-{index}.sqlite"
                Broker.create(path, self.policy)
                with sqlite3.connect(path) as db:
                    db.execute(
                        "CREATE TRIGGER fail_stop BEFORE INSERT ON events WHEN NEW.kind='stop' BEGIN SELECT RAISE(ABORT, 'stop unavailable'); END"
                    )
                calls = []

                def transport(request, calls=calls, response=response):
                    calls.append(request)
                    return response

                with self.assertRaises(Refusal):
                    Broker(path, self.policy, transport).execute(proposal())
                with sqlite3.connect(path) as db:
                    self.assertEqual(
                        db.execute("SELECT status FROM state").fetchone()[0], "pending"
                    )
                    db.execute("DROP TRIGGER fail_stop")
                restored = Broker(path, self.policy, transport).execute(proposal())
                self.assertEqual(
                    restored, {"status": "unknown", "reason": "pending_intent"}
                )
                self.assertEqual(len(calls), 1)

    def test_scope_stop_write_failure_leaves_pending_before_any_dispatch(self):
        with sqlite3.connect(self.db) as db:
            db.execute(
                "CREATE TRIGGER fail_stop BEFORE INSERT ON events WHEN NEW.kind='stop' BEGIN SELECT RAISE(ABORT, 'stop unavailable'); END"
            )
        request = {**proposal(), "url": "http://stats.test/admin"}
        with self.assertRaises(Refusal):
            self.broker().execute(request)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(
                db.execute("SELECT status FROM state").fetchone()[0], "pending"
            )
            db.execute("DROP TRIGGER fail_stop")
        self.assertEqual(
            self.broker().execute(proposal()),
            {"status": "unknown", "reason": "pending_intent"},
        )
        self.assertEqual(self.calls, [])

    def test_redirect_to_another_exact_grant_is_usable(self):
        def redirect(request):
            self.calls.append(request)
            return (
                {"status": 302, "location": proposal()["url"]}
                if request == proposal("redirect")
                else {"status": 200, "location": None}
            )

        self.assertEqual(
            Broker(self.db, self.policy, redirect).execute(proposal("redirect"))[
                "status"
            ],
            "completed",
        )
        self.assertEqual(len(self.calls), 2)

    def test_invalid_proposals_cannot_dispatch(self):
        for index, request in enumerate(
            (
                None,
                [],
                {},
                {**proposal(), "method": "DELETE"},
                {**proposal(), "url": "http://stats.test/[" + "x" * 2050},
                {**proposal(), "url": "http://stats.test/public#fragment"},
            )
        ):
            path = self.root / f"invalid-{index}.sqlite"
            Broker.create(path, self.policy)
            self.assertEqual(
                Broker(path, self.policy, self.transport).execute(request)["reason"],
                "scope",
            )
        self.assertEqual(self.calls, [])

    def test_redirect_reauthorization_and_real_sink_observation(self):
        with Fixture() as fixture:
            b = Broker(self.db, self.policy, fixture.transport)
            self.assertEqual(b.execute(proposal("redirect"))["reason"], "scope")
            self.assertEqual(
                [(r["origin"], r["path"]) for r in fixture.observed()],
                [("http://packages.test", "/redirect")],
            )

    def test_transport_never_falls_back_to_dns_or_tcp(self):
        with Fixture() as fixture:
            for url in (
                "http://unregistered.test/a",
                "https://stats.test/public",
                "dns://stats.test/public",
                "http://stats.test@outside.test/a",
                "http://stats.test/public#fragment",
            ):
                with self.subTest(url=url), self.assertRaises(Refusal):
                    fixture.transport({**proposal(), "url": url})
            self.assertEqual(fixture.observed(), [])

    def test_actual_sigkill_with_pending_intent_stops_restart(self):
        from simurgh_scope.study import pending_crash

        with Fixture() as fixture:
            result = pending_crash(self.root, self.policy, "scoped", fixture)
            self.assertEqual(result["killed"], True)
            self.assertEqual(result["results"][0]["status"], "unknown")
            self.assertEqual(fixture.observed(), [])

    def test_four_processes_share_one_dispatch_budget(self):
        committed = policy(budget=1)
        Broker.create(self.root / "crash.sqlite", committed)
        (self.root / "policy.json").write_text(json.dumps(committed))
        with Fixture() as fixture:
            command = [
                sys.executable,
                "-m",
                "simurgh_scope.worker",
                str(self.root),
                str(fixture.root),
                "scoped",
                "resume",
            ]
            workers = [
                subprocess.Popen(
                    command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
                )
                for _ in range(4)
            ]
            try:
                results = [json.loads(w.communicate(timeout=10)[0]) for w in workers]
                self.assertEqual([w.returncode for w in workers], [0] * 4)
                self.assertEqual(sum(r["status"] == "completed" for r in results), 1)
                self.assertEqual(len(fixture.observed()), 1)
            finally:
                for worker in workers:
                    if worker.poll() is None:
                        worker.kill()
                    worker.communicate()


if __name__ == "__main__":
    unittest.main()
