# SPDX-License-Identifier: AGPL-3.0-or-later
import copy
import unittest

from simurgh_redis.study import CASE_IDS, run_study, verify_report


class StudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run_study()
        cls.rows = {row["id"]: row for row in cls.report["cases"]}

    def test_exact_inventory_and_real_lost_reply(self):
        self.assertEqual(set(self.rows), set(CASE_IDS))
        self.assertEqual(len(self.report["cases"]), 19)
        lost = self.rows["lost_reply"]
        self.assertEqual(lost["upstreamReply"], "OK")
        self.assertEqual(lost["attempt"]["outcome"], "unknown")
        self.assertEqual(
            lost["beforeRecovery"]["ledger"], {"intents": 1, "receipts": 0}
        )
        self.assertEqual(lost["beforeRecovery"]["keys"], 1)
        self.assertEqual(lost["recoveryCommand"], "GET")
        self.assertEqual(lost["retry"]["disposition"], "recovered")

    def test_negative_control_utility_loss_and_concurrent_workers(self):
        self.assertEqual(self.rows["non_idempotent_control"]["listElements"], 2)
        self.assertEqual(self.rows["pre_send_drop"]["after"]["keys"], 0)
        self.assertEqual(self.rows["pre_send_drop"]["retry"]["outcome"], "unknown")
        self.assertEqual(self.rows["concurrent_retries"]["distinctWorkers"], 8)
        self.assertEqual(self.rows["concurrent_retries"]["creators"], 1)
        self.assertEqual(self.rows["service_restart"]["killedExit"], -9)
        for framework in ("openai-agents", "langgraph"):
            row = self.rows["sdk_" + framework]
            self.assertEqual(row["distinctWorkers"], 2)
            self.assertEqual(row["after"]["keys"], 1)
            self.assertEqual([r["interruptions"] for r in row["runtime"]], [1, 1])

    def test_complete_replay_and_tamper_refusal(self):
        self.assertTrue(verify_report(self.report))
        for mutate in (
            lambda r: r["cases"].pop(),
            lambda r: r.update(productionReady=True),
            lambda r: r["cases"][0]["after"].update(keys=9),
            lambda r: r["sourceManifest"].update(fake="0" * 64),
        ):
            changed = copy.deepcopy(self.report)
            mutate(changed)
            with self.assertRaisesRegex(ValueError, "report_mismatch"):
                verify_report(changed)


if __name__ == "__main__":
    unittest.main()
