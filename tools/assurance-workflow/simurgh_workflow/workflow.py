# SPDX-License-Identifier: AGPL-3.0-or-later
"""Persisted native approval checkpoint, local decision and live authorization boundary."""

import hashlib
import importlib.metadata
import os
import signal
import sqlite3
import stat
import uuid
from contextlib import contextmanager
from pathlib import Path

from simurgh_durable.store import canonical, fsync_directory, parse_json, valid_action
from simurgh_redis.connector import Connector
from simurgh_redis.connector import initialize as initialize_connector
from simurgh_redis.network import local_sockets_only

from .native import native_pause, native_resume

VERSIONS = {
    "openai-agents": "0.23.1",
    "langgraph": "1.2.15",
    "langgraph-checkpoint-sqlite": "3.1.2",
}
FORMAT = "simurgh.workflow.v1"
MAX_CHECKPOINT = 2_000_000


def check_versions():
    actual = {name: importlib.metadata.version(name) for name in VERSIONS}
    if actual != VERSIONS:
        raise ValueError("dependency_version_mismatch")
    return actual


def marker(framework):
    return FORMAT + ":" + framework + ":" + canonical(VERSIONS)


def initialize(root, framework, action):
    if framework not in ("openai-agents", "langgraph") or not valid_action(action):
        raise ValueError("invalid_workflow")
    check_versions()
    root = Path(root).absolute()
    root.mkdir(mode=0o700)
    initialize_connector(
        root / "effect", {"revision": action["policyRevision"], "actions": [action]}
    )
    with sqlite3.connect(root / "workflow.sqlite3") as connection:
        connection.execute("PRAGMA synchronous=FULL")
        connection.execute(
            "CREATE TABLE workflow (id INTEGER PRIMARY KEY CHECK(id=1), framework TEXT, action TEXT, identity TEXT, version TEXT, phase TEXT, digest TEXT, size INTEGER, decision TEXT, result TEXT, revision TEXT, revoked INTEGER, callbacks INTEGER)"
        )
        connection.execute(
            "INSERT INTO workflow VALUES (1, ?, ?, ?, ?, 'new', NULL, NULL, NULL, NULL, ?, 0, 0)",
            (
                framework,
                canonical(action),
                uuid.uuid4().hex,
                marker(framework),
                action["policyRevision"],
            ),
        )
    fsync_directory(root)
    fsync_directory(root.parent)


class Workflow:
    def __init__(self, root, endpoint):
        self.root = Path(root).absolute()
        self.endpoint = endpoint
        self.connector = Connector(self.root / "effect", endpoint)
        # A distinct lock avoids recursive acquisition of the connector's own lock.
        self.lock = Connector(self.root, endpoint, timeout=15)

    @contextmanager
    def transaction(self):
        connection = sqlite3.connect(
            (self.root / "workflow.sqlite3").as_uri() + "?mode=rw",
            uri=True,
            timeout=5,
            isolation_level=None,
        )
        connection.row_factory = sqlite3.Row
        try:
            connection.execute("PRAGMA synchronous=FULL")
            connection.execute("BEGIN IMMEDIATE")
            yield connection
            connection.commit()
        except BaseException:
            connection.rollback()
            raise
        finally:
            connection.close()

    def row(self):
        with self.transaction() as connection:
            row = connection.execute("SELECT * FROM workflow WHERE id=1").fetchone()
            if row is None:
                raise ValueError("missing_workflow")
            return dict(row)

    def stats(self):
        row = self.row()
        return {
            "phase": row["phase"],
            "decision": row["decision"],
            "callbacks": row["callbacks"],
        }

    def change_policy(self, *, revoked=None, revision=None):
        if revoked is not None and type(revoked) is not bool:
            raise ValueError("invalid_revocation")
        if revision is not None and (
            type(revision) is not str or not 1 <= len(revision) <= 256
        ):
            raise ValueError("invalid_revision")
        with self.lock.locked(), self.transaction() as connection:
            if revoked is not None:
                connection.execute("UPDATE workflow SET revoked=?", (int(revoked),))
            if revision is not None:
                connection.execute("UPDATE workflow SET revision=?", (revision,))

    def pause(self):
        with self.lock.locked(), local_sockets_only():
            row = self.row()
            if row["phase"] != "new":
                raise ValueError("already_started")

            def forbidden(_):
                raise RuntimeError("callback_before_approval")

            blob = native_pause(
                row["framework"],
                parse_json(row["action"]),
                row["identity"],
                forbidden,
                directory=self.root,
            )
            if not 1 <= len(blob) <= MAX_CHECKPOINT:
                raise ValueError("checkpoint_size")
            path = self.root / "checkpoint.bin"
            # Exclusive creation preserves any prior checkpoint after an interrupted setup.
            with path.open("xb") as stream:
                stream.write(blob)
                stream.flush()
                os.fsync(stream.fileno())
            fsync_directory(self.root)
            with self.transaction() as connection:
                connection.execute(
                    "UPDATE workflow SET phase='paused', digest=?, size=?",
                    (hashlib.sha256(blob).hexdigest(), len(blob)),
                )
            return {"status": "paused", "interruptions": 1, "callbacks": 0}

    def checkpoint(self, row):
        check_versions()
        if row["version"] != marker(row["framework"]):
            raise ValueError("version_mismatch")
        fd = os.open(
            self.root / "checkpoint.bin", os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
        )
        with os.fdopen(fd, "rb") as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise ValueError("checkpoint_integrity")
            blob = stream.read(MAX_CHECKPOINT + 1)
        if (
            not 1 <= len(blob) <= MAX_CHECKPOINT
            or len(blob) != row["size"]
            or hashlib.sha256(blob).hexdigest() != row["digest"]
        ):
            raise ValueError("checkpoint_integrity")
        return blob

    def _dispatch_locked(self, action, *, crash_after_effect=False):
        with self.transaction() as connection:
            row = dict(
                connection.execute("SELECT * FROM workflow WHERE id=1").fetchone()
            )
            connection.execute("UPDATE workflow SET callbacks=callbacks+1")
        if action != parse_json(row["action"]) or row["decision"] != "approve":
            return {"status": "denied", "reason": "action_or_decision_mismatch"}
        if row["revoked"]:
            return {"status": "denied", "reason": "revoked"}
        if action["policyRevision"] != row["revision"]:
            return {"status": "denied", "reason": "revision_changed"}
        result = self.connector.execute(action)
        if crash_after_effect and result.get("outcome") == "completed":
            os.kill(os.getpid(), signal.SIGKILL)
        return result

    def resume(self, decision, *, crash_after_effect=False):
        if decision not in ("approve", "reject"):
            raise ValueError("invalid_decision")
        with self.lock.locked(), local_sockets_only():
            row = self.row()
            if row["phase"] not in ("paused", "completed"):
                raise ValueError("not_paused")
            if row["decision"] not in (None, decision):
                raise ValueError("decision_conflict")
            blob = self.checkpoint(row)
            if row["phase"] == "completed":
                result = parse_json(row["result"])
                observation = self.connector.observe()
                if result["status"] == "completed" and (
                    not observation["available"]
                    or observation["effects"] != [{"action": parse_json(row["action"])}]
                ):
                    return {
                        "status": "unknown",
                        "reason": "completed_effect_unavailable",
                        "cached": True,
                        "nativeResumptions": 0,
                    }
                return {
                    "status": result["status"],
                    "cached": True,
                    "nativeResumptions": 0,
                    "toolResult": None,
                }
            with self.transaction() as connection:
                connection.execute("UPDATE workflow SET decision=?", (decision,))
            results = native_resume(
                row["framework"],
                parse_json(row["action"]),
                row["identity"],
                lambda action: self._dispatch_locked(
                    action, crash_after_effect=crash_after_effect
                ),
                blob,
                decision,
                directory=self.root,
            )
            tool_result = results[0] if results else None
            status = (
                "rejected"
                if decision == "reject"
                else "completed"
                if tool_result["status"] == "executed"
                else "denied"
                if tool_result["status"] == "denied"
                else "unknown"
            )
            result = {
                "status": status,
                "cached": False,
                "nativeResumptions": 1,
                "toolResult": tool_result,
            }
            # Unknown does not erase the paused checkpoint or freeze a failed attempt as completion.
            if status != "unknown":
                with self.transaction() as connection:
                    connection.execute(
                        "UPDATE workflow SET phase='completed', result=?",
                        (canonical(result),),
                    )
            return result
