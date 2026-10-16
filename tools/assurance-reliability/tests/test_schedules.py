import copy
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("reliability"), "schedule harness must exist"
        )
        import reliability

        self.r = reliability
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def run_case(self, case, control):
        row, files = self.r.run_case(
            case, 0, control, self.root / (case + "-" + control)
        )
        self.assertEqual(len(files), 10)
        self.r.validate_row(row)
        return row, files

    def test_reopened_work_and_concurrent_retries_keep_one_effect(self):
        for case in ("authorized_reopen", "parallel_retry"):
            for control in self.r.CONTROLS:
                with self.subTest(case=case, control=control):
                    row, _ = self.run_case(case, control)
                    self.assertEqual(len(row["new_effects"]), 1)
                    self.assertTrue(
                        all(c["native"]["status"] == "observed" for c in row["calls"])
                    )

    def test_siblings_share_budget_without_discarding_winner(self):
        for control, n in [("credential_only", 2), ("composed", 1)]:
            row, _ = self.run_case("parallel_siblings", control)
            self.assertEqual(len(row["new_effects"]), n)
            self.assertEqual(
                sum(c["native"]["status"] == "observed" for c in row["calls"]), 2 * n
            )

    def test_queued_stop_and_real_process_kill_survive_reopen(self):
        for case in ("queued_stop", "update_process_kill"):
            for control, n in [("credential_only", 2), ("composed", 0)]:
                row, _ = self.run_case(case, control)
                self.assertEqual(len(row["new_effects"]), n)
                if case == "update_process_kill":
                    self.assertEqual(row["transition"]["exit_code"], -9)
                    self.assertTrue(row["held"])
                else:
                    self.assertLessEqual(
                        max(c["queued"] for c in row["calls"]),
                        row["transition"]["start"],
                    )
                    self.assertLessEqual(
                        row["transition"]["end"],
                        min(c["started"] for c in row["calls"]),
                    )

    def test_lost_ack_initial_effect_is_retained_and_not_refunded(self):
        for control, n in [("credential_only", 1), ("composed", 0)]:
            row, _ = self.run_case("lost_ack_reopen", control)
            self.assertEqual(row["initial"]["status"], "unknown")
            self.assertEqual(len(row["before_effects"]), 1)
            self.assertEqual(len(row["new_effects"]), n)
            self.assertEqual(
                sum(c["native"]["status"] == "unknown" for c in row["calls"]), 2
            )

    def test_timing_inventory_and_effect_forgery_fail(self):
        row, _ = self.run_case("parallel_siblings", "composed")
        for change in (
            "missing",
            "negative_time",
            "extra_effect",
            "wrong_content",
            "native_failure",
        ):
            bad = copy.deepcopy(row)
            if change == "missing":
                bad["calls"].pop()
            if change == "negative_time":
                bad["calls"][0]["started"] = -1
            if change == "extra_effect":
                bad["new_effects"].append(bad["new_effects"][0])
            if change == "wrong_content":
                bad["new_effects"][0]["action"]["content"] = "altered"
            if change == "native_failure":
                bad["calls"][0]["native"]["worker"]["socket_denied"] = False
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.r.validate_row(bad)


if __name__ == "__main__":
    unittest.main()
