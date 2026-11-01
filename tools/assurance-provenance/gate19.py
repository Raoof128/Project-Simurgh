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

import rig as _rig  # noqa: F401  (sys.path)
import successor  # noqa: E402
from core import encode  # noqa: E402
from signals import identifier  # noqa: E402


class ProvenanceSession(successor.BoundSession):
    def dispatch(self, action):
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
            return self.context.dispatch(action)


class ProvenancePipeline(successor.Pipeline):
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
