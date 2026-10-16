"""Trusted durable context and task-lineage admission; summaries never grant authority."""

import hashlib
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-connector"))
from core import encode, valid


def digest(value):
    return hashlib.sha256(encode(value).encode()).hexdigest()


def label(value):
    return type(value) is str and 0 < len(value) <= 128


def host_binding(host):
    with sqlite3.connect(host.path) as db:
        rows = db.execute("SELECT identity,approved,control FROM policy").fetchall()
    if len(rows) != 1 or rows[0][2] != "enforced":
        raise ValueError("host_configuration")
    return list(rows[0])


class ContextGate:
    def __init__(self, path, hosts):
        self.path = Path(path)
        if self.path.is_symlink() or not self.path.is_file():
            raise ValueError("missing_context")
        self.hosts = dict(hosts)
        with self.db() as db:
            rows = db.execute("SELECT payload FROM config").fetchall()
            if len(rows) != 1:
                raise ValueError("context_configuration")
            self.config = json.loads(rows[0][0])
        self.actions = self.config["actions"]
        if set(hosts) != set(self.actions) or any(
            host_binding(hosts[k]) != self.config["hosts"][k] for k in hosts
        ):
            raise ValueError("host_binding")

    @classmethod
    def create(cls, path, hosts, actions, *, task, source, registry, budget=1):
        if (
            not label(task)
            or not label(source)
            or type(budget) is not int
            or not 1 <= budget <= 2
        ):
            raise ValueError("context_configuration")
        if (
            type(actions) is not dict
            or not 1 <= len(actions) <= 2
            or set(actions) != set(hosts)
        ):
            raise ValueError("actions")
        bindings = {k: host_binding(h) for k, h in hosts.items()}
        for k, a in actions.items():
            if (
                not label(k)
                or not valid(a)
                or a["id"] != k
                or bindings[k][1] != encode(a)
            ):
                raise ValueError("action_binding")
        if type(registry) is not dict or len(registry) > 32 or "root" in registry:
            raise ValueError("registry")
        for actor, rule in registry.items():
            if (
                not label(actor)
                or type(rule) is not dict
                or set(rule) != {"parent", "task"}
                or not label(rule["task"])
            ):
                raise ValueError("registry")
            seen = {actor}
            parent = rule["parent"]
            while parent != "root":
                if not label(parent) or parent in seen or parent not in registry:
                    raise ValueError("registry_cycle_or_parent")
                seen.add(parent)
                parent = registry[parent]["parent"]
        config = {
            "task": task,
            "source": source,
            "registry": registry,
            "actions": actions,
            "hosts": bindings,
            "budget": budget,
        }
        path = Path(path)
        with path.open("xb"):
            pass
        with sqlite3.connect(path) as db:
            db.executescript("""
            CREATE TABLE config(payload TEXT NOT NULL);
            CREATE TABLE state(id INTEGER PRIMARY KEY CHECK(id=1), source TEXT NOT NULL, revision INTEGER NOT NULL);
            CREATE TABLE grants(actor TEXT PRIMARY KEY,parent TEXT,actions TEXT NOT NULL,depth INTEGER NOT NULL,source TEXT NOT NULL,revoked INTEGER NOT NULL);
            CREATE TABLE facts(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,detail TEXT NOT NULL,blocking INTEGER NOT NULL);
            CREATE TABLE attempts(action_id TEXT PRIMARY KEY,actor TEXT NOT NULL,status TEXT NOT NULL);
            CREATE TABLE events(seq INTEGER PRIMARY KEY,payload TEXT NOT NULL);
            """)
            db.execute("INSERT INTO config VALUES(?)", (encode(config),))
            db.execute("INSERT INTO state VALUES(1,?,0)", (source,))
            db.execute(
                "INSERT INTO grants VALUES(?,?,?,?,?,0)",
                ("root", None, encode(sorted(actions)), 0, source),
            )
        return cls(path, hosts)

    def db(self):
        return sqlite3.connect(self.path, timeout=10)

    def event(self, db, kind, **data):
        db.execute(
            "INSERT INTO events(payload) VALUES(?)", (encode(dict(kind=kind, **data)),)
        )

    def bump(self, db):
        db.execute("UPDATE state SET revision=revision+1")

    def projection(self, db=None):
        if db is None:
            with self.db() as connection:
                connection.execute("BEGIN")
                return self.projection(connection)
        source, revision = db.execute(
            "SELECT source,revision FROM state WHERE id=1"
        ).fetchone()
        grants = [
            {
                "actor": a,
                "parent": p,
                "actions": json.loads(s),
                "depth": d,
                "source": v,
                "revoked": bool(r),
            }
            for a, p, s, d, v, r in db.execute("SELECT * FROM grants ORDER BY actor")
        ]
        facts = [
            {"id": i, "kind": k, "detail": d, "blocking": bool(b)}
            for i, k, d, b in db.execute("SELECT * FROM facts ORDER BY id")
        ]
        attempts = [
            {"action_id": a, "actor": p, "status": s}
            for a, p, s in db.execute("SELECT * FROM attempts ORDER BY action_id")
        ]
        return {
            "task": self.config["task"],
            "source": source,
            "revision": revision,
            "grants": grants,
            "facts": facts,
            "attempts": attempts,
            "budget": {"limit": self.config["budget"], "reserved": len(attempts)},
        }

    def checkpoint(self, db=None):
        projection = self.projection(db)
        return {
            "task": self.config["task"],
            "source": projection["source"],
            "digest": digest({"config": self.config, "projection": projection}),
        }

    def resume(self, actor, checkpoint, summary):
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            projection = self.projection(db)
            try:
                checkpoint_ok = encode(checkpoint) == encode(self.checkpoint(db))
            except (ValueError, TypeError, RecursionError):
                checkpoint_ok = False
            audit = []
            try:
                if (
                    type(summary) is not dict
                    or set(summary) != set(projection) | {"note"}
                    or type(summary["note"]) is not str
                    or len(encode(summary).encode()) > 16384
                ):
                    audit = ["summary_schema"]
                else:
                    audit = [
                        k
                        for k in sorted(projection)
                        if encode(summary[k]) != encode(projection[k])
                    ]
            except (ValueError, TypeError, RecursionError):
                audit = ["summary_schema"]
            active = (
                label(actor)
                and self.active(db, actor, projection["source"]) is not None
            )
            allowed = checkpoint_ok and active
            reason = (
                None if allowed else ("checkpoint" if not checkpoint_ok else "actor")
            )
            self.event(
                db,
                "resume",
                actor=actor if label(actor) else "<invalid>",
                audit=audit,
                reason=reason,
            )
        return Session(self, actor, projection["source"], allowed, audit, reason)

    def active(self, db, actor, source):
        first = None
        seen = set()
        while actor is not None:
            if actor in seen:
                return None
            seen.add(actor)
            row = db.execute(
                "SELECT parent,actions,depth,source,revoked FROM grants WHERE actor=?",
                (actor,),
            ).fetchone()
            if row is None or row[3] != source or row[4]:
                return None
            if first is None:
                first = row
            actor = row[0]
        return first

    def record_fact(self, kind, detail, *, blocking):
        if (
            kind not in ("failure", "missing_input")
            or type(detail) is not str
            or not 0 < len(detail) <= 512
            or type(blocking) is not bool
        ):
            raise ValueError("fact")
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "INSERT INTO facts(kind,detail,blocking) VALUES(?,?,?)",
                (kind, detail, int(blocking)),
            )
            self.bump(db)
            self.event(db, "fact", kind_value=kind, blocking=blocking)

    def change_source(self, source):
        if not label(source):
            raise ValueError("source")
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE state SET source=?", (source,))
            self.bump(db)
            db.execute("UPDATE grants SET revoked=1")
            self.event(db, "source", source=source)

    def revoke(self, actor):
        if not label(actor):
            raise ValueError("actor")
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE grants SET revoked=1 WHERE actor=?", (actor,))
            self.bump(db)
            self.event(db, "revoke", actor=actor)


class Session:
    """Trusted orchestrator handle. Never expose this object/actor selection to workers."""

    def __init__(self, gate, actor, source, allowed, audit, reason):
        self.gate, self.actor, self.source = gate, actor, source
        self.allowed, self.audit, self.reason = allowed, audit, reason

    def authority(self, db):
        source = db.execute("SELECT source FROM state WHERE id=1").fetchone()[0]
        if not self.allowed or source != self.source:
            return None
        return self.gate.active(db, self.actor, source)

    def delegate(self, child, action_ids):
        if (
            not label(child)
            or type(action_ids) is not list
            or not action_ids
            or not all(label(a) for a in action_ids)
            or len(set(action_ids)) != len(action_ids)
        ):
            return False
        with self.gate.db() as db:
            db.execute("BEGIN IMMEDIATE")
            parent = self.authority(db)
            rule = self.gate.config["registry"].get(child)
            if (
                parent is None
                or rule != {"parent": self.actor, "task": self.gate.config["task"]}
                or parent[2] >= 2
                or not set(action_ids) <= set(json.loads(parent[1]))
                or db.execute("SELECT 1 FROM grants WHERE actor=?", (child,)).fetchone()
            ):
                self.gate.event(db, "delegate_blocked", actor=self.actor, child=child)
                return False
            db.execute(
                "INSERT INTO grants VALUES(?,?,?,?,?,0)",
                (
                    child,
                    self.actor,
                    encode(sorted(action_ids)),
                    parent[2] + 1,
                    self.source,
                ),
            )
            self.gate.bump(db)
            self.gate.event(
                db,
                "delegated",
                actor=self.actor,
                child=child,
                actions=sorted(action_ids),
            )
            return True

    def dispatch(self, action):
        # Copy exact bounded action before releasing the admission transaction.
        if not valid(action):
            return {"status": "blocked"}
        action = dict(action)
        action_id = action["id"]
        with self.gate.db() as db:
            db.execute("BEGIN IMMEDIATE")
            authority = self.authority(db)
            if (
                authority is None
                or action_id not in json.loads(authority[1])
                or encode(action) != encode(self.gate.actions.get(action_id))
                or db.execute("SELECT 1 FROM facts WHERE blocking=1").fetchone()
            ):
                self.gate.event(
                    db,
                    "blocked",
                    actor=self.actor,
                    action_id=action_id,
                    reason="authority_or_fact",
                )
                return {"status": "blocked"}
            previous = db.execute(
                "SELECT status FROM attempts WHERE action_id=?", (action_id,)
            ).fetchone()
            if previous:
                self.gate.event(
                    db,
                    "duplicate",
                    actor=self.actor,
                    action_id=action_id,
                    status=previous[0],
                )
                return {"status": previous[0]}
            if (
                db.execute("SELECT count(*) FROM attempts").fetchone()[0]
                >= self.gate.config["budget"]
            ):
                self.gate.event(
                    db,
                    "blocked",
                    actor=self.actor,
                    action_id=action_id,
                    reason="budget",
                )
                return {"status": "blocked"}
            db.execute(
                "INSERT INTO attempts VALUES(?,?,?)", (action_id, self.actor, "unknown")
            )
            self.gate.bump(db)
            self.gate.event(db, "admitted", actor=self.actor, action_id=action_id)
        # Already admitted work may finish after revoke. No automatic refund/retry.
        try:
            result = self.gate.hosts[action_id].dispatch(action)
            status = (
                result["status"]
                if result["status"] in ("observed", "unknown", "blocked", "invalid")
                else "unknown"
            )
        except (OSError, ValueError, KeyError, TypeError):
            status = "unknown"
        with self.gate.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "UPDATE attempts SET status=? WHERE action_id=?", (status, action_id)
            )
            self.gate.bump(db)
            self.gate.event(
                db, "outcome", actor=self.actor, action_id=action_id, status=status
            )
        return {"status": status}
