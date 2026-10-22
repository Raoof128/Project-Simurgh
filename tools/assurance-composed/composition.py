"""Trusted adapters composing frozen signal, lineage and credential gates."""

import fcntl
import hashlib
import hmac
import sqlite3
import sys
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for name in (
    "assurance-connector",
    "assurance-signals",
    "assurance-context",
    "assurance-credentials",
):
    sys.path.insert(0, str(ROOT / "tools" / name))
from context_gate import ContextGate
from core import encode
from gateway import Gateway
from signals import SignalGate

sys.path.insert(0, str(Path(__file__).resolve().parent))


class CredentialPort:
    """Compatibility metadata is immutable and checked against the actual gateway."""

    def __init__(self, path, gateway, revoker, *, create=False):
        self.path, self.gateway, self.revoker = Path(path), gateway, revoker
        action = gateway.config["approved"]
        policy = (
            encode({k: action[k] for k in ("run", "principal", "tenant")}),
            encode(action),
            "enforced",
            0,
        )
        binding = encode(gateway.config)
        if create:
            with self.path.open("xb"):
                pass
            with sqlite3.connect(self.path) as db:
                db.executescript(
                    "CREATE TABLE policy(identity TEXT,approved TEXT,control TEXT,revoked INTEGER); CREATE TABLE binding(payload TEXT);"
                )
                db.execute("INSERT INTO policy VALUES(?,?,?,?)", policy)
                db.execute("INSERT INTO binding VALUES(?)", (binding,))
        if self.path.is_symlink() or not self.path.is_file():
            raise ValueError("port_state")
        with sqlite3.connect(self.path) as db:
            if db.execute("SELECT * FROM policy").fetchall() != [policy] or db.execute(
                "SELECT payload FROM binding"
            ).fetchall() != [(binding,)]:
                raise ValueError("port_binding")

    def dispatch(self, action):
        result = self.gateway.dispatch(action)
        # Phase 7's frozen vocabulary lacks denied. Preserve it in gateway raw state.
        return {"status": "blocked"} if result["status"] == "denied" else result

    def revoke(self):
        if self.gateway.revoke(self.revoker) != {"status": "acknowledged"}:
            raise OSError("remote_revocation_unknown")


class SignalPort:
    def __init__(self, port, signal):
        self.path, self.signal = port.path, signal

    def dispatch(self, action):
        return self.signal.dispatch(action)


def restart_token(signal, key, now, nonce):
    payload = {
        "scope": signal.scope,
        "revision": signal.state()["revision"],
        "expires": now + 30,
        "nonce": nonce,
    }
    return {
        "payload": payload,
        "signature": hmac.new(
            key, encode(payload).encode(), hashlib.sha256
        ).hexdigest(),
    }


class Pipeline:
    @classmethod
    def create(cls, path, **kwargs):
        path = Path(path)
        path.mkdir(parents=True, exist_ok=False)
        return cls(path, _create=True, **kwargs)

    def __init__(
        self,
        path,
        *,
        actions,
        client,
        revoker,
        task,
        source,
        registry,
        webhook_secret,
        operator_key,
        lookup,
        clock,
        boot,
        _create=False,
    ):
        self.directory = Path(path)
        self.path = self.directory / "pipeline.sqlite"
        self.config = {
            "actions": actions,
            "binding": client.binding,
            "task": task,
            "source": source,
            "registry": registry,
            "budget": 1,
        }
        if _create:
            with self.path.open("xb"):
                pass
            with sqlite3.connect(self.path) as db:
                db.executescript(
                    "CREATE TABLE config(payload TEXT); CREATE TABLE state(held INTEGER); INSERT INTO state VALUES(1); CREATE TABLE events(seq INTEGER PRIMARY KEY,kind TEXT);"
                )
                db.execute("INSERT INTO config VALUES(?)", (encode(self.config),))
        if self.path.is_symlink() or not self.path.is_file():
            raise ValueError("pipeline_state")
        with self.db() as db:
            if db.execute("SELECT payload FROM config").fetchall() != [
                (encode(self.config),)
            ]:
                raise ValueError("pipeline_binding")
        self.gateways, self.signals, self.ports = {}, {}, {}
        for name, action in actions.items():
            if name not in ("a", "b"):
                raise ValueError("route_name")
            gateway_path = self.directory / (name + "-gateway.sqlite")
            gateway = (
                Gateway.create(gateway_path, client, action)
                if _create
                else Gateway(gateway_path, client)
            )
            port = CredentialPort(
                self.directory / (name + "-port.sqlite"),
                gateway,
                revoker,
                create=_create,
            )
            args = {
                "project": "composition-project",
                "response_id": "response-" + name,
                "request_id": "request-" + name,
                "webhook_secret": webhook_secret,
                "operator_key": operator_key,
                "lookup": lookup,
                "clock": clock,
                "boot_id": boot,
            }
            sigpath = self.directory / (name + "-signal.sqlite")
            signal = (
                SignalGate.create(sigpath, port, **args)
                if _create
                else SignalGate(sigpath, port, **args)
            )
            self.gateways[name], self.signals[name], self.ports[name] = (
                gateway,
                signal,
                SignalPort(port, signal),
            )
        context_path = self.directory / "context.sqlite"
        self.context = (
            ContextGate.create(
                context_path,
                self.ports,
                actions,
                task=task,
                source=source,
                registry=registry,
                budget=1,
            )
            if _create
            else ContextGate(context_path, self.ports)
        )
        expected = {
            "task": task,
            "source": source,
            "registry": registry,
            "actions": actions,
            "budget": 1,
        }
        if any(self.context.config[k] != v for k, v in expected.items()):
            raise ValueError("context_binding")
        if _create:
            with self.db() as db:
                db.execute("UPDATE state SET held=0")

    def db(self):
        return sqlite3.connect(self.path, timeout=10)

    @contextmanager
    def locked(self):
        with self.path.open("rb") as handle:
            fcntl.flock(handle, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(handle, fcntl.LOCK_UN)

    def held(self):
        with self.db() as db:
            rows = db.execute("SELECT held FROM state").fetchall()
        if rows not in ([(0,)], [(1,)]):
            raise ValueError("pipeline_state")
        return bool(rows[0][0])

    def update(self, operation):
        with self.locked():
            if self.held():
                raise ValueError("pipeline_held")
            with self.db() as db:
                db.execute("UPDATE state SET held=1")
                db.execute("INSERT INTO events(kind) VALUES('update_started')")
            result = operation()
            with self.db() as db:
                db.execute("UPDATE state SET held=0")
                db.execute("INSERT INTO events(kind) VALUES('update_completed')")
            return result

    def stop(self):
        # Trusted caller invokes mutations through update, not from worker proposals.
        for signal in self.signals.values():
            signal.provider_error(
                "misalignment_policy_violation",
                response_id=signal.config["response_id"],
            )

    def resume(self, actor, checkpoint=None, summary=None):
        with self.locked():
            checkpoint = self.context.checkpoint() if checkpoint is None else checkpoint
            summary = (
                dict(self.context.projection(), note="trusted fixture summary")
                if summary is None
                else summary
            )
            return BoundSession(self, self.context.resume(actor, checkpoint, summary))


class BoundSession:
    def __init__(self, pipeline, context):
        self.pipeline, self.context = pipeline, context

    def dispatch(self, action):
        with self.pipeline.locked():
            if self.pipeline.held():
                with self.pipeline.db() as db:
                    db.execute("INSERT INTO events(kind) VALUES('dispatch_held')")
                return {"status": "blocked"}
            return self.context.dispatch(action)
