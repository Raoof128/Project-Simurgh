"""Phase 19ad: an approval bound to what the host minted (P19-BIND01). No model is a target.

Lane 19ac found that the approval store records what a nonce was minted for and never reads
it back, so a token signed with the operator's key is admitted on the nonce of an approval
minted for another action. The repair here is beside the gate, as lane 19y's and 19z's are:

- ``Approvals``: lane 19z's store with one addition. When the host mints an approval the
  store records a digest of the whole payload it signed, and ``verify`` admits a token only
  if its payload has that digest. A token that differs in any field from what the host
  minted is refused with ``approval_replay``, whoever signed it.
- ``Pipeline``: lane 19z's sealed pipeline using that store.

Two gates are measured: ``before`` (lane 19z's) and ``bound``. One attempt is a sequence in
lane 19aa's grammar, run on a fresh fixture of each gate in a process of its own. Reading the
files and everything computed from rows needs only the standard library.
"""

import json
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

import planted19ac
import retry19aa
from planted19ac import gained
from retry19aa import sha, steps_digest, wire

# source -> (the reader of the lane that holds the file, the name it has there)
SOURCES = {
    "19aa-author": (retry19aa.read_attempts, "author"),
    "19ac-author": (planted19ac.read_attempts, "author"),
    "19ac-seat-a": (planted19ac.read_attempts, "seat-a"),
    "19ac-seat-b": (planted19ac.read_attempts, "seat-b"),
    "author": (planted19ac.read_attempts, "author"),
}
SEATS = ("19ac-seat-a", "19ac-seat-b")
GATES = ("before", "bound")
WORKER_SECONDS = 300
MARK = "p19ad-outcome:"
OUTCOME_KEYS = ("dispatches", "effects", "reasons", "latched", "raised")


def read_attempts(source, raw):
    reader, name = SOURCES[source]
    return {**reader(name, raw), "source": source}


def received(files):
    if set(files) != set(SOURCES):
        raise ValueError("sources")
    return {s: read_attempts(s, files[s]) for s in SOURCES}


def flags(steps, out):
    return {**out, "gained": gained(steps, out)}


def forged_admitted(out):
    """The undelegated action is observed on a dispatch that carried no token the host
    minted: plainly, or through a channel that held a token written by someone else."""
    return any(
        route == "b" and kind in ("plain", "adapter") and verdict == "observed"
        for route, kind, verdict in out["dispatches"]
    )


def same_outcome(row):
    """The bound gate gives the same verdict for every dispatch and the same effects."""
    return (
        row["before"]["dispatches"] == row["bound"]["dispatches"]
        and row["before"]["effects"] == row["bound"]["effects"]
    )


def measure(files, gate):
    """One row per attempt that is run, in source order then position, each on both gates."""
    got = received(files)
    rows = []
    for source in SOURCES:
        for attempt in got[source]["attempts"]:
            row = {
                "source": source,
                "position": attempt["position"],
                "steps_sha256": steps_digest(attempt["steps"]),
                "steps_count": len(attempt["steps"]),
                "note": attempt["note"],
            }
            for name in GATES:
                row[name] = flags(attempt["steps"], gate.run(name, attempt["steps"]))
            rows.append(row)
    return rows


def summarise(rows, got):
    def block(source):
        mine = [x for x in rows if x["source"] == source]
        return {
            "received": got[source]["received"],
            "rejected": len(got[source]["rejected"]),
            "run": len(mine),
            "before_gained": sum(x["before"]["gained"] for x in mine),
            "bound_gained": sum(x["bound"]["gained"] for x in mine),
        }

    sources = {s: block(s) for s in SOURCES}
    quiet = [x for x in rows if not forged_admitted(x["before"])]
    resigned = [
        x for x in rows if forged_admitted(x["before"]) and not x["before"]["gained"]
    ]
    return {
        "sources": sources,
        "totals": {
            "run": len(rows),
            "before_gained": sum(s["before_gained"] for s in sources.values()),
            "bound_gained": sum(s["bound_gained"] for s in sources.values()),
            "seats_before_gained": sum(sources[s]["before_gained"] for s in SEATS),
            "author_before_gained": sources["author"]["before_gained"],
            "no_forged_token_admitted_before": len(quiet),
            "no_forged_token_admitted_before_same_on_bound": sum(
                same_outcome(x) for x in quiet
            ),
            "resigned_for_an_approved_action": len(resigned),
            "resigned_for_an_approved_action_admitted_on_bound": sum(
                forged_admitted(x["bound"]) for x in resigned
            ),
            "bound_latched": sum(bool(x["bound"]["latched"]) for x in rows),
            "bound_raised": sum(x["bound"]["raised"] is not None for x in rows),
        },
        "reasons": {
            name: dict(
                sorted(
                    sum((Counter(x[name]["reasons"]) for x in rows), Counter()).items()
                )
            )
            for name in GATES
        },
    }


def hypotheses(summary):
    """D0 to D3 of P19-BIND01, decided by rule from the summary."""
    t = summary["totals"]
    return {
        "D0": {
            "seats_before_gained": t["seats_before_gained"],
            "author_before_gained": t["author_before_gained"],
            "holds": t["seats_before_gained"] == 6 and t["author_before_gained"] > 0,
        },
        "D1": {
            "run": t["run"],
            "bound_gained": t["bound_gained"],
            "holds": t["run"] > 0 and t["bound_gained"] == 0,
        },
        "D2": {
            "no_forged_token_admitted_before": t["no_forged_token_admitted_before"],
            "same_on_bound": t["no_forged_token_admitted_before_same_on_bound"],
            "holds": t["no_forged_token_admitted_before"] > 0
            and t["no_forged_token_admitted_before_same_on_bound"]
            == t["no_forged_token_admitted_before"],
        },
        "D3": {
            "latched": t["bound_latched"],
            "raised": t["bound_raised"],
            "holds": t["run"] > 0
            and t["bound_latched"] == 0
            and t["bound_raised"] == 0,
        },
    }


# the repair -----------------------------------------------------------------------------------
def _pipelines():
    import repair19y
    import seal19z

    class Approvals(seal19z._Approvals):
        """Lane 19z's approval store, remembering what it minted."""

        def mint(self, action, **kwargs):
            if self.owner is not None and not self.owner.intact():
                raise ValueError(seal19z.LATCHED)
            try:
                token = repair19y.ApprovalStore.mint(self, action, **kwargs)
                with sqlite3.connect(self.path) as db:
                    db.execute(
                        "CREATE TABLE IF NOT EXISTS minted"
                        "(nonce TEXT PRIMARY KEY, payload_sha256 TEXT)"
                    )
                    db.execute(
                        "INSERT INTO minted VALUES(?,?)",
                        (token["payload"]["nonce"], sha(wire(token["payload"]))),
                    )
                return token
            finally:
                if self.owner is not None:
                    self.owner.reseal()

        def verify(self, action, token, *, now, key, actor=None):
            reason = super().verify(action, token, now=now, key=key, actor=actor)
            if reason != "ok":
                return reason
            try:
                with sqlite3.connect(self.path) as db:
                    row = db.execute(
                        "SELECT payload_sha256 FROM minted WHERE nonce=?",
                        (token["payload"]["nonce"],),
                    ).fetchone()
                digest = sha(wire(token["payload"]))
            except (sqlite3.Error, ValueError, TypeError):
                return "approval_replay"
            return "ok" if row is not None and row[0] == digest else "approval_replay"

    class Pipeline(seal19z.Pipeline):
        """Lane 19z's sealed gate with the store that remembers what it minted."""

        def __init__(self, path, **kwargs):
            super().__init__(path, **kwargs)
            self.approvals = Approvals(self.directory)
            self.approvals.owner = self

    return {"before": seal19z.Pipeline, "bound": Pipeline}


def pipeline():
    """The repaired pipeline class, for a caller that wants the repair."""
    return _pipelines()["bound"]


# running one sequence on a real fixture ------------------------------------------------------
def _sequence(directory, name, steps):
    import gate19
    import seal19z

    rig = seal19z.Rig(Path(directory), gate_cls=_pipelines()[name])
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
        reasons = Counter()
        if not rig.latched():
            for kind in gate19.pipeline_events(rig.pipe):
                if kind.startswith("approval_"):
                    reasons[kind] += 1
        return {
            "dispatches": done,
            "reasons": dict(sorted(reasons.items())),
            "latched": [n.rsplit("/", 1)[-1] for n in rig.latched()],
            "raised": raised,
        }
    finally:
        rig.close()


def _worker():
    job = json.loads(sys.stdin.read())
    out = _sequence(job["directory"], job["gate"], job["steps"])
    sys.stdout.write(MARK + json.dumps(out, sort_keys=True) + "\n")


class Gate:
    """Both gates, each on a fresh fixture per sequence in a process of its own. Needs the
    hash-locked set."""

    def __init__(self):
        import seal19z  # noqa: F401  fail here on a host without the locked set

        self._base = Path(tempfile.mkdtemp(prefix="p19ad-"))

    def run(self, name, steps):
        if name not in GATES:
            raise ValueError("gate")
        directory = self._base / "run"
        job = json.dumps({"directory": str(directory), "gate": name, "steps": steps})
        try:
            done = subprocess.run(
                [sys.executable, "-B", "-c", "import bind19ad; bind19ad._worker()"],
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
                out = {"dispatches": [], "reasons": {}, "latched": [], "raised": died}
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
                "reasons": out["reasons"],
                "latched": out["latched"],
                "raised": out["raised"],
            }
        finally:
            shutil.rmtree(directory, ignore_errors=True)

    def close(self):
        shutil.rmtree(self._base, ignore_errors=True)
