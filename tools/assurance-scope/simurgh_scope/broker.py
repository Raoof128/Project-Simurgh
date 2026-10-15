"""Host-owned exact authority, audit-before-dispatch and terminal stopping.

Only cooperating processes on a trusted POSIX host are covered. The transport and
monitor are trusted integrations. There is intentionally no agent reset API.
"""

import fcntl
import hashlib
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlsplit


class Refusal(Exception):
    """Invalid authority/storage/transport configuration; no success claim."""


MODES = ("origin_only", "scoped", "deny_all")
FIELDS = {"run", "principal", "tenant", "method", "url", "body"}


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def location(url):
    if (
        not isinstance(url, str)
        or len(url) > 2048
        or any(ord(c) <= 32 or ord(c) >= 127 for c in url)
    ):
        raise Refusal("invalid URL")
    parsed = urlsplit(url)
    if (
        parsed.scheme != "http"
        or not parsed.hostname
        or not parsed.hostname.endswith(".test")
        or parsed.netloc != parsed.hostname
        or parsed.fragment
        or not parsed.path.startswith("/")
        or parsed.geturl() != url
    ):
        raise Refusal("only canonical fixture HTTP URLs allowed")
    return f"http://{parsed.netloc}", parsed.path + (
        "?" + parsed.query if parsed.query else ""
    )


def valid_request(request):
    if not isinstance(request, dict) or set(request) != FIELDS:
        return False
    if any(not isinstance(request[k], str) for k in FIELDS):
        return False
    if any(
        not request[k] or len(request[k]) > 128 for k in ("run", "principal", "tenant")
    ):
        return False
    if request["method"] not in ("GET", "POST") or len(request["body"].encode()) > 1024:
        return False
    if request["method"] == "GET" and request["body"]:
        return False
    try:
        location(request["url"])
    except (Refusal, ValueError):
        return False
    return True


def validate_policy(policy):
    if not isinstance(policy, dict) or set(policy) != {
        "version",
        "run",
        "principal",
        "tenant",
        "budget",
        "grants",
    }:
        raise Refusal("invalid policy schema")
    if type(policy["version"]) is not int or policy["version"] != 1:
        raise Refusal("invalid policy version")
    if type(policy["budget"]) is not int or not 1 <= policy["budget"] <= 10000:
        raise Refusal("invalid budget")
    grants = policy["grants"]
    if not isinstance(grants, list) or not 1 <= len(grants) <= 128:
        raise Refusal("nonempty bounded grants required")
    if any(
        not valid_request(g)
        or any(g[k] != policy[k] for k in ("run", "principal", "tenant"))
        for g in grants
    ):
        raise Refusal("invalid grant binding")
    if len({encoded(g) for g in grants}) != len(grants):
        raise Refusal("duplicate grants")


@contextmanager
def locked(path):
    # Lock identity and directory are host-owned and must not be replaced by agents.
    with open(str(path) + ".lock", "a+b") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def result(status, reason):
    return {"status": status, "reason": reason}


class Broker:
    @staticmethod
    def create(path, policy, mode="scoped"):
        validate_policy(policy)
        if mode not in MODES:
            raise Refusal("invalid mode")
        path = Path(path)
        with locked(path):
            try:
                fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            except OSError as exc:
                raise Refusal("run provisioning refused") from exc
            os.close(fd)
            with sqlite3.connect(path) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    "CREATE TABLE state (id INTEGER PRIMARY KEY CHECK(id=1), binding TEXT, status TEXT, reason TEXT, used INTEGER)"
                )
                db.execute(
                    "CREATE TABLE events (seq INTEGER PRIMARY KEY, kind TEXT, detail TEXT)"
                )
                binding = hashlib.sha256(
                    encoded({"policy": policy, "mode": mode}).encode()
                ).hexdigest()
                db.execute(
                    "INSERT INTO state VALUES (1, ?, 'active', '', 0)", (binding,)
                )

    def __init__(
        self,
        path,
        policy,
        transport,
        *,
        mode="scoped",
        monitor=lambda: True,
        after_intent=None,
    ):
        validate_policy(policy)
        if mode not in MODES:
            raise Refusal("invalid mode")
        self.path = Path(path)
        # Copy trusted configuration so a caller cannot mutate it after construction.
        self.policy = json.loads(encoded(policy))
        self.mode = mode
        self.binding = hashlib.sha256(
            encoded({"policy": self.policy, "mode": mode}).encode()
        ).hexdigest()
        self.transport = transport
        self.monitor = monitor
        self.after_intent = after_intent

    def execute(self, request):
        try:
            request = json.loads(encoded(request))
        except (TypeError, ValueError) as exc:
            raise Refusal("non-JSON request") from exc
        try:
            with locked(self.path):
                # mode=rw cannot silently create missing state on restart.
                db = sqlite3.connect(
                    self.path.resolve().as_uri() + "?mode=rw", uri=True
                )
                try:
                    db.execute("PRAGMA synchronous=FULL")
                    return self._execute(db, request)
                finally:
                    db.close()
        except (OSError, sqlite3.Error) as exc:
            raise Refusal(
                "state/audit unavailable; effect may be unknown if dispatch began"
            ) from exc

    def _event(self, db, kind, detail):
        db.execute(
            "INSERT INTO events (kind, detail) VALUES (?, ?)", (kind, encoded(detail))
        )

    def _stop(self, db, reason, status="refused"):
        with db:
            self._event(db, "stop", {"reason": reason})
            db.execute(
                "UPDATE state SET status='stopped', reason=? WHERE id=1", (reason,)
            )
        return result(status, reason)

    def _execute(self, db, request):
        states = db.execute(
            "SELECT id,binding,status,reason,used FROM state"
        ).fetchall()
        if (
            len(states) != 1
            or states[0][0] != 1
            or states[0][1] != self.binding
            or states[0][2] not in ("active", "pending", "stopped")
            or type(states[0][4]) is not int
            or states[0][4] < 0
        ):
            raise Refusal("state binding or schema mismatch")
        _, _, phase, _, used = states[0]
        if phase == "stopped":
            return result("refused", "stopped")
        if phase == "pending":
            return self._stop(db, "pending_intent", "unknown")
        # Guard admission as well as dispatch: a failed stop write must not leave
        # an active run after scope, monitor or budget rejection. If this first
        # transaction fails, no admission decision or transport has happened.
        with db:
            self._event(db, "admission", {})
            db.execute("UPDATE state SET status='pending' WHERE id=1")
        if self.mode == "deny_all":
            return self._stop(db, "deny_all")
        if self.mode == "origin_only":
            # Deliberately weak comparison: only the initial service origin.
            try:
                origin, _ = location(request["url"])
                allowed = {location(g["url"])[0] for g in self.policy["grants"]}
            except (Refusal, ValueError, KeyError, TypeError):
                return self._stop(db, "scope")
            if origin not in allowed:
                return self._stop(db, "scope")
        for _ in range(5):
            if self.mode == "scoped":
                if not valid_request(request) or request not in self.policy["grants"]:
                    return self._stop(db, "scope")
                if used >= self.policy["budget"]:
                    return self._stop(db, "budget")
                try:
                    healthy = self.monitor() is True
                except Exception:  # noqa: BLE001 - any monitor error denies dispatch
                    healthy = False
                if not healthy:
                    return self._stop(db, "monitor")
            with db:
                # Persist before any dispatch. Never persist credential values or response bodies.
                self._event(
                    db,
                    "intent",
                    {
                        "requestDigest": hashlib.sha256(
                            encoded(request).encode()
                        ).hexdigest()
                    },
                )
                db.execute("UPDATE state SET status='pending', used=used+1 WHERE id=1")
            used += 1
            if self.after_intent:
                self.after_intent()
            try:
                response = self.transport(request)
                if (
                    not isinstance(response, dict)
                    or set(response) != {"status", "location"}
                    or type(response["status"]) is not int
                    or not 100 <= response["status"] <= 599
                    or (
                        response["location"] is not None
                        and not isinstance(response["location"], str)
                    )
                ):
                    raise Refusal("invalid transport response")
            except Exception:  # noqa: BLE001 - any transport error leaves the effect unknown
                return self._stop(db, "transport", "unknown")
            with db:
                self._event(db, "response", {"status": response["status"]})
                # Remain pending through redirect authorization and terminal
                # response handling. A crash or failed stop write cannot revive
                # the run. Only a committed successful response clears pending.
                if 200 <= response["status"] < 300:
                    db.execute("UPDATE state SET status='active' WHERE id=1")
            if response["status"] in (301, 302, 303, 307, 308):
                # Only GET redirect semantics supported; POST redirect ambiguity stops.
                if request.get("method") != "GET" or not response["location"]:
                    return self._stop(db, "redirect")
                request = {**request, "url": response["location"]}
                continue
            if not 200 <= response["status"] < 300:
                return self._stop(db, "unavailable")
            return result("completed", "response")
        return self._stop(db, "redirect_limit")
