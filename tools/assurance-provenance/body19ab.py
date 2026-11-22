"""Phase 19ab: changed bodies of a delegated or approved action (P19-BODY01). No model is a
target.

One attempt is one body, a JSON object, and a route, on one fresh, sealed fixture of lane 19z:

- route ``a``: the body is dispatched once in place of the delegated action, with no approval,
  and then the delegated action is dispatched unchanged;
- route ``b``: the host mints an approval for the unchanged undelegated action, the body is
  dispatched once with that approval, and then the unchanged action is dispatched with the
  same approval.

A body is changed when its canonical JSON is not the canonical JSON of the unchanged action,
so the same keys and values in another order are not a change. Reading a file of attempts and
everything computed from rows needs only the standard library. The gate is imported when a
``Gate`` is made, and each attempt runs in a process of its own.
"""

import hashlib
import json
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

SOURCES = ("author",)
LIMIT = {"author": 120}
ROUTES = ("a", "b")
MAX_BODY = 6000
MAX_NOTE = 300
WORKER_SECONDS = 180
MARK = "p19ab-outcome:"
OUTCOME_KEYS = (
    "first",
    "second",
    "effects",
    "payloads",
    "blocked_events",
    "reasons",
    "latched",
    "raised",
)
VERDICTS = ("observed", "blocked", None)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def wire(value):
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode()


def as_written(body):
    """The body's bytes with its keys in the order the file gives them."""
    return json.dumps(body, separators=(",", ":"), allow_nan=False).encode()


def _check(item):
    if type(item) is not dict or set(item) != {"route", "body", "note"}:
        return "shape"
    if item["route"] not in ROUTES:
        return "route"
    if type(item["body"]) is not dict:
        return "body"
    try:
        if len(wire(item["body"])) > MAX_BODY:
            return "body"
    except (ValueError, TypeError, RecursionError):
        return "body"
    if type(item["note"]) is not str or len(item["note"]) > MAX_NOTE:
        return "note"
    return None


def read_attempts(source, raw):
    """A file of attempts as received: the ones that will be run, each with its position,
    and every one that will not be run with the reason."""
    if source not in SOURCES:
        raise ValueError("source")
    out = {"source": source, "sha256": sha(raw), "received": 0}
    try:
        value = json.loads(raw)
    except (ValueError, RecursionError):
        value = None
    if (
        type(value) is not dict
        or set(value) != {"attacker", "attempts"}
        or value["attacker"] != source
        or type(value["attempts"]) is not list
    ):
        return {
            **out,
            "attempts": [],
            "rejected": [{"position": None, "reason": "file"}],
        }
    attempts, rejected = [], []
    for position, item in enumerate(value["attempts"]):
        reason = "over_limit" if len(attempts) >= LIMIT[source] else None
        reason = _check(item) or reason
        if reason:
            rejected.append({"position": position, "reason": reason})
        else:
            attempts.append({"position": position, **item})
    return {
        **out,
        "received": len(value["attempts"]),
        "attempts": attempts,
        "rejected": rejected,
    }


def received(files):
    if set(files) != set(SOURCES):
        raise ValueError("sources")
    return {s: read_attempts(s, files[s]) for s in SOURCES}


# what an attempt and its outcome say --------------------------------------------------------
def changed(route, body, fixture):
    return wire(body) != wire(fixture["actions"][route])


def facts(route, body, out, fixture):
    return {
        "changed": changed(route, body, fixture),
        "first_observed": out["first"] == "observed",
        "second_observed": out["second"] == "observed",
        "payloads_are_the_unchanged_one": all(
            p == fixture["payload_sha256"][route] for p in out["payloads"]
        ),
    }


def measure(files, gate, fixture):
    """One row per attempt that is run, in source order then position."""
    got = received(files)
    rows = []
    for source in SOURCES:
        for attempt in got[source]["attempts"]:
            out = gate.run(attempt["route"], attempt["body"])
            rows.append(
                {
                    "source": source,
                    "position": attempt["position"],
                    "route": attempt["route"],
                    "body_sha256": sha(as_written(attempt["body"])),
                    "note": attempt["note"],
                    "outcome": out,
                    "facts": facts(attempt["route"], attempt["body"], out, fixture),
                }
            )
    return rows


def summarise(rows, got, fixture):
    def pick(route, is_changed):
        return [
            x
            for x in rows
            if x["route"] == route and x["facts"]["changed"] is is_changed
        ]

    moved = [x for x in rows if x["facts"]["changed"]]
    same = [x for x in rows if not x["facts"]["changed"]]
    a_refused = [x for x in pick("a", True) if x["outcome"]["first"] == "blocked"]
    b_moved = pick("b", True)
    o = [x["outcome"] for x in rows]
    return {
        "fixture": fixture,
        "sources": {
            s: {
                "received": got[s]["received"],
                "rejected": len(got[s]["rejected"]),
                "run": sum(x["source"] == s for x in rows),
            }
            for s in SOURCES
        },
        "totals": {
            "run": len(rows),
            "changed": len(moved),
            "changed_observed": sum(x["facts"]["first_observed"] for x in moved),
            "payloads": sum(len(x["payloads"]) for x in o),
            "payloads_not_the_unchanged_one": sum(
                p != fixture["payload_sha256"][x["route"]]
                for x in rows
                for p in x["outcome"]["payloads"]
            ),
            "route_a_changed_refused": len(a_refused),
            "route_a_changed_refused_then_observed": sum(
                x["facts"]["second_observed"] for x in a_refused
            ),
            "route_b_changed": len(b_moved),
            "route_b_changed_refused": sum(
                x["outcome"]["first"] == "blocked" for x in b_moved
            ),
            "route_b_changed_then_honoured_once": sum(
                x["facts"]["second_observed"] and x["outcome"]["effects"] == 1
                for x in b_moved
            ),
            "unchanged": len(same),
            "unchanged_observed": sum(x["facts"]["first_observed"] for x in same),
            "most_effects": max((x["effects"] for x in o), default=0),
            "latched": sum(bool(x["latched"]) for x in o),
            "raised": sum(x["raised"] is not None for x in o),
        },
        "reasons": dict(
            sorted(sum((Counter(x["reasons"]) for x in o), Counter()).items())
        ),
    }


def hypotheses(summary):
    """B1 to B5 of P19-BODY01, decided by rule from the summary."""
    t = summary["totals"]
    return {
        "B1": {
            "changed": t["changed"],
            "observed": t["changed_observed"],
            "holds": t["changed"] > 0 and t["changed_observed"] == 0,
        },
        "B2": {
            "payloads": t["payloads"],
            "not_the_unchanged_one": t["payloads_not_the_unchanged_one"],
            "holds": t["payloads"] > 0 and t["payloads_not_the_unchanged_one"] == 0,
        },
        "B3": {
            "refused": t["route_a_changed_refused"],
            "then_observed": t["route_a_changed_refused_then_observed"],
            "holds": t["route_a_changed_refused"] > 0
            and t["route_a_changed_refused_then_observed"]
            == t["route_a_changed_refused"],
        },
        "B4": {
            "changed": t["route_b_changed"],
            "refused": t["route_b_changed_refused"],
            "then_honoured_once": t["route_b_changed_then_honoured_once"],
            "holds": t["route_b_changed"] > 0
            and t["route_b_changed_refused"] == t["route_b_changed"]
            and t["route_b_changed_then_honoured_once"] == t["route_b_changed"],
        },
        "B5": {
            "latched": t["latched"],
            "raised": t["raised"],
            "holds": t["run"] > 0 and t["latched"] == 0 and t["raised"] == 0,
        },
    }


# running one attempt on a real fixture ------------------------------------------------------
def _attempt(directory, route, body):
    import gate19
    import seal19z

    rig = seal19z.Rig(Path(directory))
    first, second, raised = None, None, None
    try:
        token = None
        try:
            if route == "b":
                token = rig.mint("b", approver_id="operator-1", nonce="n-1")
            first = rig.dispatch_action(body, approval=token)
        except BaseException as error:  # the attempt's outcome, whatever it was
            raised = type(error).__name__
        try:
            second = rig.dispatch(route, approval=token)
        except BaseException as error:
            raised = raised or type(error).__name__
        blocked, reasons = 0, Counter()
        if not rig.latched():
            with sqlite3.connect(Path(rig.pipe.directory) / "context.sqlite") as db:
                for (payload,) in db.execute("SELECT payload FROM events"):
                    blocked += json.loads(payload).get("kind") == "blocked"
            for kind in gate19.pipeline_events(rig.pipe):
                if kind.startswith("approval_"):
                    reasons[kind] += 1
        return {
            "first": first,
            "second": second,
            "blocked_events": blocked,
            "reasons": dict(sorted(reasons.items())),
            "latched": [n.rsplit("/", 1)[-1] for n in rig.latched()],
            "raised": raised,
        }
    finally:
        rig.close()


def _worker():
    job = json.loads(sys.stdin.read())
    out = _attempt(job["directory"], job["route"], job["body"])
    sys.stdout.write(MARK + json.dumps(out, sort_keys=True) + "\n")


class Gate:
    """The sealed, repaired gate of lane 19z on a fresh fixture per attempt, each in a process
    of its own. Needs the hash-locked set."""

    def __init__(self):
        import rig

        self._actions = rig.actions_for()
        self._base = Path(tempfile.mkdtemp(prefix="p19ab-"))

    def fixture(self):
        """The two unchanged actions and the digest of the payload each one leaves at the
        receiver when it is dispatched as declared."""
        digests = {}
        for route in ROUTES:
            out = self.run(route, self._actions[route])
            if out["first"] != "observed" or len(out["payloads"]) != 1:
                raise RuntimeError("baseline:" + route)
            digests[route] = out["payloads"][0]
        return {"actions": self._actions, "payload_sha256": digests}

    def run(self, route, body):
        directory = self._base / "run"
        job = json.dumps({"directory": str(directory), "route": route, "body": body})
        try:
            done = subprocess.run(
                [sys.executable, "-B", "-c", "import body19ab; body19ab._worker()"],
                input=job,
                capture_output=True,
                text=True,
                timeout=WORKER_SECONDS,
                cwd=Path(__file__).resolve().parent,
            )
            lines = [x for x in done.stdout.splitlines() if x.startswith(MARK)]
            if done.returncode == 0 and len(lines) == 1:
                out = json.loads(lines[0][len(MARK) :])
            else:
                out = None
            died = "WorkerDied"
        except subprocess.TimeoutExpired:
            out, died = None, "WorkerTimeout"
        try:
            if out is None:
                out = {
                    "first": None,
                    "second": None,
                    "blocked_events": 0,
                    "reasons": {},
                    "latched": [],
                    "raised": died,
                }
            try:
                db = sqlite3.connect(directory / "service.sqlite")
                try:
                    stored = db.execute("SELECT payload FROM effects").fetchall()
                finally:
                    db.close()
            except sqlite3.Error:
                stored = []
            payloads = sorted(
                sha(p.encode() if isinstance(p, str) else bytes(p)) for (p,) in stored
            )
            return {
                "first": out["first"],
                "second": out["second"],
                "effects": len(stored),
                "payloads": payloads,
                "blocked_events": out["blocked_events"],
                "reasons": out["reasons"],
                "latched": out["latched"],
                "raised": out["raised"],
            }
        finally:
            shutil.rmtree(directory, ignore_errors=True)

    def close(self):
        shutil.rmtree(self._base, ignore_errors=True)
