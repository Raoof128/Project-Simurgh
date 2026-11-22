"""Phase 19y: lane 19t's attempts run again after the repair, and a second round of attackers
that have the repaired source (P19-REDTEAM02). No model is a target.

Round one is the two submissions of 19t, unchanged. Round two is two new submissions in the
same format. Every attempt is dispatched three ways on a fresh fixture:

- ``before``: 19b's gate on 19b's fixture, exactly as 19t ran it;
- ``repaired``: ``repair19y.Pipeline`` on ``repair19y.Rig``;
- each of 19b's thirteen reader mutants with the repair mixed in, on the repaired fixture.

An attempt is potent when it changes at least one mutant and leaves the repaired gate's
output byte-identical. The gate, the fixtures and the mutants are imported only on a host
that has the hash-locked set (``Gate``). Reading a submission and everything computed from
rows needs nothing but the standard library.
"""

import json
import shutil
import tempfile
from collections import Counter
from pathlib import Path

import redteam19t
from redteam19t import CHANNELS, KEYS, MAX_ATTEMPTS, MAX_NOTE, MAX_TEXT, MUTANTS
from redteam19t import kinds, sha, text_digest, wire

ROUND_ONE = redteam19t.ATTACKERS
ROUND_TWO = ("opus-r2", "fable-r2")
SEATS = {1: ROUND_ONE, 2: ROUND_TWO}
BEFORE = "before"
REPAIRED = "repaired"
OUTCOME_KEYS = ("differs", "kinds", "raised", "verdicts", "effects")

__all__ = [
    "BEFORE",
    "CHANNELS",
    "KEYS",
    "MAX_ATTEMPTS",
    "MAX_NOTE",
    "MAX_TEXT",
    "MUTANTS",
    "REPAIRED",
    "ROUND_ONE",
    "ROUND_TWO",
    "SEATS",
    "Gate",
    "hypotheses",
    "kinds",
    "measure",
    "outcome",
    "read_submission",
    "sha",
    "summarise",
    "text_digest",
    "wire",
]


def read_submission(round_, attacker, raw):
    """A submission file as received, by 19t's rules: the attempts that will be run, each
    with its position in the file, and every attempt that will not be run with the reason."""
    if attacker not in SEATS.get(round_, ()):
        raise ValueError("attacker")
    if round_ == 1:
        return redteam19t.read_submission(attacker, raw)
    out = {"attacker": attacker, "sha256": sha(raw), "received": 0}
    try:
        value = json.loads(raw)
    except (ValueError, RecursionError):
        value = None
    if (
        type(value) is not dict
        or set(value) != {"attacker", "attempts"}
        or value["attacker"] != attacker
        or type(value["attempts"]) is not list
    ):
        return {
            **out,
            "attempts": [],
            "rejected": [{"position": None, "reason": "file"}],
        }
    attempts, rejected = [], []
    for position, item in enumerate(value["attempts"]):
        reason = "over_limit" if len(attempts) >= MAX_ATTEMPTS else None
        reason = redteam19t._check(position, item) or reason
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
    """``files`` maps a round to a mapping from each of its seats to the bytes of its file."""
    if set(files) != set(SEATS) or any(set(files[r]) != set(SEATS[r]) for r in SEATS):
        raise ValueError("submissions")
    return {r: {a: read_submission(r, a, files[r][a]) for a in SEATS[r]} for r in SEATS}


def outcome(out, baseline):
    """What one dispatch did, in the form 19t's rows record the clean gate."""
    differs = kinds(out, baseline)
    return {
        "differs": bool(differs),
        "kinds": differs,
        "raised": out.get("raised"),
        "verdicts": out.get("verdicts", {}),
        "effects": len(out.get("effects", [])),
    }


def measure(files, gate):
    """One row per attempt that is run, round one first. ``gate`` runs one named gate on one
    channel text and returns the oracle's output."""
    got = received(files)
    baseline = {name: gate.run(name, None, None) for name in gate.gates}
    rows = []
    for round_, seats in SEATS.items():
        for attacker in seats:
            for attempt in got[round_][attacker]["attempts"]:
                channel, text = attempt["channel"], attempt["text"]
                before = outcome(gate.run(BEFORE, channel, text), baseline[BEFORE])
                after = outcome(gate.run(REPAIRED, channel, text), baseline[REPAIRED])
                changed = [
                    name
                    for name in gate.gates
                    if name not in (BEFORE, REPAIRED)
                    and wire(gate.run(name, channel, text)) != wire(baseline[name])
                ]
                rows.append(
                    {
                        "round": round_,
                        "attacker": attacker,
                        "position": attempt["position"],
                        "channel": channel,
                        "text_sha256": text_digest(text),
                        "text_chars": len(text),
                        "note": attempt["note"],
                        "before": before,
                        "repaired": after,
                        "mutants_changed": changed,
                        "potent": bool(changed) and not after["differs"],
                    }
                )
    return rows


def summarise(rows, got):
    rounds = {}
    for round_, seats in SEATS.items():
        attackers = {}
        for attacker in seats:
            mine = [
                x for x in rows if x["round"] == round_ and x["attacker"] == attacker
            ]
            sub = got[round_][attacker]
            attackers[attacker] = {
                "received": sub["received"],
                "rejected": len(sub["rejected"]),
                "run": len(mine),
                "before_differs": sum(x["before"]["differs"] for x in mine),
                "repaired_differs": sum(x["repaired"]["differs"] for x in mine),
                "changes_a_mutant": sum(bool(x["mutants_changed"]) for x in mine),
                "potent": sum(x["potent"] for x in mine),
                "by_channel": {
                    channel: {
                        "run": sum(x["channel"] == channel for x in mine),
                        "before_differs": sum(
                            x["channel"] == channel and x["before"]["differs"]
                            for x in mine
                        ),
                        "repaired_differs": sum(
                            x["channel"] == channel and x["repaired"]["differs"]
                            for x in mine
                        ),
                        "potent": sum(
                            x["channel"] == channel and x["potent"] for x in mine
                        ),
                    }
                    for channel in CHANNELS
                },
                "mutants_changed_by_potent": sorted(
                    {m for x in mine if x["potent"] for m in x["mutants_changed"]}
                ),
            }
        mine = [x for x in rows if x["round"] == round_]
        rounds[str(round_)] = {
            "attackers": attackers,
            "totals": {
                "run": len(mine),
                "before_differs": sum(x["before"]["differs"] for x in mine),
                "repaired_differs": sum(x["repaired"]["differs"] for x in mine),
                "potent": sum(x["potent"] for x in mine),
            },
            "before_kinds": dict(
                sorted(Counter(k for x in mine for k in x["before"]["kinds"]).items())
            ),
            "repaired_kinds": dict(
                sorted(Counter(k for x in mine for k in x["repaired"]["kinds"]).items())
            ),
        }
    return {"rounds": rounds}


def hypotheses(summary, rows, record):
    """Y0 to Y3 of P19-REDTEAM02, decided by rule. ``record`` is the rows of 19t's committed
    report; Y0 compares what this run saw on the gate as it was with what 19t recorded."""
    mine = {
        (x["attacker"], x["position"]): x["before"] for x in rows if x["round"] == 1
    }
    theirs = {(x["attacker"], x["position"]): x["clean"] for x in record}
    same = sum(k in mine and wire(mine[k]) == wire(v) for k, v in theirs.items())
    one, two = summary["rounds"]["1"]["totals"], summary["rounds"]["2"]["totals"]
    potent = {a: summary["rounds"]["2"]["attackers"][a]["potent"] for a in ROUND_TWO}
    return {
        "Y0": {
            "recorded": len(theirs),
            "run": len(mine),
            "same": same,
            "holds": bool(theirs) and set(mine) == set(theirs) and same == len(theirs),
        },
        "Y1": {
            "repaired_differs": one["repaired_differs"],
            "run": one["run"],
            "holds": one["run"] > 0 and one["repaired_differs"] == 0,
        },
        "Y2": {
            "repaired_differs": two["repaired_differs"],
            "run": two["run"],
            "holds": two["repaired_differs"] == 0,
        },
        "Y3": {"potent": potent, "holds": all(v >= 1 for v in potent.values())},
    }


class Gate:
    """The gate as it was, the repaired gate and the repaired reader mutants, each on a fresh
    fixture per run. Needs the hash-locked set; nothing is imported until an instance is
    made."""

    def __init__(self):
        import gate19
        import lane
        import mutants
        import repair19y
        import rig

        if lane.WIRED != CHANNELS or rig.NOTE_CAP != MAX_TEXT:
            raise ValueError("interface_drift")
        self._lane = lane
        self._before = gate19.ProvenancePipeline
        self._rig = repair19y.Rig
        self._classes = {REPAIRED: repair19y.Pipeline}
        for cls in mutants.all_mutants(lane.WIRED):
            self._classes[cls.__name__] = repair19y.repaired(cls)
        if len(self._classes) != MUTANTS + 1 or BEFORE in self._classes:
            raise ValueError("mutant_inventory")
        self.gates = (BEFORE, *self._classes)
        self._base = Path(tempfile.mkdtemp(prefix="p19y-"))

    def _dispatch(self, gate, channel, text):
        if gate == BEFORE:
            out, _ = self._lane._run(
                self._base, "run", self._before, channel, text, channel
            )
            return out
        directory = self._base / "run"
        try:
            rig = self._rig(directory, gate_cls=self._classes[gate])
            try:
                if channel is not None:
                    rig.write(channel, text)
                return rig.run_default(adapter=channel)
            finally:
                rig.close()
        finally:
            shutil.rmtree(directory, ignore_errors=True)

    def run(self, gate, channel, text):
        """The oracle's output, or ``{"raised": <exception class>}`` when dispatching an
        attempt raises. A baseline that raises is an error of the fixture and propagates."""
        try:
            return self._dispatch(gate, channel, text)
        except Exception as error:
            if channel is None:
                raise
            return {"raised": type(error).__name__}

    def close(self):
        shutil.rmtree(self._base, ignore_errors=True)
