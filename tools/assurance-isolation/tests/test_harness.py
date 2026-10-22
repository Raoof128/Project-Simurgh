import unittest
from types import SimpleNamespace
from unittest.mock import patch

try:
    from simurgh_isolation.harness import ATTACKS, run_case
except ImportError:
    run_case = None
    ATTACKS = ()


class HarnessTests(unittest.TestCase):
    def test_useful_file_work_survives(self):
        self.assertIsNotNone(run_case, "real-effects harness missing")
        for control in ("baseline", "capability"):
            r = run_case("transform", control)
            self.assertEqual(r["observed"]["output"], "PUBLIC RESULT\n")
            self.assertEqual(r["broker"]["status"], "completed")

    def test_selective_ipv4_and_ipv6_work(self):
        self.assertIsNotNone(run_case)
        for case in ("approved_tcp_ipv4", "approved_tcp_ipv6"):
            for control in ("baseline", "capability"):
                r = run_case(case, control)
                self.assertEqual(r["observed"]["approved"], ["public request\n"])
                self.assertEqual(r["worker"]["outcome"], "delivered")

    def test_attacks_need_baseline_delivery_then_observed_absence(self):
        self.assertTrue(ATTACKS, "attack census empty")
        for case in ATTACKS:
            with self.subTest(case=case):
                baseline = run_case(case, "baseline")
                filtered = run_case(case, "capability")
                self.assertTrue(baseline["effect"])
                self.assertEqual(baseline["worker"]["outcome"], "delivered")
                self.assertFalse(filtered["effect"])
                self.assertEqual(
                    filtered["worker"], {"outcome": "blocked", "errno": 1, "data": None}
                )

    def test_inherited_capabilities_closed_in_both_running_controls(self):
        self.assertIsNotNone(run_case)
        for case in ("inherited_file", "inherited_socket"):
            for control in ("baseline", "capability"):
                r = run_case(case, control)
                self.assertFalse(r["effect"])
                self.assertEqual(r["worker"]["outcome"], "closed")

    def test_approved_channels_can_still_carry_unwanted_content(self):
        self.assertIsNotNone(run_case)
        for case in ("approved_socket_payload", "approved_output_payload"):
            r = run_case(case, "capability")
            self.assertTrue(r["effect"])
            self.assertEqual(r["worker"]["outcome"], "delivered")

    def test_deny_all_loses_useful_work(self):
        self.assertIsNotNone(run_case)
        r = run_case("transform", "deny_all")
        self.assertIsNone(r["worker"])
        self.assertEqual(r["observed"]["output"], "")
        self.assertNotEqual(r["broker"]["status"], "completed")

    def test_malformed_worker_result_is_not_a_blocked_attack(self):
        from simurgh_isolation.kernel import Refusal

        result = SimpleNamespace(
            returncode=0,
            stderr="",
            stdout='{"outcome":"unknown","errno":null,"data":null}',
        )
        with (
            patch("simurgh_isolation.harness.subprocess.run", return_value=result),
            self.assertRaises(Refusal),
        ):
            run_case("file_write", "capability")


if __name__ == "__main__":
    unittest.main()
