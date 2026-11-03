"""Differential test: the Lean model's `admit` against the running successor gate.

Enumerates host states the rig can set (registered set, terminal latch, lapsed lease, blocking
fact, consumed budget) and two proposals, evaluates the Lean model with `lean --run`-style `#eval`
on a scratch copy, and compares with the gate's verdict. Skipped, not passed, when `lean` is absent.
"""

import itertools
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import rig as rigmod  # noqa: E402

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


def lean_table():
    source = LEAN_FILE.read_text()
    cases = list(enumeration())
    lines = ["open Simurgh.Phase19 in"]
    lines.append("#eval do")
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


@unittest.skipUnless(shutil.which("lean"), "lean toolchain not on PATH")
class LeanDifferentialTests(unittest.TestCase):
    def test_model_matches_gate_on_every_enumerated_state(self):
        table = lean_table()
        self.assertGreaterEqual(len(table), 40)
        tmp = tempfile.TemporaryDirectory(prefix="p19-diff-")
        self.addCleanup(tmp.cleanup)
        mismatches = []
        for i, case in enumerate(table):
            got = gate_verdict(Path(tmp.name) / str(i), *case)
            if got != table[case]:
                mismatches.append((case, table[case], got))
        self.assertEqual(mismatches, [])


if __name__ == "__main__":
    unittest.main()
