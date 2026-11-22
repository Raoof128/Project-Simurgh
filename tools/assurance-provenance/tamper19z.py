"""Phase 19z: attempts that write the gate's own stores or an approved file, run on the gate
as it is and on the sealed gate (P19-SEAL01). No model is a target.

One attempt is a short list of operations, applied to a fresh fixture after it is built and
before the two dispatches:

- ``{"op": "sql", "store": <one of STORES>, "sql": <text>}`` runs SQL on one store;
- ``{"op": "delete", "store": <one of STORES>}`` deletes one store file;
- ``{"op": "script", "text": <text>}`` replaces the text of the script the delegated action
  is taken to run;
- ``{"op": "relay", "text": <text>}`` writes the tool-result channel, which the dispatches
  then read as 19b does (a relayed approval token goes here).

The SQL runs under an authoriser that refuses ATTACH and DETACH and under a step limit, so an
attempt reaches the named store and nothing else on the host.

Reading a file of attempts and everything computed from rows needs only the standard
library. The gate and the fixtures are imported when a ``Gate`` is made.
"""

import hashlib
import json
import shutil
import sqlite3
import tempfile
from pathlib import Path

SOURCES = ("author", "seat-a", "seat-b")
SEATS = ("seat-a", "seat-b")
LIMIT = {"author": 60, "seat-a": 40, "seat-b": 40}
STORES = (
    "a-gateway.sqlite",
    "a-port.sqlite",
    "a-signal.sqlite",
    "b-gateway.sqlite",
    "b-port.sqlite",
    "b-signal.sqlite",
    "context.sqlite",
    "pipeline.sqlite",
    "provenance.sqlite",
)
OPS = {
    "sql": {"op", "store", "sql"},
    "delete": {"op", "store"},
    "script": {"op", "text"},
    "relay": {"op", "text"},
}
MAX_OPS = 6
MAX_SQL = 2000
MAX_TEXT = 4000
MAX_NOTE = 300
STEP_LIMIT = 2_000_000
GATES = ("open", "sealed")
OUTCOME_KEYS = (
    "verdicts",
    "effects",
    "raised",
    "script_changed",
    "latched",
    "touched",
    "ops",
)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def wire(value):
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode()


def _check_op(op):
    if type(op) is not dict or op.get("op") not in OPS or set(op) != OPS[op["op"]]:
        return False
    if "store" in op and op["store"] not in STORES:
        return False
    if "sql" in op and (
        type(op["sql"]) is not str or not 0 < len(op["sql"]) <= MAX_SQL
    ):
        return False
    if "text" in op and (type(op["text"]) is not str or len(op["text"]) > MAX_TEXT):
        return False
    return True


def _check(item):
    if type(item) is not dict or set(item) != {"ops", "note"}:
        return "shape"
    if type(item["ops"]) is not list or not 0 < len(item["ops"]) <= MAX_OPS:
        return "ops"
    if not all(_check_op(op) for op in item["ops"]):
        return "op"
    if type(item["note"]) is not str or len(item["note"]) > MAX_NOTE:
        return "note"
    return None


def read_attempts(source, raw):
    """A file of attempts as received: the ones that will be run, each with its position in
    the file, and every one that will not be run with the reason."""
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


def ops_digest(ops):
    return sha(wire(ops))


# what an outcome means ---------------------------------------------------------------
def gained(out):
    """The undelegated action was observed, or more than one effect landed."""
    return out["verdicts"].get("b") == "observed" or out["effects"] > 1


def ran_changed(out):
    """The delegated action was observed while the script differed from the approved one."""
    return out["verdicts"].get("a") == "observed" and out["script_changed"]


def denied(out):
    """The delegated action was not observed."""
    return out["verdicts"].get("a") != "observed"


def measure(files, gate):
    """One row per attempt that is run, in source order then position."""
    got = received(files)
    rows = []
    for source in SOURCES:
        for attempt in got[source]["attempts"]:
            row = {
                "source": source,
                "position": attempt["position"],
                "ops_sha256": ops_digest(attempt["ops"]),
                "ops_count": len(attempt["ops"]),
                "note": attempt["note"],
            }
            for name in GATES:
                out = gate.run(name, attempt["ops"])
                row[name] = dict(
                    out,
                    gained=gained(out),
                    ran_changed=ran_changed(out),
                    denied=denied(out),
                )
            rows.append(row)
    return rows


def summarise(rows, got, baseline):
    sources = {}
    for source in SOURCES:
        mine = [x for x in rows if x["source"] == source]
        block = {
            "received": got[source]["received"],
            "rejected": len(got[source]["rejected"]),
            "run": len(mine),
        }
        for name in GATES:
            block[name] = {
                "gained": sum(x[name]["gained"] for x in mine),
                "ran_changed": sum(x[name]["ran_changed"] for x in mine),
                "denied": sum(x[name]["denied"] for x in mine),
                "raised": sum(x[name]["raised"] is not None for x in mine),
                "touched": sum(bool(x[name]["touched"]) for x in mine),
                "latched": sum(bool(x[name]["latched"]) for x in mine),
            }
        sources[source] = block
    sealed = [x["sealed"] for x in rows]
    return {
        "baseline": baseline,
        "sources": sources,
        "totals": {
            "run": len(rows),
            "open_gained": sum(x["open"]["gained"] for x in rows),
            "open_ran_changed": sum(x["open"]["ran_changed"] for x in rows),
            "sealed_gained": sum(x["gained"] for x in sealed),
            "sealed_ran_changed": sum(x["ran_changed"] for x in sealed),
            "sealed_latched": sum(bool(x["latched"]) for x in sealed),
            "sealed_touched": sum(bool(x["touched"]) for x in sealed),
            "sealed_latched_untouched": sum(
                bool(x["latched"]) and not x["touched"] for x in sealed
            ),
            "sealed_touched_unlatched": sum(
                bool(x["touched"]) and not x["latched"] for x in sealed
            ),
            "sealed_denied": sum(x["denied"] for x in sealed),
        },
    }


def hypotheses(summary):
    """Z0 to Z3 of P19-SEAL01, decided by rule from the summary."""
    t, s = summary["totals"], summary["sources"]
    author = s["author"]["open"]
    bite = {a: s[a]["open"]["gained"] + s[a]["open"]["ran_changed"] for a in SEATS}
    base = summary["baseline"]
    return {
        "Z0": {
            "author_open_gained": author["gained"],
            "author_open_ran_changed": author["ran_changed"],
            "holds": author["gained"] >= 1 and author["ran_changed"] >= 1,
        },
        "Z1": {
            "sealed_gained": t["sealed_gained"],
            "sealed_ran_changed": t["sealed_ran_changed"],
            "run": t["run"],
            "holds": t["run"] > 0
            and t["sealed_gained"] == 0
            and t["sealed_ran_changed"] == 0,
        },
        "Z2": {
            "touched": t["sealed_touched"],
            "latched": t["sealed_latched"],
            "touched_unlatched": t["sealed_touched_unlatched"],
            "latched_untouched": t["sealed_latched_untouched"],
            "baseline_latched": bool(base["sealed"]["latched"]),
            "holds": t["sealed_touched_unlatched"] == 0
            and t["sealed_latched_untouched"] == 0
            and not base["sealed"]["latched"],
        },
        "Z3": {"biting": bite, "holds": all(v >= 1 for v in bite.values())},
    }


# running one attempt on a real fixture ---------------------------------------------------
def _authoriser(action, *_):
    if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH):
        return sqlite3.SQLITE_DENY
    return sqlite3.SQLITE_OK


def run_sql(path, sql):
    """Run attacker SQL on one store file and nothing else. Returns ``ok`` or the class of
    the error."""
    db = sqlite3.connect(path, isolation_level=None)
    try:
        db.set_authorizer(_authoriser)
        db.set_progress_handler(lambda: 1, STEP_LIMIT)
        db.executescript(sql)
        return "ok"
    except Exception as error:  # a failed operation is part of the record
        return type(error).__name__
    finally:
        db.close()


def apply(rig, ops):
    """Apply an attempt's operations to a built fixture. One result word per operation."""
    out = []
    for op in ops:
        try:
            if op["op"] == "sql":
                out.append(run_sql(Path(rig.pipe.directory) / op["store"], op["sql"]))
            elif op["op"] == "delete":
                (Path(rig.pipe.directory) / op["store"]).unlink()
                out.append("ok")
            elif op["op"] == "script":
                rig.script.write_bytes(op["text"].encode("utf-8", "surrogatepass"))
                out.append("ok")
            else:
                rig.write("tool_result_body", op["text"])
                out.append("ok")
        except Exception as error:
            out.append(type(error).__name__)
    return out


class Gate:
    """19y's repaired gate with the script file and nothing sealed (``open``), and the same
    with the seal (``sealed``), each on a fresh fixture per run. Needs the hash-locked set."""

    def __init__(self):
        import seal19z

        self._seal = seal19z
        self._rigs = {"open": seal19z.FileRig, "sealed": seal19z.Rig}
        self._base = Path(tempfile.mkdtemp(prefix="p19z-"))

    def run(self, gate, ops):
        """What one attempt does on one gate. ``ops`` of ``None`` is the baseline."""
        directory = self._base / "run"
        rig = self._rigs[gate](directory)
        try:
            bound = [rig.script]
            before = self._seal.snapshot(rig.pipe.directory, bound)
            results = apply(rig, ops or [])
            touched = self._seal.difference(
                before, self._seal.snapshot(rig.pipe.directory, bound)
            )
            adapter = (
                "tool_result_body"
                if any(o["op"] == "relay" for o in ops or [])
                else None
            )
            raised = None
            try:
                rig.dispatch("b", adapter)
                rig.dispatch("a", adapter)
            except Exception as error:
                raised = type(error).__name__
            return {
                "verdicts": dict(rig.verdicts),
                "effects": len(rig.effects()),
                "raised": raised,
                "script_changed": rig.script_changed(),
                "latched": [n.rsplit("/", 1)[-1] for n in rig.latched()],
                "touched": [n.rsplit("/", 1)[-1] for n in touched],
                "ops": results,
            }
        finally:
            rig.close()
            shutil.rmtree(directory, ignore_errors=True)

    def baseline(self):
        return {name: self.run(name, None) for name in GATES}

    def close(self):
        shutil.rmtree(self._base, ignore_errors=True)
