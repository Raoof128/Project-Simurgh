"""Phase 19b Lean differential, shared by the test and the evidence verifier (P19-REPAIR03).

Enumerates host states the rig can set, evaluates the Lean model's ``admits`` on a scratch copy of
the proof file, and compares with the running gate. ``differential`` returns the state count and the
mismatches on this host, or ``None`` when ``lean`` is absent; the verifier reports that per host.
"""

import itertools
import shutil
import subprocess
import tempfile
from pathlib import Path

import rig as rigmod

ROOT = rigmod.ROOT
LEAN_FILE = ROOT / "proofs/phase19/AuthorityProvenance.lean"
ACTION_ID = {"a": 1, "b": 2}


def enumeration():
    for registered, proposal, terminal, paused, fact, consumed in itertools.product(
        (("a",), ("a", "b")), ("a", "b"), (0, 1), (0, 1), (0, 1), (0, 1)
    ):
        if consumed and registered == ("a",):
            continue  # budget can only be consumed by the other registered action
        yield registered, proposal, terminal, paused, fact, consumed


def state_count():
    return len(list(enumeration()))


def lean_available():
    return shutil.which("lean") is not None


def lean_table():
    source = LEAN_FILE.read_text()
    cases = list(enumeration())
    lines = ["open Simurgh.Phase19 in", "#eval do"]
    for registered, proposal, terminal, paused, fact, consumed in cases:
        regs = "[" + ", ".join(str(ACTION_ID[r]) for r in registered) + "]"
        state = (
            f"{{ registered := {regs}, held := false, terminal := {str(bool(terminal)).lower()}, "
            f"paused := {str(bool(paused)).lower()}, budget := {0 if consumed else 1}, "
            f"blockingFact := {str(bool(fact)).lower()} : State }}"
        )
        lines.append(
            f"  IO.println (toString (admits ({state}) {ACTION_ID[proposal]}))"
        )
    scratch = tempfile.mkdtemp(prefix="p19-lean-")
    path = Path(scratch) / "Diff.lean"
    path.write_text(source + "\n" + "\n".join(lines) + "\n")
    out = subprocess.run(
        ["lean", str(path)], capture_output=True, text=True, cwd=scratch, timeout=600
    )
    if out.returncode != 0:
        raise RuntimeError(out.stderr + out.stdout)
    values = [
        line.strip()
        for line in out.stdout.splitlines()
        if line.strip() in ("true", "false")
    ]
    if len(values) != len(cases):
        raise RuntimeError("lean_table_short")
    return dict(zip(cases, [v == "true" for v in values]))


def gate_verdict(base, registered, proposal, terminal, paused, fact, consumed):
    r = rigmod.ProvenanceRig(base)
    try:
        # the rig delegated ["a"] to child; the second registered actor holds ["a", "b"]
        if registered == ("a", "b"):
            root = r.pipe.resume("root")
            if not r.pipe.update(lambda: root.context.delegate("child2", ["a", "b"])):
                raise RuntimeError("delegate_failed")
            actor = "child2"
        else:
            actor = "child"
        if consumed:
            other = "b" if proposal == "a" else "a"
            status = r.pipe.resume(actor).dispatch(r.actions[other])["status"]
            if status != "observed":
                raise RuntimeError("consume_failed:" + status)
        if terminal:
            s = r.pipe.signals[proposal]
            s.provider_error(
                "misalignment_policy_violation", response_id=s.config["response_id"]
            )
        if fact:
            r.pipe.update(
                lambda: r.pipe.context.record_fact("failure", "seeded", blocking=True)
            )
        if paused:
            r.now = rigmod.CLOCK + 31
        status = r.pipe.resume(actor).dispatch(r.actions[proposal])["status"]
        return status == "observed"
    finally:
        r.close()


def differential():
    """``None`` without ``lean``; otherwise the state count and every mismatch on this host."""
    if not lean_available():
        return None
    table = lean_table()
    mismatches = []
    with tempfile.TemporaryDirectory(prefix="p19-diff-") as tmp:
        for i, case in enumerate(table):
            got = gate_verdict(Path(tmp) / str(i), *case)
            if got != table[case]:
                mismatches.append(
                    {"state": list(case), "lean": table[case], "gate": got}
                )
    return {"states": len(table), "mismatches": mismatches}
