"""Phase 19ag: the approval check refuses a body it cannot read, and every recorded attempt
is run on the repaired gate (P19-GUARD01). No model is a target.

Lane 19ae's seats found that a dispatched body without its ``run`` or its ``id``, sent with a
token whose signature is good, makes the gate raise ``KeyError`` where it should refuse.
``pipeline()`` returns the class a caller should use. It is lane 19ae's full gate with one
change in its approval store:

- a body that is not an object holding a string ``run`` and a string ``id`` is refused, with
  the reason ``approval_action``, before anything is read from it;
- any error raised while a token is being checked is a refusal, with the reason
  ``approval_schema``: the check fails closed.

Nothing else differs. The attempts, their list of steps, how a file is read and how an outcome
is flagged are lane 19ae's, used as they are. Reading the files and everything computed from
rows needs only the standard library.
"""

import json
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

import full19ae
from full19ae import (  # noqa: F401  the lane's limits and helpers, as lane 19ae has them
    BATCH,
    LIMIT,
    MAX_STEPS,
    OUTCOME_KEYS,
    SEAT_LIMIT,
    flags,
    steps_digest,
    writes_stores,
)
from retry19aa import sha

GATES = ("full", "guarded")
SEATS = ("seat-a", "seat-b", "seat-c")
MARK = "p19ag-outcome:"
WORKER_SECONDS = 600
DOCS = "docs/research/provenance-phase-"
# Lane 19ae's own seats are recorded attempts here: source -> (the committed file, its seat).
EARLIER_SEATS = {
    "19ae-" + seat: (f"{DOCS}19ae/submissions/{seat}.json", seat)
    for seat in full19ae.SEATS
}
RECORDED = {
    **{source: path for source, (path, _) in full19ae.RECORDED.items()},
    **{source: path for source, (path, _) in EARLIER_SEATS.items()},
}
SOURCES = (*RECORDED, *SEATS)


# reading -----------------------------------------------------------------------------------
def read_source(source, raw):
    """One source's file, read by lane 19ae's rule for the lane it came from."""
    if source in EARLIER_SEATS:
        got = full19ae.read_source(EARLIER_SEATS[source][1], raw)
    else:
        got = full19ae.read_source(source, raw)
    return {**got, "source": source}


def read_seat(seat, raw):
    """A fresh seat's file as received: the grammar is lane 19ae's."""
    return full19ae.read_seat(seat, raw)


def received(files):
    if set(files) != set(SOURCES):
        raise ValueError("sources")
    return {s: read_source(s, files[s]) for s in SOURCES}


# what a row says -----------------------------------------------------------------------------
def same(row):
    """The guarded gate gives the same verdicts, effects and latch as the full gate."""
    a, b = row["full"], row["guarded"]
    return (
        [d[:3] for d in a["dispatches"]] == [d[:3] for d in b["dispatches"]]
        and a["effects"] == b["effects"]
        and bool(a["latched"]) == bool(b["latched"])
    )


def measure(files, gate, fixture):
    """One row per attempt that is run, in source order then position. A recorded attempt
    runs on both gates; a fresh seat's runs on the guarded gate."""
    got = received(files)
    jobs = []
    for source in SOURCES:
        names = GATES if source in RECORDED else ("guarded",)
        isolate = (
            source in SEATS or source in EARLIER_SEATS or source.startswith("19z-")
        )
        for attempt in got[source]["attempts"]:
            jobs.append((source, attempt, names, isolate))
    outcomes = {}
    for name in GATES:
        mine = [(i, j) for i, j in enumerate(jobs) if name in j[2]]
        alone = [(i, j[1]["steps"]) for i, j in mine if j[3]]
        grouped = [(i, j[1]["steps"]) for i, j in mine if not j[3]]
        for i, steps in alone:
            outcomes[(i, name)] = gate.run(name, [steps])[0]
        for k in range(0, len(grouped), BATCH):
            chunk = grouped[k : k + BATCH]
            for (i, _), out in zip(chunk, gate.run(name, [s for _, s in chunk])):
                outcomes[(i, name)] = out
    rows = []
    for i, (source, attempt, names, _) in enumerate(jobs):
        row = {
            "source": source,
            "position": attempt["position"],
            "steps_sha256": steps_digest(attempt["steps"]),
            "steps_count": len(attempt["steps"]),
            "note": attempt["note"],
        }
        for name in names:
            row[name] = flags(attempt["steps"], outcomes[(i, name)], fixture)
        rows.append(row)
    return rows


def summarise(rows, got, fixture):
    recorded = [x for x in rows if x["source"] in RECORDED]
    fresh = [x for x in rows if x["source"] in SEATS]
    calm = [x for x in recorded if x["full"]["raised"] is None]
    quiet_fresh = [
        x
        for x in fresh
        if not writes_stores(
            next(
                a
                for a in got[x["source"]]["attempts"]
                if a["position"] == x["position"]
            )["steps"]
        )
    ]
    return {
        "fixture": fixture,
        "sources": {
            s: {
                "received": got[s]["received"],
                "rejected": len(got[s]["rejected"]),
                "run": sum(x["source"] == s for x in rows),
                "guarded_gained": sum(
                    x["guarded"]["gained"] for x in rows if x["source"] == s
                ),
                "guarded_raised": sum(
                    x["guarded"]["raised"] is not None for x in rows if x["source"] == s
                ),
            }
            for s in SOURCES
        },
        "totals": {
            "run": len(rows),
            "recorded": len(recorded),
            "fresh": len(fresh),
            "full_raised": sum(x["full"]["raised"] is not None for x in recorded),
            "recorded_guarded_raised": sum(
                x["guarded"]["raised"] is not None for x in recorded
            ),
            "recorded_not_raised_on_full": len(calm),
            "recorded_not_raised_same_on_guarded": sum(same(x) for x in calm),
            "guarded_unrecorded": sum(x["guarded"]["unrecorded"] for x in rows),
            "guarded_gained": sum(x["guarded"]["gained"] for x in rows),
            "fresh_without_store_writes": len(quiet_fresh),
            "fresh_without_store_writes_latched": sum(
                bool(x["guarded"]["latched"]) for x in quiet_fresh
            ),
            "fresh_without_store_writes_raised": sum(
                x["guarded"]["raised"] is not None for x in quiet_fresh
            ),
        },
    }


def hypotheses(summary):
    """G0 to G5 of P19-GUARD01, decided by rule from the summary."""
    t = summary["totals"]
    return {
        "G0": {
            "recorded": t["recorded"],
            "full_raised": t["full_raised"],
            "holds": t["full_raised"] > 0,
        },
        "G1": {
            "recorded": t["recorded"],
            "guarded_raised": t["recorded_guarded_raised"],
            "holds": t["recorded"] > 0 and t["recorded_guarded_raised"] == 0,
        },
        "G2": {
            "not_raised_on_full": t["recorded_not_raised_on_full"],
            "same": t["recorded_not_raised_same_on_guarded"],
            "holds": t["recorded_not_raised_on_full"] > 0
            and t["recorded_not_raised_same_on_guarded"]
            == t["recorded_not_raised_on_full"],
        },
        "G3": {
            "run": t["run"],
            "guarded_unrecorded": t["guarded_unrecorded"],
            "holds": t["run"] > 0 and t["guarded_unrecorded"] == 0,
        },
        "G4": {
            "run": t["run"],
            "guarded_gained": t["guarded_gained"],
            "holds": t["run"] > 0 and t["guarded_gained"] == 0,
        },
        "G5": {
            "attempts": t["fresh_without_store_writes"],
            "latched": t["fresh_without_store_writes_latched"],
            "raised": t["fresh_without_store_writes_raised"],
            "holds": t["fresh_without_store_writes"] > 0
            and t["fresh_without_store_writes_latched"] == 0
            and t["fresh_without_store_writes_raised"] == 0,
        },
    }


# the gate ------------------------------------------------------------------------------------
_FULL = (
    full19ae._pipelines
)  # lane 19ae's own classes, read before anything replaces them


def readable(action):
    """A body the approval check can read: an object with a string run and a string id."""
    return (
        type(action) is dict
        and type(action.get("run")) is str
        and type(action.get("id")) is str
    )


def _pipelines():
    full = _FULL()["full"]

    class Guarded(full):
        """Lane 19ae's full gate with an approval check that refuses what it cannot read."""

        def __init__(self, path, **kwargs):
            super().__init__(path, **kwargs)

            class Approvals(type(self.approvals)):
                """The store of the gate below, refusing where it would have raised."""

                def verify(self, action, token, *, now, key, actor=None):
                    if not readable(action):
                        return "approval_action"
                    try:
                        return super().verify(
                            action, token, now=now, key=key, actor=actor
                        )
                    except Exception:  # the check fails closed
                        return "approval_schema"

            self.approvals = Approvals(self.directory)
            self.approvals.owner = self

    return {"full": full, "guarded": Guarded}


def pipeline():
    """The class a caller should use: lane 19ae's gate, with the repaired approval check."""
    return _pipelines()["guarded"]


# running attempts on real fixtures -----------------------------------------------------------
def _worker():
    # In this process only, lane 19ae's runner builds its fixture from this lane's classes.
    full19ae._pipelines = _pipelines
    out = []
    for job in json.loads(sys.stdin.read())["jobs"]:
        out.append(full19ae._attempt(job["directory"], job["gate"], job["steps"]))
    sys.stdout.write(MARK + json.dumps(out, sort_keys=True) + "\n")


class Gate(full19ae.Gate):
    """Both gates on real fixtures, run as lane 19ae runs its own. Needs the hash-locked set."""

    def fixture(self):
        """The digest of the payload each registered action leaves at the receiver."""
        a = self.run("guarded", [[full19ae._dispatch("a")]])[0]
        b = self.run(
            "guarded",
            [
                [
                    {"do": "mint", "route": "b", "name": "t"},
                    {"do": "dispatch_with", "route": "b", "token": "t", "times": 1},
                ]
            ],
        )[0]
        if len(a["payloads"]) != 1 or len(b["payloads"]) != 1:
            raise RuntimeError("baseline")
        return {"a": a["payloads"][0], "b": b["payloads"][0]}

    def _spawn(self, name, batch):
        dirs = [self._base / f"run-{k}" for k in range(len(batch))]
        jobs = [
            {"directory": str(d), "gate": name, "steps": s} for d, s in zip(dirs, batch)
        ]
        out = None
        try:
            done = subprocess.run(
                [sys.executable, "-B", "-c", "import guard19ag; guard19ag._worker()"],
                input=json.dumps({"jobs": jobs}),
                capture_output=True,
                text=True,
                timeout=WORKER_SECONDS,
                cwd=Path(__file__).resolve().parent,
            )
            lines = [x for x in done.stdout.splitlines() if x.startswith(MARK)]
            if done.returncode == 0 and len(lines) == 1:
                out = json.loads(lines[0][len(MARK) :])
            died = "WorkerDied"
        except subprocess.TimeoutExpired:
            died = "WorkerTimeout"
        try:
            if out is None and len(batch) > 1:
                return None
            results = []
            for k, directory in enumerate(dirs):
                got = (
                    out[k]
                    if out is not None
                    else {
                        "dispatches": [],
                        "marks": {"refused": 0, "retry_limit": []},
                        "latched": [],
                        "raised": died,
                    }
                )
                try:
                    db = sqlite3.connect(directory / "service.sqlite")
                    try:
                        stored = db.execute("SELECT payload FROM effects").fetchall()
                    finally:
                        db.close()
                except sqlite3.Error:
                    stored = []
                payloads = sorted(
                    sha(p.encode() if isinstance(p, str) else bytes(p))
                    for (p,) in stored
                )
                results.append(
                    {
                        "dispatches": got["dispatches"],
                        "effects": len(stored),
                        "payloads": payloads,
                        "marks": got["marks"],
                        "latched": got["latched"],
                        "raised": got["raised"],
                    }
                )
            return results
        finally:
            for directory in dirs:
                shutil.rmtree(directory, ignore_errors=True)

    def run(self, name, batch):
        """The outcome of each attempt in ``batch``, in order."""
        if name not in GATES:
            raise ValueError("gate")
        results = self._spawn(name, batch)
        if results is None:  # the shared process died: run each attempt alone
            results = [self._spawn(name, [steps])[0] for steps in batch]
        return results
