"""Phase 19 additions over the successor pipeline: signal-outage hold and acknowledgement-bound
lease renewal.

``ProvenancePipeline`` mirrors nothing frozen; it subclasses the successor and only changes how a
missing or unreadable signal store is treated during dispatch (held, recorded as
``dispatch_signal_unavailable``). ``ack_renewal`` is a trusted-host operation: after an alert has
resolved ``unrelated`` the lease is renewed only with a signed acknowledgement from the operator
key, recorded once per nonce in a sidecar table. Neither is a model-reachable surface.
"""

import hashlib
import hmac
import json
import math
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-composed"))
sys.path.insert(0, str(ROOT / "tools/assurance-composed-successor"))

import successor  # noqa: E402
from core import encode, valid  # noqa: E402
from signals import identifier  # noqa: E402

APPROVAL_REASONS = (
    "ok",
    "approval_schema",
    "approval_signature",
    "approval_run",
    "approval_action",
    "approval_digest",
    "approval_expired",
    "approval_approver",
    "approval_replay",
)
APPROVAL_FIELDS = {
    "run",
    "action_key",
    "approver_id",
    "content_digest",
    "expires",
    "nonce",
}


def content_digest(action):
    return hashlib.sha256(encode(action).encode()).hexdigest()


def sign_payload(payload, key):
    return hmac.new(key, encode(payload).encode(), hashlib.sha256).hexdigest()


class ApprovalStore:
    """Host-side one-shot approvals: minted nonces and the approver allowlist, in the pipeline
    directory. Minting is a trusted operation; the token's signature under the operator key is
    the authority, and the store makes every nonce single-use."""

    def __init__(self, directory, *, approvers=()):
        self.path = Path(directory) / "provenance.sqlite"
        with sqlite3.connect(self.path) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS approvals(nonce TEXT PRIMARY KEY, action_key TEXT, used INTEGER)"
            )
            db.execute("CREATE TABLE IF NOT EXISTS approvers(id TEXT PRIMARY KEY)")
            for a in approvers:
                db.execute("INSERT OR IGNORE INTO approvers VALUES(?)", (a,))

    def mint(self, action, *, approver_id, nonce, now, key):
        payload = {
            "run": action["run"],
            "action_key": action["id"],
            "approver_id": approver_id,
            "content_digest": content_digest(action),
            "expires": now + 30,
            "nonce": nonce,
        }
        with sqlite3.connect(self.path) as db:
            db.execute("INSERT INTO approvals VALUES(?,?,0)", (nonce, action["id"]))
        return {"payload": payload, "signature": sign_payload(payload, key)}

    def verify(self, action, token, *, now, key):
        if type(token) is not dict or set(token) != {"payload", "signature"}:
            return "approval_schema"
        p, signature = token["payload"], token["signature"]
        if (
            type(p) is not dict
            or set(p) != APPROVAL_FIELDS
            or not identifier(p["nonce"])
            or type(p["expires"]) not in (int, float)
            or not math.isfinite(p["expires"])
            or type(signature) is not str
        ):
            return "approval_schema"
        if not hmac.compare_digest(signature, sign_payload(p, key)):
            return "approval_signature"
        if p["run"] != action["run"]:
            return "approval_run"
        if p["action_key"] != action["id"]:
            return "approval_action"
        if p["content_digest"] != content_digest(action):
            return "approval_digest"
        if not now < p["expires"]:
            return "approval_expired"
        with sqlite3.connect(self.path) as db:
            if not db.execute(
                "SELECT 1 FROM approvers WHERE id=?", (p["approver_id"],)
            ).fetchone():
                return "approval_approver"
            row = db.execute(
                "SELECT used FROM approvals WHERE nonce=?", (p["nonce"],)
            ).fetchone()
        if row is None or row[0]:
            return "approval_replay"
        return "ok"

    def spend(self, nonce):
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE approvals SET used=1 WHERE nonce=?", (nonce,))


def approved_decision(store, action, token, *, now, key):
    """The string a native caller passes to the frozen ``native_delivery``: ``approve`` only for
    a token the store verifies. Pure with respect to the native SDK; not exercised natively here."""
    return (
        "approve" if store.verify(action, token, now=now, key=key) == "ok" else "reject"
    )


def approval_from_tool_result(text):
    """The tool-result reader: a token relayed through an agent-writable channel is parsed and
    returned for verification. It is never trusted as text; a claim without a valid signature
    is just bytes that fail ``verify`` with its own reason."""
    try:
        value = json.loads(text)
    except ValueError:
        return None
    if type(value) is dict and type(value.get("approval")) is dict:
        return value["approval"]
    return None


class ProvenanceSession(successor.BoundSession):
    def dispatch(self, action, approval=None):
        pipe = self.pipeline
        with pipe.locked():
            if pipe.held():
                pipe.record("dispatch_held")
                return {"status": "blocked"}
            try:
                blocking = pipe.blocking_routes()
            except (sqlite3.Error, OSError):
                pipe.record("dispatch_signal_unavailable")
                return {"status": "blocked"}
            if blocking:
                pipe.record(successor.sibling_block_kind(blocking))
                return {"status": "blocked"}
            if approval is None:
                return self.context.dispatch(action)
            reason = pipe.approvals.verify(
                action, approval, now=pipe.clock(), key=pipe.operator_key
            )
            if reason != "ok":
                # An invalid relayed token never reduces authority: it is recorded with its
                # reason and the ordinary grant path decides (otherwise the channel would be a
                # denial lever against already-granted work).
                pipe.record("approval_denied:" + reason)
                return self.context.dispatch(action)
            return self.dispatch_approved(action, approval)

    def dispatch_approved(self, action, token):
        """Re-implements the frozen ``Session.dispatch`` admission with the grant check replaced
        by a verified host-issued approval. Budget, blocking facts, duplicates and the reservation
        are kept exactly; the token is spent at reservation. The most reviewed path in Phase 19."""
        pipe = self.pipeline
        if not valid(action):
            pipe.record("approval_denied:approval_schema")
            return {"status": "blocked"}
        gate = self.context.gate
        action = dict(action)
        action_id = action["id"]
        with gate.db() as db:
            db.execute("BEGIN IMMEDIATE")
            if db.execute("SELECT 1 FROM facts WHERE blocking=1").fetchone():
                gate.event(
                    db,
                    "blocked",
                    actor=self.context.actor,
                    action_id=action_id,
                    reason="fact",
                )
                return {"status": "blocked"}
            previous = db.execute(
                "SELECT status FROM attempts WHERE action_id=?", (action_id,)
            ).fetchone()
            if previous:
                gate.event(
                    db,
                    "duplicate",
                    actor=self.context.actor,
                    action_id=action_id,
                    status=previous[0],
                )
                return {"status": previous[0]}
            if (
                db.execute("SELECT count(*) FROM attempts").fetchone()[0]
                >= gate.config["budget"]
            ):
                gate.event(
                    db,
                    "blocked",
                    actor=self.context.actor,
                    action_id=action_id,
                    reason="budget",
                )
                return {"status": "blocked"}
            db.execute(
                "INSERT INTO attempts VALUES(?,?,?)",
                (action_id, self.context.actor, "unknown"),
            )
            gate.bump(db)
            gate.event(
                db,
                "admitted",
                actor=self.context.actor,
                action_id=action_id,
                approval=token["payload"]["nonce"],
            )
        pipe.approvals.spend(token["payload"]["nonce"])
        pipe.record("approval_admitted")
        try:
            result = gate.hosts[action_id].dispatch(action)
            status = (
                result["status"]
                if result["status"] in ("observed", "unknown", "blocked", "invalid")
                else "unknown"
            )
        except (OSError, ValueError, KeyError, TypeError):
            status = "unknown"
        with gate.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "UPDATE attempts SET status=? WHERE action_id=?", (status, action_id)
            )
            gate.bump(db)
            gate.event(
                db,
                "outcome",
                actor=self.context.actor,
                action_id=action_id,
                status=status,
            )
        return {"status": status}


class ProvenancePipeline(successor.Pipeline):
    def __init__(self, path, *, operator_key, clock, approvers=(), **kwargs):
        super().__init__(path, operator_key=operator_key, clock=clock, **kwargs)
        self.operator_key = operator_key
        self.clock = clock
        self.approvals = ApprovalStore(self.directory, approvers=approvers)

    @classmethod
    def create(cls, path, **kwargs):
        kwargs.pop("approvers", None)
        return super().create(path, **kwargs)

    def resume(self, actor, checkpoint=None, summary=None):
        session = super().resume(actor, checkpoint, summary)
        return ProvenanceSession(self, session.context)


def ack_token(signal, key, now, alert_id, nonce):
    payload = {
        "scope": signal.scope,
        "revision": signal.state()["revision"],
        "alert_id": alert_id,
        "expires": now + 30,
        "nonce": nonce,
    }
    return {
        "payload": payload,
        "signature": hmac.new(
            key, encode(payload).encode(), hashlib.sha256
        ).hexdigest(),
    }


def unrelated_since_ack(signal, ack_db):
    """Alert ids that resolved ``unrelated`` and have not been acknowledged."""
    # The resolved event names the event id; the inbox row carries the alert id and the outcome.
    with signal.db() as db:
        seen = {
            a
            for (a,) in db.execute(
                "SELECT alert_id FROM inbox WHERE status='unrelated'"
            )
        }
    with sqlite3.connect(ack_db) as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS acks(nonce TEXT PRIMARY KEY, alert_id TEXT)"
        )
        acked = {a for (a,) in db.execute("SELECT alert_id FROM acks")}
    return sorted(seen - acked)


def ack_renewal(signal, key, now, ack_db, ack=None):
    """Renew the lease. Refuses (returns the unacknowledged alert ids) when an ``unrelated``
    resolution is outstanding and no valid acknowledgement is presented."""
    outstanding = unrelated_since_ack(signal, ack_db)
    if not outstanding:
        signal.heartbeat()
        return []
    if type(ack) is not dict or set(ack) != {"payload", "signature"}:
        return outstanding
    p, signature = ack["payload"], ack["signature"]
    if (
        type(p) is not dict
        or set(p) != {"scope", "revision", "alert_id", "expires", "nonce"}
        or not identifier(p["nonce"])
        or type(p["revision"]) is not int
        or type(p["expires"]) not in (int, float)
        or not math.isfinite(p["expires"])
    ):
        return outstanding
    expected = hmac.new(key, encode(p).encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(str(signature), expected):
        return outstanding
    if (
        p["scope"] != signal.scope
        or p["revision"] != signal.state()["revision"]
        or not now < p["expires"] <= now + 60
        or p["alert_id"] not in outstanding
    ):
        return outstanding
    with sqlite3.connect(ack_db) as db:
        if db.execute("SELECT 1 FROM acks WHERE nonce=?", (p["nonce"],)).fetchone():
            return outstanding
        db.execute("INSERT INTO acks VALUES(?,?)", (p["nonce"], p["alert_id"]))
    remaining = [a for a in outstanding if a != p["alert_id"]]
    if not remaining:
        signal.heartbeat()
    return remaining


def pipeline_events(pipe):
    with sqlite3.connect(pipe.path) as db:
        return [k for (k,) in db.execute("SELECT kind FROM events ORDER BY seq")]


def signal_events(signal):
    return [e.get("type") for e in signal.events()]


def dumps(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))
