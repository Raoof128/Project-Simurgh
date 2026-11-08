"""Store19: the Phase 19c fork of the frozen credential receiver (design §4.5, §4.3, §4.8, §4.10).

Forked, not subclassed: the frozen ``tools/assurance-credentials/service.py`` is pinned by six
archived protocols and its tables have no run, holder, manifest, grant, limit or administrative
flag. The frozen reasons keep their names and their order; every added check runs after
``credential_inactive`` and before the effect insert, so a reason this fork emits is new, not a
relabelled frozen one. Driven in-process under a logical clock; the HTTP transport is not forked.
This is not a production identity provider.
"""

import hashlib
import hmac
import posixpath
import sqlite3
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-connector"))
from core import FIELDS, IDENTITY, encode  # noqa: E402

POLICIES = ("session_snapshot", "continuous")
OPERATIONS = ("send_report", "write_path")
REASONS = (
    "request",
    "session",
    "session_inactive",
    "scope",
    "credential_inactive",
    "idempotency_conflict",
    "wrong_binding",
    "run",
    "admin_revoked",
    "grant_scope",
    "effect_denied",
    "per_call_limit_exceeded",
    "cumulative_limit_exceeded",
    "substituted_input",
)


def hashed(value):
    return hashlib.sha256(value.encode()).hexdigest()


def label(value):
    return type(value) is str and 0 < len(value) <= 128


def token(value):
    return type(value) is str and 32 <= len(value) <= 256


def integer(value):
    return type(value) is int and 0 <= value <= 2**53 - 1


def valid(action):
    return (
        type(action) is dict
        and set(action) == FIELDS
        and all(type(x) is str and 0 < len(x) <= 512 for x in action.values())
        and action["operation"] in OPERATIONS
    )


def key_for(action):
    return hashlib.sha256(
        encode({k: action[k] for k in (*sorted(IDENTITY), "id")}).encode()
    ).hexdigest()


def canonical(resource):
    """Receiver-side canonical form of a resource: percent-decoding to a fixed point, dot-segment
    removal and duplicate-slash collapse for paths, trailing slash stripped. Case is significant
    for paths (P19-REPAIR03: on a case-sensitive filesystem ``/A`` and ``/a`` are different objects,
    so folding would widen a grant); non-path resource labels are folded as before."""
    value = resource
    for _ in range(8):
        decoded = urllib.parse.unquote(value)
        if decoded == value:
            break
        value = decoded
    if not value.startswith("/"):
        value = value.lower()
    if value.startswith("/"):
        # POSIX keeps a leading double slash as implementation-defined; a receiver does not.
        value = "/" + posixpath.normpath(value).lstrip("/")
        if len(value) > 1:
            value = value.rstrip("/")
    return value


def holder_proof(holder, key):
    return hmac.new(holder.encode(), key.encode(), hashlib.sha256).hexdigest()


class Store19:
    def __init__(self, path, session_key):
        self.path = Path(path)
        self.session_key = session_key
        if self.path.is_symlink() or not self.path.is_file() or not token(session_key):
            raise ValueError("store")

    @classmethod
    def create(cls, path, policy, *, session_key, now=100, issuer="p19-issuer"):
        if (
            policy not in POLICIES
            or not integer(now)
            or not token(session_key)
            or not label(issuer)
        ):
            raise ValueError("configuration")
        path = Path(path)
        with path.open("xb"):
            pass
        with sqlite3.connect(path) as db:
            db.executescript("""
            CREATE TABLE state(id INTEGER PRIMARY KEY CHECK(id=1),policy TEXT NOT NULL,issuer TEXT NOT NULL,now INTEGER NOT NULL);
            CREATE TABLE credentials(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,subject TEXT NOT NULL,tenant TEXT NOT NULL,resource TEXT NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL,run TEXT NOT NULL,admin_revoked INTEGER NOT NULL);
            CREATE TABLE sessions(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,credential_id TEXT NOT NULL,subject TEXT NOT NULL,tenant TEXT NOT NULL,resource TEXT NOT NULL,expires INTEGER NOT NULL,cancelled INTEGER NOT NULL,holder_hash TEXT NOT NULL);
            CREATE TABLE effects(key TEXT PRIMARY KEY,payload TEXT NOT NULL,credential_id TEXT NOT NULL,session_id TEXT NOT NULL,requested_resource TEXT NOT NULL);
            CREATE TABLE events(seq INTEGER PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL);
            CREATE TABLE grants(credential_id TEXT NOT NULL,operation TEXT NOT NULL,resource TEXT NOT NULL,PRIMARY KEY(credential_id,operation,resource));
            CREATE TABLE manifest(credential_id TEXT NOT NULL,name TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(credential_id,name,digest));
            CREATE TABLE limits(credential_id TEXT PRIMARY KEY,per_call INTEGER NOT NULL,running INTEGER NOT NULL,used INTEGER NOT NULL);
            """)
            db.execute("INSERT INTO state VALUES(1,?,?,?)", (policy, issuer, now))
        return cls(path, session_key)

    def db(self):
        return sqlite3.connect(self.path, timeout=10)

    def now(self, db):
        return db.execute("SELECT now FROM state WHERE id=1").fetchone()[0]

    def event(self, db, kind, **data):
        return db.execute(
            "INSERT INTO events(kind,payload) VALUES(?,?)", (kind, encode(data))
        ).lastrowid

    # trusted administration --------------------------------------------------
    def issue(self, credential_id, secret, subject, tenant, resource, expires, *, run):
        if (
            not all(label(x) for x in (credential_id, subject, tenant, resource, run))
            or not token(secret)
            or not integer(expires)
            or hmac.compare_digest(hashed(secret), hashed(self.session_key))
        ):
            raise ValueError("credential")
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            if expires <= self.now(db):
                raise ValueError("credential_expiry")
            db.execute(
                "INSERT INTO credentials VALUES(?,?,?,?,?,?,0,?,0)",
                (
                    credential_id,
                    hashed(secret),
                    subject,
                    tenant,
                    resource,
                    expires,
                    run,
                ),
            )
            self.event(db, "issued", credential_id=credential_id, run=run)
        return {"status": "issued", "credential_id": credential_id}

    def allow(self, credential_id, operation, resource):
        if (
            operation not in OPERATIONS
            or not label(credential_id)
            or not label(resource)
        ):
            raise ValueError("grant")
        with self.db() as db:
            db.execute(
                "INSERT OR IGNORE INTO grants VALUES(?,?,?)",
                (credential_id, operation, canonical(resource)),
            )
            self.event(db, "granted", credential_id=credential_id, operation=operation)

    def set_limits(self, credential_id, *, per_call, running):
        if not integer(per_call) or not integer(running):
            raise ValueError("limits")
        with self.db() as db:
            db.execute(
                "INSERT OR REPLACE INTO limits VALUES(?,?,?,0)",
                (credential_id, per_call, running),
            )

    def admin_revoke(self, credential_id):
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            if not db.execute(
                "UPDATE credentials SET admin_revoked=1 WHERE id=?", (credential_id,)
            ).rowcount:
                return {"status": "not_found"}
            self.event(db, "admin_revoked", credential_id=credential_id)
        return {"status": "admin_revoked", "credential_id": credential_id}

    def revoke(self, credential_id):
        if not label(credential_id):
            raise ValueError("credential_id")
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            if not db.execute(
                "UPDATE credentials SET revoked=1 WHERE id=?", (credential_id,)
            ).rowcount:
                return {"status": "not_found"}
            seq = self.event(db, "revoked", credential_id=credential_id)
            issuer = db.execute("SELECT issuer FROM state").fetchone()[0]
        return {
            "status": "revoked",
            "credential_id": credential_id,
            "seq": seq,
            "issuer": issuer,
        }

    def list_input(self, credential_id, name, digest):
        if not label(credential_id) or not label(name) or not token(digest):
            raise ValueError("manifest")
        with self.db() as db:
            db.execute(
                "INSERT OR IGNORE INTO manifest VALUES(?,?,?)",
                (credential_id, name, digest),
            )
            self.event(db, "listed", credential_id=credential_id, name=name)

    # sessions --------------------------------------------------------------
    def login(self, secret, ttl=600):
        if not token(secret):
            return {"status": "denied", "reason": "credential"}
        if type(ttl) is not int or not 1 <= ttl <= 3600:
            raise ValueError("session_ttl")
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            now = self.now(db)
            row = db.execute(
                "SELECT id,subject,tenant,resource,expires,revoked FROM credentials WHERE token_hash=?",
                (hashed(secret),),
            ).fetchone()
            if row is None or row[5] or now >= row[4]:
                self.event(db, "login_denied")
                return {"status": "denied", "reason": "credential"}
            cid, subject, tenant, resource, _, _ = row
            sid = "s" + str(
                db.execute("SELECT count(*) FROM sessions").fetchone()[0] + 1
            )
            issuer = db.execute("SELECT issuer FROM state").fetchone()[0]
            bearer = hmac.new(
                self.session_key.encode(),
                ("issuer:" + issuer + ":session:" + sid).encode(),
                hashlib.sha256,
            ).hexdigest()
            # the holder secret is sender-constraining material returned once at login
            holder = hmac.new(
                self.session_key.encode(), ("holder:" + sid).encode(), hashlib.sha256
            ).hexdigest()
            db.execute(
                "INSERT INTO sessions VALUES(?,?,?,?,?,?,?,0,?)",
                (
                    sid,
                    hashed(bearer),
                    cid,
                    subject,
                    tenant,
                    resource,
                    now + ttl,
                    hashed(holder),
                ),
            )
            self.event(db, "session", credential_id=cid, session_id=sid)
            return {
                "status": "issued",
                "session_id": sid,
                "credential_id": cid,
                "secret": bearer,
                "issuer": issuer,
                "holder": holder,
            }

    def _session(self, db, secret):
        return db.execute(
            "SELECT id,credential_id,subject,tenant,resource,expires,cancelled,holder_hash FROM sessions WHERE token_hash=?",
            (hashed(secret),),
        ).fetchone()

    # effects ----------------------------------------------------------------
    def send(self, secret, key, action, *, proof=None):
        if not token(secret) or not valid(action) or key != key_for(action):
            return {"status": "denied", "reason": "request"}
        action = dict(action)
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            now = self.now(db)
            row = self._session(db, secret)
            reason = None
            cred = None
            if row is None:
                reason = "session"
            elif row[6] or now >= row[5]:
                reason = "session_inactive"
            elif (action["principal"], action["tenant"], action["resource"]) != tuple(
                row[2:5]
            ) and action["operation"] == "send_report":
                reason = "scope"
            elif (action["principal"], action["tenant"]) != tuple(row[2:4]):
                reason = "scope"
            else:
                cred = db.execute(
                    "SELECT expires,revoked,run,admin_revoked FROM credentials WHERE id=?",
                    (row[1],),
                ).fetchone()
                if db.execute("SELECT policy FROM state").fetchone()[
                    0
                ] == "continuous" and (cred is None or cred[1] or now >= cred[0]):
                    reason = "credential_inactive"
            # ---- Phase 19c checks, after every frozen reason ----
            if reason is None:
                expected_proof = holder_proof_from_hash(row[7], key, db, row[0], self)
                if (
                    expected_proof is None
                    or type(proof) is not str
                    or not hmac.compare_digest(hashed(proof), hashed(expected_proof))
                ):
                    reason = "wrong_binding"
                elif action["run"] != cred[2]:
                    reason = "run"
                elif cred[3]:
                    reason = "admin_revoked"
                else:
                    ops = {
                        o
                        for (o,) in db.execute(
                            "SELECT operation FROM grants WHERE credential_id=?",
                            (row[1],),
                        )
                    }
                    if action["operation"] not in ops:
                        reason = "grant_scope"
                    elif not db.execute(
                        "SELECT 1 FROM grants WHERE credential_id=? AND operation=? AND resource=?",
                        (row[1], action["operation"], canonical(action["resource"])),
                    ).fetchone():
                        reason = "effect_denied"
                    else:
                        lim = db.execute(
                            "SELECT per_call,running,used FROM limits WHERE credential_id=?",
                            (row[1],),
                        ).fetchone()
                        if lim is not None:
                            size = len(action["content"].encode())
                            if size > lim[0]:
                                reason = "per_call_limit_exceeded"
                            elif lim[2] + size > lim[1]:
                                reason = "cumulative_limit_exceeded"
            if reason:
                self.event(db, "denied", reason=reason, key=key)
                return {"status": "denied", "reason": reason}
            previous = db.execute(
                "SELECT payload FROM effects WHERE key=?", (key,)
            ).fetchone()
            # the effect records the resource the receiver authorised (the canonical form), and the
            # bytes the caller sent beside it (P19-REPAIR03): a consumer never acts on an alias
            payload = encode(dict(action, resource=canonical(action["resource"])))
            if previous and previous[0] != payload:
                self.event(db, "denied", reason="idempotency_conflict", key=key)
                return {"status": "denied", "reason": "idempotency_conflict"}
            if previous is None:
                db.execute(
                    "INSERT INTO effects VALUES(?,?,?,?,?)",
                    (key, payload, row[1], row[0], action["resource"]),
                )
                db.execute(
                    "UPDATE limits SET used=used+? WHERE credential_id=?",
                    (len(action["content"].encode()), row[1]),
                )
                self.event(
                    db, "effect", key=key, credential_id=row[1], session_id=row[0]
                )
            else:
                self.event(db, "duplicate", key=key)
            return {"status": "observed", "key": key, "action": action}

    def load(self, secret, name, digest):
        if not token(secret) or not label(name) or not token(digest):
            return {"status": "denied", "reason": "request"}
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            now = self.now(db)
            row = self._session(db, secret)
            if row is None:
                reason = "session"
            elif row[6] or now >= row[5]:
                reason = "session_inactive"
            elif not db.execute(
                "SELECT 1 FROM manifest WHERE credential_id=? AND name=? AND digest=?",
                (row[1], name, digest),
            ).fetchone():
                reason = "substituted_input"
            else:
                reason = None
            if reason:
                self.event(db, "denied", reason=reason, name=name, digest=digest)
                return {"status": "denied", "reason": reason}
            key = hashlib.sha256(("load:" + name + ":" + digest).encode()).hexdigest()
            db.execute(
                "INSERT OR IGNORE INTO effects VALUES(?,?,?,?,?)",
                (key, encode({"load": name, "digest": digest}), row[1], row[0], name),
            )
            self.event(db, "loaded", name=name, digest=digest, session_id=row[0])
            return {"status": "loaded", "name": name, "digest": digest}

    # observation ------------------------------------------------------------
    def effect_count(self):
        with self.db() as db:
            return db.execute("SELECT count(*) FROM effects").fetchone()[0]

    def denials(self, reason):
        with self.db() as db:
            return sum(
                1
                for (p,) in db.execute("SELECT payload FROM events WHERE kind='denied'")
                if ('"reason":"' + reason + '"') in p
            )

    def effects(self):
        with self.db() as db:
            return sorted(k for (k,) in db.execute("SELECT key FROM effects"))


def holder_proof_from_hash(holder_hash, key, db, session_id, store):
    """The receiver recomputes the expected proof from the session's holder material. The holder
    secret is derived at login and never stored in clear; the hash alone does not allow the
    recomputation, so the derivation is repeated from the session id under the store key."""
    holder = hmac.new(
        store.session_key.encode(), ("holder:" + session_id).encode(), hashlib.sha256
    ).hexdigest()
    if hashed(holder) != holder_hash:
        return (
            None  # never a string: a sentinel the caller could present would fail open
        )
    return holder_proof(holder, key)
