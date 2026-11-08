"""Differential test: the Lean model's `admit` against the running successor gate.

Enumerates host states the rig can set (registered set, terminal latch, lapsed lease, blocking
fact, consumed budget) and two proposals, evaluates the Lean model with `lean --run`-style `#eval`
on a scratch copy, and compares with the gate's verdict. Skipped, not passed, when `lean` is absent.
"""

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import leanstates  # noqa: E402


@unittest.skipUnless(leanstates.lean_available(), "lean toolchain not on PATH")
class LeanDifferentialTests(unittest.TestCase):
    def test_model_matches_gate_on_every_enumerated_state(self):
        result = leanstates.differential()
        self.assertEqual(result["states"], leanstates.state_count())
        self.assertGreaterEqual(result["states"], 40)
        self.assertEqual(result["mismatches"], [])


if __name__ == "__main__":
    unittest.main()
