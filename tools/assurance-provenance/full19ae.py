"""Phase 19ae: one gate with every repair, and every recorded attempt run on it (P19-FULL01).
No model is a target.

``pipeline()`` returns the class a caller should use. It is lane 19ad's bound gate, and so
lane 19z's seal and lane 19y's repairs, with two additions in the session it hands out:

- a refused dispatch that left no record in the gate's log or the pipeline's log gets one,
  ``refused:<label>``;
- when a label has been refused ``LIMIT`` times with no admitted dispatch of that label in
  between, one ``retry_limit:<label>`` record is written.

The label is the action's name when it is a registered one and ``other`` when it is not.
Neither addition changes a decision. The second is a mark in the log, not a cap.

An attempt is a list of steps: lane 19aa's five, a ``body`` step (a JSON object dispatched in
place of an action, with a minted token, a token given as text, or none) and an ``ops`` step
(lane 19z's writes to the gate's own stores). Earlier lanes' files are converted to that list
by rule. Reading the files and everything computed from rows needs only the standard library.
"""

import json
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

import body19ab
import planted19ac
import redteam19y
import retry19aa
import tamper19z
from retry19aa import sha, wire

LIMIT = 20
GATES = ("bound", "full")
SEATS = ("seat-a", "seat-b", "seat-c")
SEAT_LIMIT = 40
MAX_STEPS = 12
MAX_NOTE = 300
BATCH = 25
WORKER_SECONDS = 600
MARK = "p19ae-outcome:"
OUTCOME_KEYS = (
    "dispatches",
    "effects",
    "payloads",
    "marks",
    "latched",
    "raised",
)
TRB = "tool_result_body"
DOCS = "docs/research/provenance-phase-"
# source -> (the committed file, how it is read)
RECORDED = {
    **{
        "19t-" + a: (f"{DOCS}19t/submissions/{a}.json", ("channel", 1, a))
        for a in redteam19y.ROUND_ONE
    },
    **{
        "19y-" + a: (f"{DOCS}19y/submissions/{a}.json", ("channel", 2, a))
        for a in redteam19y.ROUND_TWO
    },
    "19z-author": (f"{DOCS}19z/attempts-author.json", ("ops", "author")),
    "19z-seat-a": (f"{DOCS}19z/submissions/seat-a.json", ("ops", "seat-a")),
    "19z-seat-b": (f"{DOCS}19z/submissions/seat-b.json", ("ops", "seat-b")),
    "19aa-author": (f"{DOCS}19aa/attempts-author.json", ("sequence19aa",)),
    "19ab-author": (f"{DOCS}19ab/attempts-author.json", ("body",)),
    "19ac-author": (f"{DOCS}19ac/attempts-author.json", ("sequence", "author")),
    "19ac-seat-a": (f"{DOCS}19ac/submissions/seat-a.json", ("sequence", "seat-a")),
    "19ac-seat-b": (f"{DOCS}19ac/submissions/seat-b.json", ("sequence", "seat-b")),
    "19ad-author": (f"{DOCS}19ad/attempts-author.json", ("sequence", "author")),
}
SOURCES = (*RECORDED, *SEATS)


def _dispatch(route, adapter=None):
    return {"do": "dispatch", "route": route, "times": 1, "adapter": adapter}


# reading -----------------------------------------------------------------------------------
def _check_step(step, names):
    if type(step) is not dict:
        return False
    if step.get("do") == "body":
        if (
            set(step) != {"do", "body", "token", "text"}
            or type(step["body"]) is not dict
        ):
            return False
        try:
            if len(wire(step["body"])) > body19ab.MAX_BODY:
                return False
        except (ValueError, TypeError, RecursionError):
            return False
        token, text = step["token"], step["text"]
        if token is not None and text is not None:
            return False
        if token is not None and token not in names:
            return False
        return text is None or (type(text) is str and len(text) <= retry19aa.MAX_TEXT)
    if step.get("do") == "ops":
        return (
            set(step) == {"do", "ops"}
            and type(step["ops"]) is list
            and 0 < len(step["ops"]) <= tamper19z.MAX_OPS
            and all(tamper19z._check_op(op) for op in step["ops"])
        )
    return retry19aa._check_step(step, names)


def _check(item):
    if type(item) is not dict or set(item) != {"steps", "note"}:
        return "shape"
    if type(item["steps"]) is not list or not 0 < len(item["steps"]) <= MAX_STEPS:
        return "steps"
    names = set()
    try:
        if not all(_check_step(step, names) for step in item["steps"]):
            return "step"
    except (TypeError, ValueError, RecursionError):
        return "step"
    if type(item["note"]) is not str or len(item["note"]) > MAX_NOTE:
        return "note"
    return None


def read_seat(seat, raw):
    """A seat's file as received."""
    out = {"sha256": sha(raw), "received": 0}
    try:
        value = json.loads(raw)
    except (ValueError, RecursionError):
        value = None
    if (
        type(value) is not dict
        or set(value) != {"attacker", "attempts"}
        or value["attacker"] != seat
        or type(value["attempts"]) is not list
    ):
        return {
            **out,
            "attempts": [],
            "rejected": [{"position": None, "reason": "file"}],
        }
    attempts, rejected = [], []
    for position, item in enumerate(value["attempts"]):
        reason = "over_limit" if len(attempts) >= SEAT_LIMIT else None
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


def _convert(how, attempt):
    """An earlier lane's attempt as a list of steps."""
    kind = how[0]
    if kind == "channel":
        channel = attempt["channel"]
        return [
            {"do": "write", "channel": channel, "text": attempt["text"]},
            _dispatch("b", channel),
            _dispatch("a", channel),
        ]
    if kind == "ops":
        adapter = TRB if any(o["op"] == "relay" for o in attempt["ops"]) else None
        return [
            {"do": "ops", "ops": attempt["ops"]},
            _dispatch("b", adapter),
            _dispatch("a", adapter),
        ]
    if kind == "body":
        if attempt["route"] == "a":
            return [
                {"do": "body", "body": attempt["body"], "token": None, "text": None},
                _dispatch("a"),
            ]
        return [
            {"do": "mint", "route": "b", "name": "t"},
            {"do": "body", "body": attempt["body"], "token": "t", "text": None},
            {"do": "dispatch_with", "route": "b", "token": "t", "times": 1},
        ]
    return attempt["steps"]


def read_source(source, raw):
    """One source's file: the attempts that will be run, each as a list of steps with its
    position in the file, and every attempt that will not be run with the reason."""
    if source in SEATS:
        got = read_seat(source, raw)
    else:
        how = RECORDED[source][1]
        if how[0] == "channel":
            got = redteam19y.read_submission(how[1], how[2], raw)
        elif how[0] == "ops":
            got = tamper19z.read_attempts(how[1], raw)
        elif how[0] == "sequence19aa":
            got = retry19aa.read_attempts("author", raw)
        elif how[0] == "body":
            got = body19ab.read_attempts("author", raw)
        else:
            got = planted19ac.read_attempts(how[1], raw)
    how = RECORDED[source][1] if source in RECORDED else ("sequence",)
    return {
        "source": source,
        "sha256": sha(raw),
        "received": got["received"],
        "rejected": got["rejected"],
        "attempts": [
            {
                "position": a["position"],
                "note": a["note"],
                "steps": _convert(how, a),
            }
            for a in got["attempts"]
        ],
    }


def received(files):
    if set(files) != set(SOURCES):
        raise ValueError("sources")
    return {s: read_source(s, files[s]) for s in SOURCES}


def steps_digest(steps):
    return sha(wire(steps))


# what an attempt and its outcome say ---------------------------------------------------------
def minted(steps):
    return sorted({s["route"] for s in steps if s["do"] == "mint"})


def writes_stores(steps):
    return any(s["do"] == "ops" for s in steps)


def gained(steps, out, fixture):
    """The undelegated action is observed, or its payload reaches the receiver, where the
    host minted no approval for it; or more than one effect lands; or a payload lands that
    is not one of the two registered actions'."""
    b_minted = "b" in minted(steps)
    b_seen = any(d[0] == "b" and d[2] == "observed" for d in out["dispatches"])
    b_sent = fixture["b"] in out["payloads"]
    foreign = any(p not in (fixture["a"], fixture["b"]) for p in out["payloads"])
    return ((b_seen or b_sent) and not b_minted) or out["effects"] > 1 or foreign


def unrecorded(out):
    """Refused dispatches that left no record. Not counted once the seal has latched."""
    if out["latched"]:
        return 0
    return sum(d[2] == "blocked" and d[3] is False for d in out["dispatches"])


def long_runs(out):
    """The labels refused ``LIMIT`` or more times with no admitted dispatch of that label
    between the refusals."""
    streak, found = Counter(), set()
    for label, _, verdict, _ in out["dispatches"]:
        if verdict == "blocked":
            streak[label] += 1
            if streak[label] >= LIMIT:
                found.add(label)
        else:
            streak[label] = 0
    return sorted(found)


def flags(steps, out, fixture):
    return {
        **out,
        "gained": gained(steps, out, fixture),
        "unrecorded": unrecorded(out),
        "long_runs": long_runs(out),
    }


def same(row):
    """The full gate gives the same verdicts, effects and latch as the bound gate."""
    a, b = row["bound"], row["full"]
    return (
        [d[:3] for d in a["dispatches"]] == [d[:3] for d in b["dispatches"]]
        and a["effects"] == b["effects"]
        and bool(a["latched"]) == bool(b["latched"])
    )


def measure(files, gate, fixture):
    """One row per attempt that is run, in source order then position. A recorded attempt
    runs on both gates; a seat's runs on the full gate."""
    got = received(files)
    jobs = []
    for source in SOURCES:
        names = GATES if source in RECORDED else ("full",)
        isolate = source in SEATS or source.startswith("19z-")
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

    def marks(x, name):
        return sorted(x[name]["marks"]["retry_limit"])

    return {
        "fixture": fixture,
        "sources": {
            s: {
                "received": got[s]["received"],
                "rejected": len(got[s]["rejected"]),
                "run": sum(x["source"] == s for x in rows),
                "full_gained": sum(
                    x["full"]["gained"] for x in rows if x["source"] == s
                ),
            }
            for s in SOURCES
        },
        "totals": {
            "run": len(rows),
            "recorded": len(recorded),
            "fresh": len(fresh),
            "bound_unrecorded": sum(x["bound"]["unrecorded"] for x in recorded),
            "bound_retry_marks": sum(len(marks(x, "bound")) for x in recorded),
            "full_unrecorded": sum(x["full"]["unrecorded"] for x in rows),
            "full_refused_marks": sum(x["full"]["marks"]["refused"] for x in rows),
            "full_long_runs": sum(bool(x["full"]["long_runs"]) for x in rows),
            "full_retry_marks_match": sum(
                marks(x, "full") == x["full"]["long_runs"] for x in rows
            ),
            "recorded_same_on_full": sum(same(x) for x in recorded),
            "full_gained": sum(x["full"]["gained"] for x in rows),
            "fresh_without_store_writes": len(quiet_fresh),
            "fresh_without_store_writes_latched": sum(
                bool(x["full"]["latched"]) for x in quiet_fresh
            ),
            "fresh_without_store_writes_raised": sum(
                x["full"]["raised"] is not None for x in quiet_fresh
            ),
        },
    }


def hypotheses(summary):
    """F0 to F5 of P19-FULL01, decided by rule from the summary."""
    t = summary["totals"]
    return {
        "F0": {
            "bound_unrecorded": t["bound_unrecorded"],
            "bound_retry_marks": t["bound_retry_marks"],
            "holds": t["bound_unrecorded"] > 0 and t["bound_retry_marks"] == 0,
        },
        "F1": {
            "run": t["run"],
            "full_unrecorded": t["full_unrecorded"],
            "holds": t["run"] > 0 and t["full_unrecorded"] == 0,
        },
        "F2": {
            "with_a_long_run": t["full_long_runs"],
            "marks_match": t["full_retry_marks_match"],
            "holds": t["full_long_runs"] > 0
            and t["full_retry_marks_match"] == t["run"],
        },
        "F3": {
            "recorded": t["recorded"],
            "same": t["recorded_same_on_full"],
            "holds": t["recorded"] > 0 and t["recorded_same_on_full"] == t["recorded"],
        },
        "F4": {
            "run": t["run"],
            "full_gained": t["full_gained"],
            "holds": t["run"] > 0 and t["full_gained"] == 0,
        },
        "F5": {
            "attempts": t["fresh_without_store_writes"],
            "latched": t["fresh_without_store_writes_latched"],
            "raised": t["fresh_without_store_writes_raised"],
            "holds": t["fresh_without_store_writes"] > 0
            and t["fresh_without_store_writes_latched"] == 0
            and t["fresh_without_store_writes_raised"] == 0,
        },
    }


# the gate ------------------------------------------------------------------------------------
def _count(path):
    db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        return db.execute("SELECT count(*) FROM events").fetchone()[0]
    finally:
        db.close()


def _pipelines():
    import bind19ad
    import seal19z

    class Session(seal19z._Session):
        """Lane 19z's session, accounting for what it refuses."""

        def dispatch(self, action, approval=None):
            pipe = self.pipeline
            if not pipe.intact():
                return {"status": "blocked"}
            try:
                before = pipe.records()
                if approval is None:
                    result = self._inner.dispatch(action)
                else:
                    result = self._inner.dispatch(action, approval=approval)
                known = self._inner.context.gate.actions
                name = action.get("id") if type(action) is dict else None
                label = name if type(name) is str and name in known else "other"
                pipe.account(label, result.get("status") == "blocked", before)
                return result
            finally:
                pipe.reseal()

    class Full(bind19ad.pipeline()):
        """The gate with every repair of lanes 19y, 19z and 19ad, and a record for every
        refusal."""

        def __init__(self, path, **kwargs):
            super().__init__(path, **kwargs)
            self._streak = Counter()

        def resume(self, actor, checkpoint=None, summary=None):
            session = super().resume(actor, checkpoint, summary)
            if isinstance(session, seal19z._Session):
                return Session(self, session._inner)
            return session

        def records(self):
            try:
                context = _count(Path(self.directory) / "context.sqlite")
                return context + _count(self.path)
            except (sqlite3.Error, OSError):
                return None

        def account(self, label, refused, before):
            if not refused:
                self._streak[label] = 0
                return
            self._streak[label] += 1
            try:
                with self.locked():
                    if before is None or self.records() == before:
                        self.record("refused:" + label)
                    if self._streak[label] == LIMIT:
                        self.record("retry_limit:" + label)
            except (sqlite3.Error, OSError):
                pass

    return {"bound": bind19ad.pipeline(), "full": Full}


def pipeline():
    """The class a caller should use: every repair, and a record for every refusal."""
    return _pipelines()["full"]


# running one attempt on a real fixture -------------------------------------------------------
class _Log:
    """What the two logs gained since the last look."""

    def __init__(self, rig):
        self.context = Path(rig.pipe.directory) / "context.sqlite"
        self.pipeline = Path(rig.pipe.path)
        self.seen = [0, 0]
        self.new()

    def new(self):
        """True when a record other than a session's ``resume`` was written, None when the
        logs cannot be read."""
        try:
            found = False
            for k, (path, column) in enumerate(
                ((self.context, "payload"), (self.pipeline, "kind"))
            ):
                db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
                try:
                    rows = db.execute(
                        f"SELECT seq, {column} FROM events WHERE seq > ? ORDER BY seq",
                        (self.seen[k],),
                    ).fetchall()
                finally:
                    db.close()
                for seq, value in rows:
                    self.seen[k] = seq
                    kind = json.loads(value).get("kind") if k == 0 else value
                    found = found or kind != "resume"
            return found
        except (sqlite3.Error, OSError, ValueError, AttributeError):
            return None


def _attempt(directory, name, steps):
    import gate19
    import seal19z

    rig = seal19z.Rig(Path(directory), gate_cls=_pipelines()[name])
    tokens, minted_for, done, raised, relayed = {}, {}, [], None, None
    log = _Log(rig)

    def note(label, kind, call):
        log.new()
        verdict = call()
        done.append([label, kind, verdict, log.new()])

    try:
        try:
            for step in steps:
                do = step["do"]
                if do == "write":
                    rig.write(step["channel"], step["text"])
                    if step["channel"] == TRB:
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
                    rig.write(TRB, text)
                    relayed = minted_for.get(step.get("token"))
                elif do == "ops":
                    tamper19z.apply(rig, step["ops"])
                elif do == "body":
                    approval = tokens.get(step["token"])
                    if step["text"] is not None:
                        approval = gate19.approval_from_tool_result(step["text"])
                    name_ = step["body"].get("id")
                    label = name_ if name_ in ("a", "b") else "other"
                    body = step["body"]
                    note(
                        label,
                        "body",
                        lambda b=body, t=approval: rig.dispatch_action(b, approval=t),
                    )
                elif do == "dispatch":
                    for _ in range(step["times"]):
                        kind = "adapter" if step["adapter"] else "plain"
                        if step["adapter"] == TRB and relayed:
                            kind = "relayed:" + relayed
                        route, adapter = step["route"], step["adapter"]
                        note(route, kind, lambda r=route, a=adapter: rig.dispatch(r, a))
                else:
                    for _ in range(step["times"]):
                        route, token = step["route"], tokens[step["token"]]
                        kind = "token:" + minted_for[step["token"]]
                        note(
                            route,
                            kind,
                            lambda r=route, t=token: rig.dispatch(r, approval=t),
                        )
        except BaseException as error:  # the attempt's outcome, whatever it was
            raised = type(error).__name__
        marks = {"refused": 0, "retry_limit": []}
        if not rig.latched():
            try:
                for kind in gate19.pipeline_events(rig.pipe):
                    if kind.startswith("refused:"):
                        marks["refused"] += 1
                    elif kind.startswith("retry_limit:"):
                        marks["retry_limit"].append(kind.split(":", 1)[1])
            except sqlite3.Error:
                pass
        return {
            "dispatches": done,
            "marks": marks,
            "latched": [n.rsplit("/", 1)[-1] for n in rig.latched()],
            "raised": raised,
        }
    finally:
        rig.close()


def _worker():
    out = []
    for job in json.loads(sys.stdin.read())["jobs"]:
        out.append(_attempt(job["directory"], job["gate"], job["steps"]))
    sys.stdout.write(MARK + json.dumps(out, sort_keys=True) + "\n")


class Gate:
    """Both gates on real fixtures. A list of attempts runs in one process; a caller that
    wants one attempt alone in its process passes a list of one. Needs the hash-locked set."""

    def __init__(self):
        import seal19z  # noqa: F401  fail here on a host without the locked set

        self._base = Path(tempfile.mkdtemp(prefix="p19ae-"))

    def fixture(self):
        """The digest of the payload each registered action leaves at the receiver."""
        a = self.run("full", [[_dispatch("a")]])[0]
        b = self.run(
            "full",
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
                [sys.executable, "-B", "-c", "import full19ae; full19ae._worker()"],
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

    def close(self):
        shutil.rmtree(self._base, ignore_errors=True)
