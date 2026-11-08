import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import drill19  # noqa: E402


class DrillTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="p19g-drill-")
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.r = drill19.run_drill(Path(cls.tmp.name) / "d")

    def test_steps_in_order(self):
        names = [s["step"] for s in self.r["steps"]]
        self.assertEqual(
            names,
            [
                "plant",
                "detect",
                "admit_in_flight",
                "stop",
                "revoke",
                "preserve",
                "in_flight_fate",
                "intervals",
            ],
        )

    def test_plant_blocked_and_detected(self):
        by = {s["step"]: s for s in self.r["steps"]}
        self.assertEqual(by["plant"]["verdict"], "blocked")
        self.assertEqual(by["plant"]["effects_after"], 0)
        self.assertEqual(by["detect"]["provenance_record"]["verdict"], "blocked")
        self.assertIn(
            "grant",
            [i["kind"] for i in by["detect"]["provenance_record"]["authority_inputs"]],
        )

    def test_stop_revoke_preserve(self):
        by = {s["step"]: s for s in self.r["steps"]}
        self.assertTrue(by["stop"]["latched"])
        self.assertTrue(by["stop"]["all_routes_blocked"])
        self.assertEqual(by["revoke"]["acknowledged"], True)
        self.assertEqual(by["revoke"]["retry_after_revoke"], "blocked")
        self.assertEqual(set(by["preserve"]["before"]), set(by["preserve"]["after"]))
        self.assertNotEqual(
            by["preserve"]["before"]["a-signal"], by["preserve"]["after"]["a-signal"]
        )

    def test_in_flight_fate_is_unknown_not_prevented(self):
        by = {s["step"]: s for s in self.r["steps"]}
        self.assertEqual(by["in_flight_fate"]["attempt_status"], "unknown")
        self.assertEqual(by["in_flight_fate"]["reported_as"], "unknown")
        self.assertNotEqual(by["in_flight_fate"]["reported_as"], "prevented")

    def test_intervals_are_named_as_scripted_steps(self):
        by = {s["step"]: s for s in self.r["steps"]}
        self.assertGreater(by["intervals"]["plant_to_latch_logical_steps"], 0)
        self.assertGreater(
            by["intervals"]["latch_to_acknowledged_revocation_logical_steps"], 0
        )
        self.assertIn("not a latency", by["intervals"]["measures"])
        self.assertEqual(by["stop"]["retry_after_latch"], "blocked")

    def test_determinism(self):
        again = drill19.run_drill(Path(self.tmp.name) / "e")
        self.assertEqual(drill19.wire(again), drill19.wire(self.r))


if __name__ == "__main__":
    unittest.main()
