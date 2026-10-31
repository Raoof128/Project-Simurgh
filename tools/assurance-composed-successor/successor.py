"""Post-freeze successor to the composed authorization pipeline.

The frozen modules (``signals.py``, ``composition.py``, ``gateway.py``, ``context_gate.py``)
are sha256-pinned by archived research protocols and stay byte-identical. This module
imports them and subclasses them. Where a frozen class hard-wires its collaborators,
only the minimum is re-implemented and the docstring names the frozen method it mirrors.

Fixes over the frozen pipeline:

1. ``SuccessorSignalGate.receive`` folds header names to lowercase before delegating, and
   rejects names that collide after folding, so a genuine signed alert with ``Webhook-Id``
   latches instead of raising ``invalid_webhook_event``.
2. ``Pipeline`` takes required per-route ``bindings`` (provider ``response_id`` and
   ``request_id``) and stores them in its persisted config.
3. A latched route blocks dispatch on every route, and ``stop()`` attempts every route.
4. Cross-process locks are taken on ``<db>.lock`` sidecar files, never on the SQLite file.

No study has been run against this module.
"""

import fcntl
import hashlib
import os
import stat
import sys
from collections.abc import Mapping
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for _name in (
    "assurance-connector",
    "assurance-signals",
    "assurance-context",
    "assurance-credentials",
    "assurance-composed",
):
    sys.path.insert(0, str(ROOT / "tools" / _name))
import composition as frozen  # noqa: E402
from context_gate import ContextGate  # noqa: E402
from core import encode  # noqa: E402
from gateway import Gateway  # noqa: E402
from signals import SignalGate, identifier  # noqa: E402

restart_token = frozen.restart_token
CredentialPort = frozen.CredentialPort

ROUTES = ("a", "b")
BINDING_FIELDS = {"response_id", "request_id"}
# The only header names the signature check reads; every other name is irrelevant to it.
WEBHOOK_HEADERS = frozenset({"webhook-id", "webhook-timestamp", "webhook-signature"})


@contextmanager
def sidecar_lock(path):
    """Exclusive cross-process lock on ``<path>.lock``, created if missing.

    ``flock`` on the SQLite file itself makes SQLite on the same file fail with
    "database is locked" on Darwin (the lock types are independent on Linux), so the lock
    lives beside the database. A symlinked or non-regular lock path is refused.
    """
    lock = Path(str(path) + ".lock")
    if lock.is_symlink():
        raise ValueError("lock_state")
    try:
        fd = os.open(lock, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    except OSError as exc:
        raise ValueError("lock_state") from exc
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise ValueError("lock_state")
        fcntl.flock(fd, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(fd, fcntl.LOCK_UN)
    finally:
        os.close(fd)


def check_bindings(actions, bindings):
    """Exact per-route provider identifiers; returns a normalised copy."""
    if (
        type(actions) is not dict
        or type(bindings) is not dict
        or set(bindings) != set(actions)
        or not set(bindings) <= set(ROUTES)
    ):
        raise ValueError("bindings")
    for binding in bindings.values():
        if (
            type(binding) is not dict
            or set(binding) != BINDING_FIELDS
            or not all(identifier(binding[k]) for k in BINDING_FIELDS)
        ):
            raise ValueError("bindings")
    return {
        name: {k: binding[k] for k in sorted(BINDING_FIELDS)}
        for name, binding in bindings.items()
    }


class SidecarGateway(Gateway):
    """Gateway whose admission lock is a sidecar file instead of the SQLite file."""

    @contextmanager
    def admission(self):
        with sidecar_lock(self.path):
            yield


class SuccessorSignalGate(SignalGate):
    def __init__(self, path, host, **kwargs):
        """Mirrors the frozen constructor with two repairs.

        The frozen gate accepts a symlinked signal database (``is_file`` follows links) while
        every sibling file refuses one (audit A1-8); and after a crash between the stop latch and
        the revoke call the credential stayed live for ever, because nothing re-drives revocation
        on open (audit A1-4). Both are handled here, before and after the frozen constructor.
        """
        if Path(path).is_symlink():
            raise ValueError("signal_state")
        super().__init__(path, host, **kwargs)
        self._ensure_revoked()

    def _ensure_revoked(self):
        """A latched route whose revocation never ran (or ran into an unknown) is revoked now."""
        if not self.state()["terminal"]:
            return
        kinds = {event["type"] for event in self.events()}
        if "host_revoked" in kinds:
            return
        self._revoke()

    def receive(self, raw, headers):
        """Normalise header names before the frozen verification and event-id check.

        The OpenAI SDK matches ``webhook-id`` case-insensitively but the frozen
        ``event["id"] != headers.get("webhook-id")`` is case-sensitive, so a genuinely
        signed ``Webhook-Id`` alert raised and never latched. Only the three names the
        verification reads are folded (ASCII only: ``str.lower`` maps U+212A to ``k``, so a
        non-ASCII name that folds onto one of them is refused); two of them that fold
        together are ambiguous and refused. Every other header is passed through untouched
        (audit A1-1: an unrelated ``Content-Type``/``content-type`` pair, or a non-ASCII
        name, must not drop a signed alert).

        A bytes body is decoded as UTF-8. A signature-valid alert whose body the frozen gate
        cannot parse is held ``pending`` under its webhook id, not discarded (audit A1-2).
        """
        if isinstance(raw, (bytes, bytearray)):
            try:
                raw = bytes(raw).decode("utf-8")
            except UnicodeDecodeError as exc:
                raise ValueError("invalid_webhook") from exc
        # Frameworks hand over header mappings that are not plain dicts (``http.server`` gives an
        # ``email.message.Message``); any mapping is read, the frozen gate still receives a dict.
        if not isinstance(headers, Mapping):
            raise ValueError("invalid_webhook")
        folded = {}
        for name, value in headers.items():
            if type(name) is not str:
                raise ValueError("invalid_webhook")
            key = name.lower()
            if key in WEBHOOK_HEADERS:
                if not name.isascii() or key in folded:
                    raise ValueError("invalid_webhook")
                folded[key] = value
            else:
                folded[name] = value
        try:
            outcome = super().receive(raw, folded)
        except ValueError as exc:
            # Raised by the frozen gate only AFTER the signature verified, so the alert is
            # authentic; a verifier that forgets an authentic alert fails open.
            if str(exc) != "invalid_webhook_event":
                raise
            return self._hold_unparseable(raw, folded)
        # A replayed stop event answers "stopped" from the inbox without revoking (A1-4).
        if outcome == "stopped":
            self._ensure_revoked()
        return outcome

    def _hold_unparseable(self, raw, headers):
        digest = hashlib.sha256(raw.encode()).hexdigest()
        wid = headers.get("webhook-id")
        event_id = wid if identifier(wid) else "unparseable-" + digest[:32]
        with self.db() as db:
            prior = db.execute(
                "SELECT digest,status FROM inbox WHERE id=?", (event_id,)
            ).fetchone()
            if prior and prior[0] != digest:
                raise ValueError("event_id_collision")
            if prior:
                return prior[1]
            # An empty alert id marks the row as unparseable; resolve() below never looks
            # it up, so it stays pending until the host reconciles it out of band.
            db.execute("INSERT INTO inbox VALUES(?,?,?,'pending')", (event_id, digest, ""))
            self._emit(db, "alert_unparseable_pending", event_id=event_id, body_sha256=digest)
        return "pending"

    def resolve(self, event_id):
        with self.db() as db:
            row = db.execute(
                "SELECT alert_id,status FROM inbox WHERE id=?", (event_id,)
            ).fetchone()
        if row is not None and row[0] == "" and row[1] == "pending":
            return "pending"
        return super().resolve(event_id)


def sibling_block_kind(blocking):
    """``dispatch_sibling_latched`` when any route is terminal, else ``dispatch_sibling_pending``."""
    return (
        "dispatch_sibling_latched"
        if any(state["terminal"] for state in blocking.values())
        else "dispatch_sibling_pending"
    )


class GuardedSignalPort(frozen.SignalPort):
    """Mirrors frozen ``SignalPort``; refuses dispatch while any route is latched.

    The context session reaches the host through this port, so the sibling rule also
    holds for callers that use ``BoundSession.context`` directly.
    """

    def __init__(self, port, signal, pipeline):
        super().__init__(port, signal)
        self.pipeline = pipeline

    def dispatch(self, action):
        blocking = self.pipeline.blocking_routes()
        if blocking:
            self.pipeline.record(sibling_block_kind(blocking))
            return {"status": "blocked"}
        return super().dispatch(action)


class BoundSession(frozen.BoundSession):
    def dispatch(self, action):
        """Mirrors frozen ``BoundSession.dispatch``, plus the any-route latch check."""
        with self.pipeline.locked():
            if self.pipeline.held():
                self.pipeline.record("dispatch_held")
                return {"status": "blocked"}
            blocking = self.pipeline.blocking_routes()
            if blocking:
                self.pipeline.record(sibling_block_kind(blocking))
                return {"status": "blocked"}
            return self.context.dispatch(action)


class Pipeline(frozen.Pipeline):
    @classmethod
    def create(cls, path, **kwargs):
        # Validate before the directory exists so a bad binding leaves nothing behind.
        check_bindings(kwargs.get("actions"), kwargs.get("bindings"))
        return super().create(path, **kwargs)

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
        bindings,
        _create=False,
    ):
        """Mirrors frozen ``Pipeline.__init__``.

        Differences: required ``bindings`` replace the hard-coded ``response-<name>`` and
        ``request-<name>`` identifiers and are part of the persisted config (a reopen must
        present the same ones); gateways, signal gates and ports are the successor classes.
        """
        bindings = check_bindings(actions, bindings)
        self.directory = Path(path)
        self.path = self.directory / "pipeline.sqlite"
        self.config = {
            "actions": actions,
            "binding": client.binding,
            "task": task,
            "source": source,
            "registry": registry,
            "budget": 1,
            "bindings": bindings,
        }
        if _create:
            with self.path.open("xb"):
                pass
            with self.db() as db:
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
            if name not in ROUTES:
                raise ValueError("route_name")
            gateway_path = self.directory / (name + "-gateway.sqlite")
            gateway = (
                SidecarGateway.create(gateway_path, client, action)
                if _create
                else SidecarGateway(gateway_path, client)
            )
            port = CredentialPort(
                self.directory / (name + "-port.sqlite"),
                gateway,
                revoker,
                create=_create,
            )
            args = {
                "project": "composition-project",
                "response_id": bindings[name]["response_id"],
                "request_id": bindings[name]["request_id"],
                "webhook_secret": webhook_secret,
                "operator_key": operator_key,
                "lookup": lookup,
                "clock": clock,
                "boot_id": boot,
            }
            sigpath = self.directory / (name + "-signal.sqlite")
            signal = (
                SuccessorSignalGate.create(sigpath, port, **args)
                if _create
                else SuccessorSignalGate(sigpath, port, **args)
            )
            self.gateways[name], self.signals[name], self.ports[name] = (
                gateway,
                signal,
                GuardedSignalPort(port, signal, self),
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

    @contextmanager
    def locked(self):
        """Replaces frozen ``Pipeline.locked``: sidecar lock, not the SQLite file."""
        with sidecar_lock(self.path):
            yield

    def record(self, kind):
        with self.db() as db:
            db.execute("INSERT INTO events(kind) VALUES(?)", (kind,))

    def latched_routes(self):
        return sorted(n for n, s in self.signals.items() if s.state()["terminal"])

    def blocking_routes(self):
        """Routes that must hold every sibling: latched, or carrying an unresolved alert.

        The M6 rationale (one shared credential, alerts per route) applies equally while an
        alert is still pending (audit A1-3): until lookup resolves it, no route may land an
        effect on that credential.
        """
        states = {n: s.state() for n, s in self.signals.items()}
        return {n: st for n, st in states.items() if st["terminal"] or st["pending"]}

    def stop(self):
        """Replaces frozen ``Pipeline.stop``: every route is attempted.

        The frozen loop let one failing revoker abort the rest. Here each route's latch is
        attempted regardless, then the first error is re-raised.
        """
        errors = []
        for signal in self.signals.values():
            try:
                signal.provider_error(
                    "misalignment_policy_violation",
                    response_id=signal.config["response_id"],
                )
            except BaseException as exc:
                errors.append(exc)
        if errors:
            raise errors[0]

    def resume(self, actor, checkpoint=None, summary=None):
        """Mirrors frozen ``Pipeline.resume`` but returns the successor ``BoundSession``."""
        with self.locked():
            checkpoint = self.context.checkpoint() if checkpoint is None else checkpoint
            summary = (
                dict(self.context.projection(), note="trusted fixture summary")
                if summary is None
                else summary
            )
            return BoundSession(self, self.context.resume(actor, checkpoint, summary))
