# SPDX-License-Identifier: AGPL-3.0-or-later
import copy
import unittest

from simurgh_durable.study import CASE_IDS, run_study, verify_report


class StudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run_study()
        cls.rows = {row["id"]: row for row in cls.report["cases"]}

    def test_exact_named_inventory_and_nonvacuous_restart_control(self):
        self.assertEqual(set(self.rows), set(CASE_IDS))
        self.assertEqual(len(self.report["cases"]), 26)
        self.assertEqual(self.rows["volatile_restart"]["after"]["effectCount"], 2)
        self.assertEqual(self.rows["durable_restart"]["after"]["effectCount"], 1)
        self.assertEqual(self.rows["concurrent_same"]["creators"], 1)
        self.assertEqual(self.rows["concurrent_distinct"]["creators"], 2)
        self.assertEqual(self.rows["concurrent_same"]["distinctWorkers"], 8)

    def test_crash_windows_and_missing_storage_are_explicit(self):
        for point in (
            "before_publish",
            "after_publish",
            "before_commit",
            "after_commit",
        ):
            row = self.rows["crash_" + point]
            self.assertEqual(row["killedExit"], -9)
            self.assertEqual(
                row["before"]["receiptCount"], int(point == "after_commit")
            )
            self.assertEqual(row["after"]["effectCount"], 1)
            self.assertEqual(row["after"]["receiptCount"], 1)
        for name in (
            "missing_effect",
            "corrupt_effect",
            "missing_database",
            "corrupt_database",
        ):
            self.assertFalse(self.rows[name]["after"]["observation"]["available"])
            self.assertEqual(self.rows[name]["attempt"]["status"], "error")

    def test_both_real_sdk_adapters_retry_across_executor_restart(self):
        for framework in ("openai-agents", "langgraph"):
            row = self.rows["sdk_restart_" + framework]
            self.assertEqual(row["distinctWorkers"], 2)
            self.assertEqual([r["interruptions"] for r in row["runtime"]], [1, 1])
            self.assertEqual([r["resumptions"] for r in row["runtime"]], [1, 1])
            self.assertEqual(
                [r["effectCreated"] for r in row["attempts"]], [True, False]
            )
            self.assertEqual(row["after"]["effectCount"], 1)

    def test_full_replay_rejects_tamper_missing_rows_and_added_claims(self):
        self.assertTrue(verify_report(self.report))
        for mutate in (
            lambda r: r["cases"].pop(),
            lambda r: r["cases"][0]["after"].update(effectCount=99),
            lambda r: r.update(exactlyOnceEverywhere=True),
            lambda r: r["sourceManifest"].update({"fake": "0" * 64}),
        ):
            changed = copy.deepcopy(self.report)
            mutate(changed)
            with self.assertRaisesRegex(ValueError, "report_mismatch"):
                verify_report(changed)


if __name__ == "__main__":
    unittest.main()
