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
    "approval_actor",
    "approval_replay",
)
APPROVAL_FIELDS = {
    "run",
    "action_key",
    "approver_id",
    "content_digest",
    "expires",
    "nonce",
    "actor",
}
RELAY_CAP = 16384
DECODE_ERRORS = (ValueError, TypeError, OverflowError, RecursionError, AttributeError)


def _signature_matches(signature, expected):
    """Constant-time comparison that never raises: a non-string or non-ASCII signature is simply
    not the expected one (P19-REPAIR03: a relayed body must not be able to crash the gate)."""
    if type(signature) is not str:
        return False
    try:
        return hmac.compare_digest(signature.encode(), expected.encode())
    except DECODE_ERRORS:
        return False


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

    def mint(self, action, *, approver_id, nonce, now, key, actor):
        payload = {
            "run": action["run"],
            "action_key": action["id"],
            "approver_id": approver_id,
            "content_digest": content_digest(action),
            "expires": now + 30,
            "nonce": nonce,
            "actor": actor,
        }
        with sqlite3.connect(self.path) as db:
            db.execute("INSERT INTO approvals VALUES(?,?,0)", (nonce, action["id"]))
        return {"payload": payload, "signature": sign_payload(payload, key)}

    def verify(self, action, token, *, now, key, actor=None):
        """One reason string, never an exception: every malformed shape is ``approval_schema``.
        With ``actor`` given, the token must name that actor (``approval_actor``)."""
        try:
            return self._verify(action, token, now=now, key=key, actor=actor)
        except DECODE_ERRORS:
            return "approval_schema"

    def _verify(self, action, token, *, now, key, actor):
        if type(token) is not dict or set(token) != {"payload", "signature"}:
            return "approval_schema"
        p, signature = token["payload"], token["signature"]
        if (
            type(p) is not dict
            or set(p) != APPROVAL_FIELDS
            or not identifier(p["nonce"])
            or type(p["expires"]) not in (int, float)
            or not math.isfinite(p["expires"])
            or abs(p["expires"]) >= 2**53
            or type(p["actor"]) is not str
            or type(signature) is not str
        ):
            return "approval_schema"
        if not _signature_matches(signature, sign_payload(p, key)):
            return "approval_signature"
        if p["run"] != action["run"]:
            return "approval_run"
        if p["action_key"] != action["id"]:
            return "approval_action"
        if p["content_digest"] != content_digest(action):
            return "approval_digest"
        if not now < p["expires"]:
            return "approval_expired"
        if actor is not None and p["actor"] != actor:
            return "approval_actor"
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


def approved_decision(store, action, token, *, now, key, actor=None):
    """The string a native caller passes to the frozen ``native_delivery``: ``approve`` only for
    a token the store verifies, and the nonce is spent in the same call so a second decision on the
    same token is ``reject`` (P19-REPAIR03). Not exercised natively here."""
    if store.verify(action, token, now=now, key=key, actor=actor) != "ok":
        return "reject"
    store.spend(token["payload"]["nonce"])
    return "approve"


def approval_from_tool_result(text):
    """The tool-result reader: a token relayed through an agent-writable channel is parsed and
    returned for verification. It is never trusted as text; a claim without a valid signature
    is just bytes that fail ``verify`` with its own reason."""
    if type(text) is not str or len(text) > RELAY_CAP:
        return None
    try:
        value = json.loads(text)
    except DECODE_ERRORS:
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
                action,
                approval,
                now=pipe.clock(),
                key=pipe.operator_key,
                actor=self.context.actor,
            )
            if reason != "ok":
                # An invalid relayed token never reduces authority: it is recorded with its
                # reason and the ordinary grant path decides (otherwise the channel would be a
                # denial lever against already-granted work).
                pipe.record("approval_denied:" + reason)
                return self.context.dispatch(action)
            return self.dispatch_approved(action, approval)

    def dispatch_approved(self, action, token):
        """Re-implements the frozen ``Session.dispatch`` admission with exactly one term replaced:
        membership of the action in the actor's grant set is replaced by the verified host-issued
        approval. The actor-active, source-match and checkpoint checks (``authority``), the
        configured-action equality, blocking facts, duplicates, budget and the reservation are the
        frozen ones; the token is spent at reservation (P19-REPAIR03)."""
        pipe = self.pipeline
        if not valid(action):
            pipe.record("approval_denied:approval_schema")
            return {"status": "blocked"}
        gate = self.context.gate
        action = dict(action)
        action_id = action["id"]
        with gate.db() as db:
            db.execute("BEGIN IMMEDIATE")
            authority = self.context.authority(db)
            if (
                authority is None
                or encode(action) != encode(gate.actions.get(action_id))
                or db.execute("SELECT 1 FROM facts WHERE blocking=1").fetchone()
            ):
                gate.event(
                    db,
                    "blocked",
                    actor=self.context.actor,
                    action_id=action_id,
                    reason="authority_or_fact",
                )
                pipe.record("approval_denied:authority_or_fact")
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
    try:
        expected = hmac.new(key, encode(p).encode(), hashlib.sha256).hexdigest()
    except DECODE_ERRORS:
        return outstanding
    if not _signature_matches(signature, expected):
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
