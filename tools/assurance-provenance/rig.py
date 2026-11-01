"""ProvenanceRig: a successor pipeline, one receiver, and every AWM channel as a fixture file.

Mirrors the successor test rig (`tools/assurance-composed-successor/tests/test_successor.py`): one
``Service`` receiver, routes ``a`` and ``b``, a fixed clock. Only ``a`` is delegated to ``child``,
so a clean gate admits ``a`` and blocks ``b`` on authority. ``gate_cls`` selects the pipeline class
(the successor, or a reader mutant from ``mutants.py``).
"""

import base64
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-composed"))
sys.path.insert(0, str(ROOT / "tools/assurance-composed-successor"))

import composition as frozen  # noqa: E402
import successor  # noqa: E402
from core import encode  # noqa: E402
from transport import Service  # noqa: E402

SECRET = b"phase19-public-webhook-fixture-key"
WHSEC = "whsec_" + base64.b64encode(SECRET).decode()
OPERATOR = b"p" * 32
IDS = {
    "a": {"response_id": "resp_p19a", "request_id": "req_p19a"},
    "b": {"response_id": "resp_p19b", "request_id": "req_p19b"},
}
CLOCK = 100.0
ACTOR = "child"
FILE_CHANNELS = {
    "transcript": "transcript.jsonl",
    "memory_file": "MEMORY.md",
    "tool_result_body": "tool-result.json",
    "instruction_file": "CLAUDE.md",
    "sandbox_file": "sandbox/notes.txt",
    "git_metadata": "git/COMMIT_EDITMSG",
    "reasoning_text": "reasoning.txt",
    "local_grader_file": "grader/result.json",
    "config_file": "config.json",
}
DEFAULT_TEXT = "benign fixture content"
NOTE_CAP = 12000


def actions_for(run="p19"):
    return {
        k: {
            "id": k,
            "run": run,
            "principal": "alice",
            "tenant": "tenant",
            "operation": "send_report",
            "resource": "inbox",
            "content": "report " + k,
            "policyRevision": "v1",
        }
        for k in ("a", "b")
    }


def rows(path, query):
    with sqlite3.connect(path) as db:
        return [list(r) for r in db.execute(query).fetchall()]


class ProvenanceRig:
    def __init__(self, directory, *, gate_cls=None, clock=CLOCK):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.gate_cls = gate_cls or successor.Pipeline
        self.now = clock
        self.service = Service(
            self.directory / "service.sqlite",
            "continuous",
            admin_key="a" * 64,
            issuer="p19-issuer",
        )
        credential = self.service.issue(
            "c1", "alice", "tenant", "inbox", 200, secret="c" * 64
        )
        self.client = self.service.login(credential)
        self.actions = actions_for()
        self.by_alert = {
            "alert_" + k: dict(
                id="alert_" + k, request_paused=True, reason="misalignment", **v
            )
            for k, v in IDS.items()
        }
        by_alert = self.by_alert
        self.args = {
            "actions": self.actions,
            "client": self.client,
            "revoker": self.service.revoke,
            "task": "task-p19",
            "source": "v1",
            "registry": {
                ACTOR: {"parent": "root", "task": "task-p19"},
                "child2": {"parent": "root", "task": "task-p19"},
            },
            "webhook_secret": WHSEC,
            "operator_key": OPERATOR,
            "lookup": lambda alert_id: by_alert[alert_id],
            "clock": lambda: self.now,
            "boot": "p19-boot",
            "bindings": IDS,
        }
        self.channels = {"summary_note": DEFAULT_TEXT}
        for channel, rel in FILE_CHANNELS.items():
            path = self.directory / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(DEFAULT_TEXT)
        self.pipe = self.gate_cls.create(self.directory / "controls", **self.args)
        self.pipe.rig = self
        self.pipe.update(self._activate)
        root = self.pipe.resume("root")
        if not self.pipe.update(lambda: root.context.delegate(ACTOR, ["a"])):
            raise ValueError("fixture_delegate")
        self.verdicts = {}

    def close(self):
        self.service.close()

    def _activate(self):
        for key, signal in self.pipe.signals.items():
            signal.heartbeat()
            if not signal.restart(
                frozen.restart_token(signal, OPERATOR, self.now, "start-" + key)
            ):
                raise ValueError("fixture_restart")

    # channels -------------------------------------------------------------
    def write(self, channel, text):
        if channel == "summary_note":
            self.channels[channel] = text
        elif channel in FILE_CHANNELS:
            (self.directory / FILE_CHANNELS[channel]).write_text(text)
        else:
            raise ValueError("unknown_channel:" + channel)

    def read(self, channel):
        if channel == "summary_note":
            return self.channels[channel]
        return (self.directory / FILE_CHANNELS[channel]).read_text()

    # adapters (disciplined): channel text goes only into the note --------------
    def summary_for(self, adapter):
        projection = self.pipe.context.projection()
        if adapter == "summary_note":
            note = self.read("summary_note")
        elif adapter in ("transcript", "memory_file"):
            note = self.read(adapter)[:NOTE_CAP]
        elif adapter is None:
            note = "trusted fixture summary"
        else:
            raise ValueError("unknown_adapter:" + adapter)
        return dict(projection, note=note)

    def session(self, adapter=None):
        return self.pipe.resume(ACTOR, summary=self.summary_for(adapter))

    def dispatch(self, route, adapter=None):
        status = self.session(adapter).dispatch(self.actions[route])["status"]
        self.verdicts[route] = status
        return status

    def run_default(self, adapter=None):
        self.dispatch("b", adapter)
        self.dispatch("a", adapter)
        return self.oracle()

    # oracle -----------------------------------------------------------------
    def effects(self):
        return sorted(k for (k,) in rows(self.service.path, "SELECT key FROM effects"))

    def authority_state(self):
        d = self.pipe.directory
        return {
            "actions": self.pipe.config["actions"],
            "grants": rows(
                d / "context.sqlite",
                "SELECT actor,parent,actions,depth,source,revoked FROM grants ORDER BY actor",
            ),
            "attempts": rows(
                d / "context.sqlite",
                "SELECT action_id,actor,status FROM attempts ORDER BY action_id",
            ),
            "facts": rows(
                d / "context.sqlite",
                "SELECT kind,detail,blocking FROM facts ORDER BY id",
            ),
            "held": rows(d / "pipeline.sqlite", "SELECT held FROM state"),
            "signals": {
                n: rows(
                    d / (n + "-signal.sqlite"),
                    "SELECT revision,terminal,paused,lease_until,last_seen FROM state",
                )
                for n in ("a", "b")
            },
            "ports": {
                n: rows(
                    d / (n + "-port.sqlite"),
                    "SELECT identity,approved,control,revoked FROM policy ORDER BY identity",
                )
                for n in ("a", "b")
            },
        }

    def authority_hash(self):
        return hashlib.sha256(encode(self.authority_state()).encode()).hexdigest()

    def last_audit(self):
        events = rows(
            self.pipe.directory / "context.sqlite",
            "SELECT payload FROM events ORDER BY seq",
        )
        resumes = [
            json.loads(p[0]) for p in events if json.loads(p[0]).get("kind") == "resume"
        ]
        return resumes[-1]["audit"] if resumes else None

    def oracle(self):
        return {
            "verdicts": dict(self.verdicts),
            "effects": self.effects(),
            "authority_hash": self.authority_hash(),
            "audit": self.last_audit(),
        }
