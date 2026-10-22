"""Trusted local signal gate. Synthetic fixtures do not validate provider delivery."""

import base64
import hashlib
import hmac
import math
import sqlite3
import sys
import time
from contextlib import contextmanager
from pathlib import Path

import openai

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-connector"))
from core import decode, encode


def identifier(value):
    return type(value) is str and 0 < len(value) <= 256


class SignalGate:
    @classmethod
    def create(cls, path, host, **kwargs):
        path = Path(path)
        with path.open("xb"):
            pass
        with sqlite3.connect(path) as db:
            db.executescript("""
                CREATE TABLE config(payload TEXT NOT NULL);
                CREATE TABLE state(revision INTEGER, terminal INTEGER, paused INTEGER,
                    lease_until REAL, last_seen REAL, boot TEXT);
                INSERT INTO state VALUES(0,0,1,0,0,'');
                CREATE TABLE inbox(id TEXT PRIMARY KEY, digest TEXT NOT NULL,
                    alert_id TEXT NOT NULL, status TEXT NOT NULL);
                CREATE TABLE decisions(nonce TEXT PRIMARY KEY);
                CREATE TABLE events(seq INTEGER PRIMARY KEY, payload TEXT NOT NULL);
            """)
        return cls(path, host, _initialize=True, **kwargs)

    def __init__(
        self,
        path,
        host,
        *,
        project,
        response_id,
        request_id,
        webhook_secret,
        operator_key,
        lookup,
        clock=time.monotonic,
        boot_id=None,
        _initialize=False,
    ):
        self.path, self.host = Path(path), host
        self.clock = clock
        self.boot = (
            boot_id or Path("/proc/sys/kernel/random/boot_id").read_text().strip()
        )
        if (
            not all(
                identifier(v) for v in (project, response_id, request_id, self.boot)
            )
            or type(webhook_secret) is not str
            or len(webhook_secret) < 20
            or type(operator_key) is not bytes
            or len(operator_key) < 32
            or not callable(lookup)
            or not self.path.is_file()
        ):
            raise ValueError("invalid_gate_configuration")
        webhook_key = (
            base64.b64decode(webhook_secret[6:], validate=True)
            if webhook_secret.startswith("whsec_")
            else webhook_secret.encode()
        )
        if len(webhook_key) < 32 or hmac.compare_digest(webhook_key, operator_key):
            raise ValueError("separate_strong_signing_keys_required")
        with sqlite3.connect(host.path) as db:
            identity, approved, control, _ = db.execute(
                "SELECT * FROM policy"
            ).fetchone()
        if control != "enforced":
            raise ValueError("signals_require_enforced_host")
        self.config = {
            "project": project,
            "response_id": response_id,
            "request_id": request_id,
            "identity": decode(identity),
            "approved": decode(approved),
            "webhook_key_sha256": hashlib.sha256(webhook_secret.encode()).hexdigest(),
            "operator_key_sha256": hashlib.sha256(operator_key).hexdigest(),
        }
        self.scope = hashlib.sha256(
            encode({"config": self.config, "boot": self.boot}).encode()
        ).hexdigest()
        self.secret, self.operator_key, self.lookup = (
            webhook_secret,
            operator_key,
            lookup,
        )
        with self.db() as db:
            rows = db.execute("SELECT payload FROM config").fetchall()
            if _initialize and not rows:
                db.execute("INSERT INTO config VALUES(?)", (encode(self.config),))
            elif rows != [(encode(self.config),)]:
                raise ValueError("configuration_rebind")

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def _now(self):
        value = self.clock()
        if type(value) not in (float, int) or not math.isfinite(value) or value < 0:
            raise ValueError("invalid_clock")
        return value

    def _emit(self, db, kind, **fields):
        db.execute(
            "INSERT INTO events(payload) VALUES(?)",
            (encode(dict(type=kind, identity=self.config["identity"], **fields)),),
        )

    def _health(self, db, now):
        _revision, _terminal, paused, until, last, boot = db.execute(
            "SELECT * FROM state"
        ).fetchone()
        healthy = boot == self.boot and last <= now < until
        if not healthy and not paused:
            db.execute("UPDATE state SET paused=1,revision=revision+1")
            self._emit(db, "monitor_paused")
        return healthy

    def heartbeat(self):
        with self.db() as db:
            now = self._now()
            self._health(db, now)
            db.execute(
                "UPDATE state SET lease_until=?,last_seen=?,boot=?",
                (now + 30, now, self.boot),
            )
            self._emit(db, "heartbeat")

    def state(self):
        with self.db() as db:
            revision, terminal, paused, _until, _last, _boot = db.execute(
                "SELECT * FROM state"
            ).fetchone()
            pending = db.execute(
                "SELECT count(*) FROM inbox WHERE status='pending'"
            ).fetchone()[0]
        return {
            "revision": revision,
            "terminal": bool(terminal),
            "paused": bool(paused),
            "pending": pending,
        }

    def restart(self, decision):
        if type(decision) is not dict or set(decision) != {"payload", "signature"}:
            raise ValueError("invalid_restart_decision")
        p, signature = decision["payload"], decision["signature"]
        if (
            type(p) is not dict
            or set(p) != {"scope", "revision", "expires", "nonce"}
            or not identifier(p["nonce"])
            or type(p["revision"]) is not int
            or type(p["expires"]) not in (int, float)
            or not math.isfinite(p["expires"])
            or type(signature) is not str
        ):
            raise ValueError("invalid_restart_decision")
        expected = hmac.new(
            self.operator_key, encode(p).encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid_operator_signature")
        with self.db() as db:
            now = self._now()
            healthy = self._health(db, now)
            revision, terminal, paused, *_ = db.execute(
                "SELECT * FROM state"
            ).fetchone()
            pending = db.execute(
                "SELECT count(*) FROM inbox WHERE status='pending'"
            ).fetchone()[0]
            if (
                p["scope"] != self.scope
                or p["revision"] != revision
                or not now < p["expires"] <= now + 60
                or terminal
                or not paused
                or pending
                or not healthy
                or db.execute(
                    "SELECT 1 FROM decisions WHERE nonce=?", (p["nonce"],)
                ).fetchone()
            ):
                self._emit(db, "restart_denied")
                return False
            db.execute("INSERT INTO decisions VALUES(?)", (p["nonce"],))
            db.execute("UPDATE state SET paused=0,revision=revision+1")
            self._emit(db, "operator_restart", nonce=p["nonce"])
        return True

    def _stop(self, db, source):
        if not db.execute("SELECT terminal FROM state").fetchone()[0]:
            db.execute("UPDATE state SET terminal=1,paused=1,revision=revision+1")
            self._emit(db, "stop_latched", source=source)

    def _revoke(self):
        try:
            self.host.revoke()
            kind = "host_revoked"
        except (OSError, sqlite3.Error):
            kind = "revocation_unknown"
        with self.db() as db:
            self._emit(db, kind)

    def provider_error(self, code, *, response_id):
        # Called by trusted transport error handling, never by a model proposal.
        if (
            code != "misalignment_policy_violation"
            or response_id != self.config["response_id"]
        ):
            return False
        with self.db() as db:
            self._stop(db, "provider_error")
        self._revoke()
        return True

    def receive(self, raw, headers):
        if (
            type(raw) is not str
            or len(raw.encode()) > 16384
            or type(headers) is not dict
        ):
            raise ValueError("invalid_webhook")
        with openai.OpenAI(
            api_key="synthetic-unused-no-network", webhook_secret=self.secret
        ) as client:
            try:
                client.webhooks.verify_signature(raw, headers)
            except (ValueError, openai.InvalidWebhookSignatureError) as exc:
                raise ValueError("invalid_webhook_signature") from exc
        event = decode(raw)
        if (
            type(event) is not dict
            or set(event) != {"object", "id", "type", "created_at", "data"}
            or event["object"] != "event"
            or event["type"] != "safety.alert.created"
            or not identifier(event["id"])
            or event["id"] != headers.get("webhook-id")
            or type(event["created_at"]) is not int
            or event["created_at"] < 0
            or type(event["data"]) is not dict
            or set(event["data"]) != {"id"}
            or not identifier(event["data"]["id"])
        ):
            raise ValueError("invalid_webhook_event")
        digest = hashlib.sha256(raw.encode()).hexdigest()
        with self.db() as db:
            prior = db.execute(
                "SELECT digest,status FROM inbox WHERE id=?", (event["id"],)
            ).fetchone()
            if prior and prior[0] != digest:
                raise ValueError("event_id_collision")
            if prior:
                return prior[1]
            db.execute(
                "INSERT INTO inbox VALUES(?,?,?,'pending')",
                (event["id"], digest, event["data"]["id"]),
            )
            self._emit(db, "alert_pending", event_id=event["id"], body_sha256=digest)
        return self.resolve(event["id"])

    def resolve(self, event_id):
        with self.db() as db:
            row = db.execute(
                "SELECT alert_id,status FROM inbox WHERE id=?", (event_id,)
            ).fetchone()
            if row is None:
                raise ValueError("unknown_event")
            if row[1] != "pending":
                return row[1]
        try:
            detail = self.lookup(row[0])
        except (OSError, ValueError):
            return "pending"
        if (
            type(detail) is not dict
            or detail.get("id") != row[0]
            or not identifier(detail.get("response_id"))
            or not identifier(detail.get("request_id"))
            or type(detail.get("request_paused")) is not bool
            or (
                detail.get("reason") is not None
                and (type(detail["reason"]) is not str or len(detail["reason"]) > 2048)
            )
        ):
            return "pending"
        matches = [detail[k] == self.config[k] for k in ("response_id", "request_id")]
        if any(matches) and not all(matches):
            return "pending"
        outcome = "stopped" if all(matches) else "unrelated"
        with self.db() as db:
            current = db.execute(
                "SELECT status FROM inbox WHERE id=?", (event_id,)
            ).fetchone()[0]
            if current != "pending":
                return current
            db.execute("UPDATE inbox SET status=? WHERE id=?", (outcome, event_id))
            self._emit(
                db,
                "alert_resolved",
                event_id=event_id,
                outcome=outcome,
                request_paused=detail["request_paused"],
                reason=detail.get("reason"),
            )
            if outcome == "stopped":
                self._stop(db, "provider_alert")
        if outcome == "stopped":
            self._revoke()
        return outcome

    def dispatch(self, action):
        with self.db() as db:
            now = self._now()
            healthy = self._health(db, now)
            terminal, paused = db.execute(
                "SELECT terminal,paused FROM state"
            ).fetchone()
            pending = db.execute(
                "SELECT count(*) FROM inbox WHERE status='pending'"
            ).fetchone()[0]
            if terminal or paused or pending or not healthy:
                self._emit(db, "dispatch_blocked")
                return {"status": "blocked"}
            db.execute("UPDATE state SET last_seen=?", (now,))
            self._emit(db, "dispatch_admitted")
        # Already admitted work may finish after a later stop latch. Host revoke
        # serializes separately with its bounded RPC; never claim cancellation.
        result = self.host.dispatch(action)
        with self.db() as db:
            self._emit(db, "dispatch_result", result=result)
        return result

    def events(self):
        with self.db() as db:
            return [
                dict(seq=seq, **decode(payload))
                for seq, payload in db.execute(
                    "SELECT seq,payload FROM events ORDER BY seq"
                )
            ]
