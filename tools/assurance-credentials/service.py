"""Owned credential receiver: authentication and effects share a commit transaction.

The logical clock and dropped-response switch are authenticated laboratory controls.
This is not a production identity provider.
"""

import hashlib
import hmac
import sqlite3
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-connector"))
from core import decode, encode, key_for, valid

POLICIES = ("session_snapshot", "continuous")


def hashed(value):
    return hashlib.sha256(value.encode()).hexdigest()


def label(value):
    return type(value) is str and 0 < len(value) <= 128


def token(value):
    return type(value) is str and 32 <= len(value) <= 256


def integer(value):
    return type(value) is int and 0 <= value <= 2**53 - 1


class Store:
    def __init__(self, path, session_key):
        self.path = Path(path)
        self.session_key = session_key
        if self.path.is_symlink() or not self.path.is_file() or not token(session_key):
            raise ValueError("store")

    @classmethod
    def create(cls, path, policy, *, session_key, now=100, issuer="test-issuer"):
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
            CREATE TABLE state(id INTEGER PRIMARY KEY CHECK(id=1),policy TEXT NOT NULL,issuer TEXT NOT NULL,now INTEGER NOT NULL,drop_next INTEGER NOT NULL);
            CREATE TABLE credentials(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,subject TEXT NOT NULL,tenant TEXT NOT NULL,resource TEXT NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL);
            CREATE TABLE sessions(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,credential_id TEXT NOT NULL,subject TEXT NOT NULL,tenant TEXT NOT NULL,resource TEXT NOT NULL,expires INTEGER NOT NULL,cancelled INTEGER NOT NULL);
            CREATE TABLE effects(key TEXT PRIMARY KEY,payload TEXT NOT NULL,credential_id TEXT NOT NULL,session_id TEXT NOT NULL);
            CREATE TABLE events(seq INTEGER PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL);
            """)
            db.execute("INSERT INTO state VALUES(1,?,?,?,0)", (policy, issuer, now))
        return cls(path, session_key)

    def db(self):
        return sqlite3.connect(self.path, timeout=10)

    def now(self, db):
        return db.execute("SELECT now FROM state WHERE id=1").fetchone()[0]

    def event(self, db, kind, **data):
        return db.execute(
            "INSERT INTO events(kind,payload) VALUES(?,?)", (kind, encode(data))
        ).lastrowid

    def issue(self, credential_id, secret, subject, tenant, resource, expires):
        if (
            not all(label(x) for x in (credential_id, subject, tenant, resource))
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
                "INSERT INTO credentials VALUES(?,?,?,?,?,?,0)",
                (credential_id, hashed(secret), subject, tenant, resource, expires),
            )
            self.event(db, "issued", credential_id=credential_id)
        return {"status": "issued", "credential_id": credential_id}

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
            db.execute(
                "INSERT INTO sessions VALUES(?,?,?,?,?,?,?,0)",
                (sid, hashed(bearer), cid, subject, tenant, resource, now + ttl),
            )
            self.event(db, "session", credential_id=cid, session_id=sid)
            return {
                "status": "issued",
                "session_id": sid,
                "credential_id": cid,
                "secret": bearer,
                "issuer": issuer,
            }

    def send(self, secret, key, action):
        if not token(secret) or not valid(action) or key != key_for(action):
            return {"status": "denied", "reason": "request"}
        action = dict(action)
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            now = self.now(db)
            row = db.execute(
                "SELECT id,credential_id,subject,tenant,resource,expires,cancelled FROM sessions WHERE token_hash=?",
                (hashed(secret),),
            ).fetchone()
            reason = None
            if row is None:
                reason = "session"
            elif row[6] or now >= row[5]:
                reason = "session_inactive"
            elif (action["principal"], action["tenant"], action["resource"]) != tuple(
                row[2:5]
            ):
                reason = "scope"
            elif db.execute("SELECT policy FROM state").fetchone()[0] == "continuous":
                cred = db.execute(
                    "SELECT expires,revoked FROM credentials WHERE id=?", (row[1],)
                ).fetchone()
                if cred is None or cred[1] or now >= cred[0]:
                    reason = "credential_inactive"
            if reason:
                self.event(db, "denied", reason=reason, key=key)
                return {"status": "denied", "reason": reason}
            previous = db.execute(
                "SELECT payload FROM effects WHERE key=?", (key,)
            ).fetchone()
            payload = encode(action)
            if previous and previous[0] != payload:
                self.event(db, "denied", reason="idempotency_conflict", key=key)
                return {"status": "denied", "reason": "idempotency_conflict"}
            if previous is None:
                db.execute(
                    "INSERT INTO effects VALUES(?,?,?,?)",
                    (key, payload, row[1], row[0]),
                )
                self.event(
                    db, "effect", key=key, credential_id=row[1], session_id=row[0]
                )
            else:
                self.event(db, "duplicate", key=key)
            return {"status": "observed", "key": key, "action": action}

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

    def cancel(self, session_id):
        if not label(session_id):
            raise ValueError("session_id")
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            if not db.execute(
                "UPDATE sessions SET cancelled=1 WHERE id=?", (session_id,)
            ).rowcount:
                return {"status": "not_found"}
            self.event(db, "cancelled", session_id=session_id)
        return {"status": "cancelled", "session_id": session_id}

    def advance(self, now):
        if not integer(now):
            raise ValueError("clock")
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            if now < self.now(db):
                raise ValueError("clock_rollback")
            db.execute("UPDATE state SET now=?", (now,))
            self.event(db, "clock", now=now)
        return {"status": "advanced", "now": now}

    def drop_next(self):
        with self.db() as db:
            db.execute("UPDATE state SET drop_next=1")
            self.event(db, "drop_armed")
        return {"status": "armed"}

    def take_drop(self):
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            drop = db.execute("SELECT drop_next FROM state").fetchone()[0]
            if drop:
                db.execute("UPDATE state SET drop_next=0")
                self.event(db, "response_dropped")
            return bool(drop)


def serve(path, admin_key):
    store = Store(path, admin_key)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_POST(self):
            try:
                lengths = self.headers.get_all("Content-Length", [])
                auth = self.headers.get_all("Authorization", [])
                if (
                    len(lengths) != 1
                    or not lengths[0].isdigit()
                    or not 0 < int(lengths[0]) <= 16384
                    or len(auth) != 1
                    or not auth[0].startswith("Bearer ")
                ):
                    raise ValueError("headers")
                self.connection.settimeout(3)
                body = decode(self.rfile.read(int(lengths[0])).decode("utf-8"))
                if type(body) is not dict:
                    raise ValueError("body")
                secret = auth[0][7:]
                if len(secret) > 256:
                    raise ValueError("bearer_length")
                if self.path.startswith("/admin/"):
                    if not hmac.compare_digest(hashed(secret), hashed(admin_key)):
                        self.reply(401, {"status": "denied"})
                        return
                    routes = {
                        "/admin/issue": (
                            store.issue,
                            (
                                "credential_id",
                                "secret",
                                "subject",
                                "tenant",
                                "resource",
                                "expires",
                            ),
                        ),
                        "/admin/revoke": (store.revoke, ("credential_id",)),
                        "/admin/cancel": (store.cancel, ("session_id",)),
                        "/admin/advance": (store.advance, ("now",)),
                        "/admin/drop": (store.drop_next, ()),
                    }
                    if self.path not in routes:
                        raise ValueError("route")
                    method, fields = routes[self.path]
                    if set(body) != set(fields):
                        raise ValueError("fields")
                    result = method(*(body[k] for k in fields))
                elif self.path == "/sessions":
                    if set(body) != {"ttl"}:
                        raise ValueError("fields")
                    result = store.login(secret, body["ttl"])
                elif self.path == "/effect":
                    if set(body) != {"key", "action"}:
                        raise ValueError("fields")
                    result = store.send(secret, body["key"], body["action"])
                    if result["status"] == "observed" and store.take_drop():
                        self.close_connection = True
                        return
                else:
                    raise ValueError("route")
                self.reply(200, result)
            except (ValueError, TypeError, KeyError, UnicodeError, sqlite3.Error):
                self.reply(400, {"status": "invalid"})
            except OSError:
                self.close_connection = True

        def reply(self, status, result):
            payload = encode(result).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    print(encode({"port": server.server_port}), flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()


if __name__ == "__main__":
    serve(Path(sys.argv[1]), sys.stdin.readline().strip())
