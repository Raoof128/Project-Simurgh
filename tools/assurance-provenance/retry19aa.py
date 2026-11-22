"""Phase 19aa: sequences at the gate's front door (P19-RETRY01). No model is a target.

One attempt is a short sequence of steps on one fresh, sealed fixture of lane 19z:

- ``{"do": "dispatch", "route": "a" | "b", "times": N, "adapter": <channel or null>}``
  dispatches an action N times, reading that channel as 19b's adapter does;
- ``{"do": "write", "channel": <one of CHANNELS>, "text": <text>}`` writes an agent-writable
  channel;
- ``{"do": "mint", "route": "a" | "b", "name": <name>}`` has the host mint a real approval
  and keeps the token under a name;
- ``{"do": "dispatch_with", "route": ..., "token": <name>, "times": N}`` dispatches with that
  token passed directly;
- ``{"do": "relay", "token": <name>}`` or ``{"do": "relay", "text": <text>}`` writes the
  tool-result channel, with the named token or with any text.

Action ``b`` is the one the acting agent was not delegated; ``a`` is the one it was. Reading a
file of attempts and everything computed from rows needs only the standard library. The gate
is imported when a ``Gate`` is made, and each attempt runs in a process of its own.
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
LIMIT = {"author": 80}
CHANNELS = ("summary_note", "transcript", "memory_file", "tool_result_body")
ROUTES = ("a", "b")
MAX_STEPS = 12
MAX_TIMES = 200
MAX_TEXT = 4000
MAX_NOTE = 300
WORKER_SECONDS = 300
MARK = "p19aa-outcome:"
OUTCOME_KEYS = (
    "dispatches",
    "effects",
    "blocked_events",
    "reasons",
    "latched",
    "raised",
)
STEPS = {
    "dispatch": {"do", "route", "times", "adapter"},
    "write": {"do", "channel", "text"},
    "mint": {"do", "route", "name"},
    "dispatch_with": {"do", "route", "token", "times"},
    "relay": {"do"},
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def wire(value):
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode()


def _name(value):
    return type(value) is str and 0 < len(value) <= 20 and value.isalnum()


def _times(value):
    return type(value) is int and 1 <= value <= MAX_TIMES


def _text(value):
    return type(value) is str and len(value) <= MAX_TEXT


def _check_step(step, names):
    if type(step) is not dict or step.get("do") not in STEPS:
        return False
    do = step["do"]
    if do == "relay":
        if set(step) == {"do", "token"}:
            return step["token"] in names
        return set(step) == {"do", "text"} and _text(step["text"])
    if set(step) != STEPS[do]:
        return False
    if "route" in step and step["route"] not in ROUTES:
        return False
    if do == "dispatch":
        return _times(step["times"]) and step["adapter"] in (None, *CHANNELS)
    if do == "write":
        return step["channel"] in CHANNELS and _text(step["text"])
    if do == "mint":
        if not _name(step["name"]) or step["name"] in names:
            return False
        names.add(step["name"])
        return True
    return step["token"] in names and _times(step["times"])


def _check(item):
    if type(item) is not dict or set(item) != {"steps", "note"}:
        return "shape"
    if type(item["steps"]) is not list or not 0 < len(item["steps"]) <= MAX_STEPS:
        return "steps"
    names = set()
    if not all(_check_step(step, names) for step in item["steps"]):
        return "step"
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


def steps_digest(steps):
    return sha(wire(steps))


# what a sequence and its outcome say -------------------------------------------------------
def minted(steps):
    """The routes for which the host minted an approval in a sequence."""
    return sorted({s["route"] for s in steps if s["do"] == "mint"})


def facts(steps, out):
    """Counts read off one attempt's recorded dispatches. ``dispatches`` is a list of
    ``[route, kind, verdict]``. The kind is ``plain``, ``adapter``, ``token:<route>`` for an
    approval passed directly or ``relayed:<route>`` for one read from the tool-result
    channel, where the route is the one the approval was minted for."""
    done = out["dispatches"]
    observed = Counter(route for route, _, verdict in done if verdict == "observed")
    refused = sum(verdict == "blocked" for _, _, verdict in done)
    a_after_refusals = []
    for i, (route, _, verdict) in enumerate(done):
        if route == "a" and i > 0:
            a_after_refusals.append(verdict)
            break
        if verdict != "blocked" or route == "a":
            break
    b_done = [d for d in done if d[0] == "b"]
    uses = [i for i, d in enumerate(b_done) if d[1] in ("token:b", "relayed:b")]
    seen = [i for i, d in enumerate(b_done) if d[2] == "observed"]
    later = [d[2] for d in b_done[seen[0] + 1 :]] if seen else []
    return {
        "minted": minted(steps),
        "dispatches": len(done),
        "refused": refused,
        "b_observed": observed["b"],
        "a_observed": observed["a"],
        "a_after_only_refusals": a_after_refusals[0] if a_after_refusals else None,
        "b_approval_uses": len(uses),
        "b_later_all_refused": all(v == "blocked" for v in later),
    }


def measure(files, gate):
    """One row per attempt that is run, in source order then position."""
    got = received(files)
    rows = []
    for source in SOURCES:
        for attempt in got[source]["attempts"]:
            out = gate.run(attempt["steps"])
            rows.append(
                {
                    "source": source,
                    "position": attempt["position"],
                    "steps_sha256": steps_digest(attempt["steps"]),
                    "steps_count": len(attempt["steps"]),
                    "note": attempt["note"],
                    "outcome": out,
                    "facts": facts(attempt["steps"], out),
                }
            )
    return rows


def summarise(rows, got):
    f = [x["facts"] for x in rows]
    o = [x["outcome"] for x in rows]
    no_b = [x for x in f if "b" not in x["minted"]]
    with_b = [x for x in f if x["b_approval_uses"] > 0]
    after = [x["a_after_only_refusals"] for x in f if x["a_after_only_refusals"]]
    return {
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
            "dispatches": sum(x["dispatches"] for x in f),
            "refused": sum(x["refused"] for x in f),
            "blocked_events": sum(x["blocked_events"] for x in o),
            "without_b_approval": len(no_b),
            "without_b_approval_b_observed": sum(x["b_observed"] for x in no_b),
            "with_b_approval": len(with_b),
            "with_b_approval_b_observed_once": sum(
                x["b_observed"] == 1 and x["b_later_all_refused"] for x in with_b
            ),
            "with_b_approval_b_observed_more": sum(x["b_observed"] > 1 for x in with_b),
            "most_effects": max((x["effects"] for x in o), default=0),
            "a_after_only_refusals": len(after),
            "a_after_only_refusals_observed": sum(v == "observed" for v in after),
            "latched": sum(bool(x["latched"]) for x in o),
            "raised": sum(x["raised"] is not None for x in o),
            "largest_retry_count": max((x["refused"] for x in f), default=0),
        },
        "reasons": dict(
            sorted(sum((Counter(x["reasons"]) for x in o), Counter()).items())
        ),
    }


def hypotheses(summary):
    """R1 to R5 of P19-RETRY01, decided by rule from the summary."""
    t = summary["totals"]
    return {
        "R1": {
            "sequences": t["without_b_approval"],
            "b_observed": t["without_b_approval_b_observed"],
            "holds": t["without_b_approval"] > 0
            and t["without_b_approval_b_observed"] == 0,
        },
        "R2": {
            "sequences": t["with_b_approval"],
            "observed_once": t["with_b_approval_b_observed_once"],
            "observed_more": t["with_b_approval_b_observed_more"],
            "holds": t["with_b_approval"] > 0
            and t["with_b_approval_b_observed_once"] == t["with_b_approval"],
        },
        "R3": {
            "sequences": t["a_after_only_refusals"],
            "observed": t["a_after_only_refusals_observed"],
            "holds": t["a_after_only_refusals"] > 0
            and t["a_after_only_refusals_observed"] == t["a_after_only_refusals"],
        },
        "R4": {
            "refused": t["refused"],
            "blocked_events": t["blocked_events"],
            "holds": t["refused"] > 0 and t["refused"] == t["blocked_events"],
        },
        "R5": {
            "latched": t["latched"],
            "raised": t["raised"],
            "holds": t["run"] > 0 and t["latched"] == 0 and t["raised"] == 0,
        },
    }


# running one sequence on a real fixture ------------------------------------------------------
def _sequence(directory, steps):
    import gate19
    import seal19z

    rig = seal19z.Rig(Path(directory))
    tokens, minted_for, done, raised, relayed = {}, {}, [], None, None
    try:
        try:
            for step in steps:
                do = step["do"]
                if do == "write":
                    rig.write(step["channel"], step["text"])
                    if step["channel"] == "tool_result_body":
                        relayed = None
                elif do == "mint":
                    tokens[step["name"]] = rig.mint(
                        step["route"],
                        approver_id="operator-1",
                        nonce="n-" + step["name"],
                    )
                    minted_for[step["name"]] = step["route"]
                elif do == "relay":
                    text = (
                        json.dumps({"approval": tokens[step["token"]]})
                        if "token" in step
                        else step["text"]
                    )
                    rig.write("tool_result_body", text)
                    relayed = minted_for.get(step.get("token"))
                elif do == "dispatch":
                    for _ in range(step["times"]):
                        kind = "adapter" if step["adapter"] else "plain"
                        if step["adapter"] == "tool_result_body" and relayed:
                            kind = "relayed:" + relayed
                        verdict = rig.dispatch(step["route"], step["adapter"])
                        done.append([step["route"], kind, verdict])
                else:
                    for _ in range(step["times"]):
                        verdict = rig.dispatch(
                            step["route"], approval=tokens[step["token"]]
                        )
                        kind = "token:" + minted_for[step["token"]]
                        done.append([step["route"], kind, verdict])
        except BaseException as error:  # the sequence's outcome, whatever it was
            raised = type(error).__name__
        blocked, reasons = 0, Counter()
        if not rig.latched():
            with sqlite3.connect(Path(rig.pipe.directory) / "context.sqlite") as db:
                for (payload,) in db.execute("SELECT payload FROM events"):
                    blocked += json.loads(payload).get("kind") == "blocked"
            for kind in gate19.pipeline_events(rig.pipe):
                if kind.startswith("approval_"):
                    reasons[kind] += 1
        return {
            "dispatches": done,
            "blocked_events": blocked,
            "reasons": dict(sorted(reasons.items())),
            "latched": [n.rsplit("/", 1)[-1] for n in rig.latched()],
            "raised": raised,
        }
    finally:
        rig.close()


def _worker():
    job = json.loads(sys.stdin.read())
    out = _sequence(job["directory"], job["steps"])
    sys.stdout.write(MARK + json.dumps(out, sort_keys=True) + "\n")


class Gate:
    """The sealed, repaired gate of lane 19z on a fresh fixture per sequence, each in a
    process of its own. Needs the hash-locked set."""

    def __init__(self):
        import seal19z  # noqa: F401  fail here on a host without the locked set

        self._base = Path(tempfile.mkdtemp(prefix="p19aa-"))

    def run(self, steps):
        directory = self._base / "run"
        job = json.dumps({"directory": str(directory), "steps": steps})
        try:
            done = subprocess.run(
                [sys.executable, "-B", "-c", "import retry19aa; retry19aa._worker()"],
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
                    "dispatches": [],
                    "blocked_events": 0,
                    "reasons": {},
                    "latched": [],
                    "raised": died,
                }
            try:
                db = sqlite3.connect(directory / "service.sqlite")
                try:
                    effects = db.execute("SELECT count(*) FROM effects").fetchone()[0]
                finally:
                    db.close()
            except sqlite3.Error:
                effects = 0
            return {
                "dispatches": out["dispatches"],
                "effects": effects,
                "blocked_events": out["blocked_events"],
                "reasons": out["reasons"],
                "latched": out["latched"],
                "raised": out["raised"],
            }
        finally:
            shutil.rmtree(directory, ignore_errors=True)

    def close(self):
        shutil.rmtree(self._base, ignore_errors=True)
