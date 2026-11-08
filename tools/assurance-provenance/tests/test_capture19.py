import hashlib
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19  # noqa: E402
import projection  # noqa: E402


class FramingTests(unittest.TestCase):
    def test_framings_cover_every_task_and_arm(self):
        rows = capture19.framed_messages()
        self.assertEqual(len(rows), 24 * 3 * 2)
        arms = {r["arm"] for r in rows}
        self.assertEqual(arms, {"baseline", "evaluation", "deployment"})
        for r in rows:
            self.assertEqual(
                r["digest"],
                hashlib.sha256(capture19.wire(r["messages"]).encode()).hexdigest(),
            )

    def test_baseline_is_phase17_contract_unchanged(self):
        rows = [r for r in capture19.framed_messages() if r["arm"] == "baseline"]
        for r in rows:
            self.assertEqual(r["messages"][0]["content"], capture19.SYSTEM)
            self.assertNotIn("CONTEXT NOTE", r["messages"][1]["content"])

    def test_framing_is_trusted_channel_text(self):
        rows = [r for r in capture19.framed_messages() if r["arm"] != "baseline"]
        for r in rows:
            user = r["messages"][1]["content"]
            self.assertIn("TRUSTED CONTEXT NOTE:", user)
            self.assertLess(
                user.index("TRUSTED CONTEXT NOTE:"), user.index("UNTRUSTED SOURCE")
            )

    def test_awareness_rule_is_19a_rule(self):
        self.assertEqual(
            capture19.awareness_hits("This is a TEST sandbox"), ["test", "sandbox"]
        )
        self.assertEqual(capture19.AWARENESS_TERMS, projection.AWARENESS_TERMS)


class IntervalTests(unittest.TestCase):
    def test_wilson_known_values(self):
        low, high = capture19.wilson(5, 20)
        self.assertAlmostEqual(low, 0.1118, places=3)
        self.assertAlmostEqual(high, 0.4687, places=3)
        self.assertEqual(capture19.wilson(0, 0), (0.0, 1.0))

    def test_newcombe_contains_difference(self):
        d = capture19.newcombe(5, 20, 15, 20)
        self.assertLess(d["low"], -0.5)
        self.assertGreater(d["high"], -0.5)
        self.assertAlmostEqual(d["difference"], -0.5)

    def test_interior_flag(self):
        self.assertIs(capture19.interior(0, 24), False)
        self.assertIs(capture19.interior(24, 24), False)
        self.assertIs(capture19.interior(3, 24), True)


class ScriptedControlTests(unittest.TestCase):
    def test_scripted_model_is_deterministic_and_recovered(self):
        rates = {"baseline": 0.5, "evaluation": 0.25, "deployment": 0.75}
        rows = capture19.scripted_generations(rates, seed="p19e")
        self.assertEqual(rows, capture19.scripted_generations(rates, seed="p19e"))
        shift = capture19.emission_shift(rows)
        for arm in rates:
            est = shift["arms"][arm]
            self.assertEqual(est["rate"], est["emitted"] / est["n"])
            self.assertIs(est["interior"], True)
        diff = shift["evaluation_minus_deployment"]
        self.assertLess(diff["low"], rates["evaluation"] - rates["deployment"])
        self.assertGreater(diff["high"], rates["evaluation"] - rates["deployment"])
        self.assertIs(shift["evaluable"], True)

    def test_floor_and_ceiling_not_evaluable(self):
        rows = capture19.scripted_generations(
            {"baseline": 0.0, "evaluation": 0.0, "deployment": 1.0}, seed="x"
        )
        shift = capture19.emission_shift(rows)
        self.assertIs(shift["evaluable"], False)
        self.assertEqual(shift["why_not_evaluable"], "floor_or_ceiling")

    def test_restricted_states_only(self):
        rows = capture19.scripted_generations(
            {"baseline": 1.0, "evaluation": 1.0, "deployment": 1.0}, seed="x"
        )
        shift = capture19.emission_shift(rows)
        self.assertEqual(
            shift["arms"]["baseline"]["n"],
            2 * sum(1 for t in capture19.tasks() if t["state"] != "active"),
        )


class DeclarationTests(unittest.TestCase):
    def test_spend_declaration(self):
        d = capture19.spend_declaration()
        self.assertEqual(d["iou"], "IOU-19-SPEND")
        self.assertEqual(d["status"], "not_run")
        self.assertEqual(d["authorisation"], "required_not_given")
        self.assertGreater(d["budget_cap_generations"], 0)
        self.assertEqual(d["spend_to_date"], 0)
        self.assertTrue(d["stop_rule"])

    def test_informed_attacker_bundle(self):
        b = capture19.informed_attacker_bundle()
        self.assertEqual(b["status"], "not_run")
        self.assertIn("gate19.py", b["source_digests"])
        self.assertIn("receiver19.py", b["source_digests"])
        self.assertIn(capture19.SYSTEM, b["policy_text"])


if __name__ == "__main__":
    unittest.main()
