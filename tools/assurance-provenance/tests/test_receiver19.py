import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import receiver19  # noqa: E402

KEY = "k" * 64


def action(**over):
    base = {
        "id": "a",
        "run": "run-1",
        "principal": "alice",
        "tenant": "tenant",
        "operation": "send_report",
        "resource": "inbox",
        "content": "report a",
        "policyRevision": "v1",
    }
    base.update(over)
    return base


class Receiver19Tests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory(prefix="p19c-")
        self.addCleanup(tmp.cleanup)
        self.store = receiver19.Store19.create(
            Path(tmp.name) / "r.sqlite", "continuous", session_key=KEY, issuer="p19c"
        )
        self.store.issue("c1", "s" * 64, "alice", "tenant", "inbox", 200, run="run-1")
        self.store.allow("c1", "send_report", "inbox")
        self.sess = self.store.login("s" * 64)
        self.assertEqual(self.sess["status"], "issued")

    def send(self, act, *, sess=None, proof=True):
        sess = sess or self.sess
        key = receiver19.key_for(act)
        p = receiver19.holder_proof(sess["holder"], key) if proof else None
        return self.store.send(sess["secret"], key, act, proof=p)

    def test_positive_control_lands(self):
        out = self.send(action())
        self.assertEqual(out["status"], "observed")
        self.assertEqual(self.store.effect_count(), 1)

    def test_other_run_same_principal_is_run(self):
        out = self.send(action(run="run-2"))
        self.assertEqual(out, {"status": "denied", "reason": "run"})

    def test_other_principal_is_the_frozen_scope(self):
        out = self.send(action(principal="bob"))
        self.assertEqual(out["reason"], "scope")

    def test_bearer_without_holder_proof_is_wrong_binding(self):
        out = self.send(action(), proof=False)
        self.assertEqual(out["reason"], "wrong_binding")
        other = {**self.sess, "holder": "h" * 64}
        self.assertEqual(self.send(action(), sess=other)["reason"], "wrong_binding")

    def test_manifest(self):
        self.store.list_input("c1", "spec.txt", hashlib.sha256(b"spec v1").hexdigest())
        ok = self.store.load(
            self.sess["secret"], "spec.txt", hashlib.sha256(b"spec v1").hexdigest()
        )
        self.assertEqual(ok["status"], "loaded")
        bad = self.store.load(
            self.sess["secret"], "spec.txt", hashlib.sha256(b"spec v2").hexdigest()
        )
        self.assertEqual(bad, {"status": "denied", "reason": "substituted_input"})

    def test_canonical_effect_denial(self):
        self.store.allow("c1", "write_path", "/workdir/notes.txt")
        self.assertEqual(
            self.send(
                action(id="w1", operation="write_path", resource="/workdir/notes.txt")
            )["status"],
            "observed",
        )
        for variant in (
            "/WORKDIR/../etc/passwd",
            "/workdir/%2e%2e/etc/passwd",
            "/workdir//../etc/passwd/",
            "/ETC/PASSWD",
        ):
            out = self.send(
                action(id="w-" + variant, operation="write_path", resource=variant)
            )
            self.assertEqual(out["reason"], "effect_denied", variant)
        self.assertEqual(
            receiver19.canonical("/workdir/%2e%2e/etc//passwd/"), "/etc/passwd"
        )

    def test_paths_are_case_sensitive_and_aliases_store_the_canonical_resource(self):
        import json as _json
        import sqlite3 as _sqlite3

        self.store.allow("c1", "write_path", "/workdir/notes.txt")
        for alias in (
            "/workdir/./notes.txt",
            "/tmp/../workdir/notes.txt",
            "/workdir//notes.txt",
        ):
            out = self.send(
                action(id="al-" + alias, operation="write_path", resource=alias)
            )
            self.assertEqual(out["status"], "observed", alias)
        for other in (
            "/WORKDIR/NOTES.TXT",
            "/workdir/Notes.txt",
            "/workdir/notes.txt%00.png",
        ):
            out = self.send(
                action(id="ot-" + other, operation="write_path", resource=other)
            )
            self.assertEqual(out["reason"], "effect_denied", other)
        db = _sqlite3.connect(self.store.path)
        stored = {
            _json.loads(p)["resource"]
            for (p,) in db.execute("SELECT payload FROM effects")
        }
        requested = {r for (r,) in db.execute("SELECT requested_resource FROM effects")}
        db.close()
        self.assertEqual(stored, {"/workdir/notes.txt"})
        self.assertEqual(len(requested), 3)

    def test_holder_binding_never_fails_open_on_a_sentinel(self):
        import sqlite3 as _sqlite3

        a = action(id="sent-1")
        k = receiver19.key_for(a)
        db = _sqlite3.connect(self.store.path)
        db.execute("UPDATE sessions SET holder_hash='00'")
        db.commit()
        db.close()
        legit = self.store.send(
            self.sess["secret"],
            k,
            a,
            proof=receiver19.holder_proof(self.sess["holder"], k),
        )
        self.assertEqual(legit["reason"], "wrong_binding")
        for sentinel in ("mismatch", "None", "", "null"):
            out = self.store.send(self.sess["secret"], k, a, proof=sentinel)
            self.assertEqual(out["reason"], "wrong_binding", sentinel)

    def test_cumulative_limit(self):
        self.store.set_limits("c1", per_call=20, running=35)
        self.assertEqual(
            self.send(action(id="c-1", content="x" * 15))["status"], "observed"
        )
        self.assertEqual(
            self.send(action(id="c-2", content="x" * 15))["status"], "observed"
        )
        out = self.send(action(id="c-3", content="x" * 15))
        self.assertEqual(out["reason"], "cumulative_limit_exceeded")
        self.assertEqual(
            self.send(action(id="c-4", content="x" * 25))["reason"],
            "per_call_limit_exceeded",
        )

    def test_admin_revoked(self):
        self.assertEqual(self.send(action(id="r-1"))["status"], "observed")
        self.store.admin_revoke("c1")
        self.assertEqual(self.send(action(id="r-2"))["reason"], "admin_revoked")

    def test_grant_scope(self):
        out = self.send(action(id="g-1", operation="write_path", resource="/workdir/x"))
        self.assertEqual(out["reason"], "grant_scope")

    def test_revoked_retries_are_counted(self):
        self.store.revoke("c1")
        for i in range(3):
            self.assertEqual(
                self.send(action(id=f"v-{i}"))["reason"], "credential_inactive"
            )
        self.assertEqual(self.store.denials("credential_inactive"), 3)

    def test_reason_order_keeps_frozen_reasons_first(self):
        self.assertEqual(
            receiver19.REASONS[:6],
            (
                "request",
                "session",
                "session_inactive",
                "scope",
                "credential_inactive",
                "idempotency_conflict",
            ),
        )


if __name__ == "__main__":
    unittest.main()
