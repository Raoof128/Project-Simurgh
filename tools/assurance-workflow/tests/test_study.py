# SPDX-License-Identifier: AGPL-3.0-or-later
import copy
import unittest

from simurgh_workflow.study import CASE_IDS, run_study, verify_report


class StudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run_study()

    def test_exact_cases_and_restart_evidence(self):
        self.assertEqual([r["id"] for r in self.report["cases"]], list(CASE_IDS))
        self.assertEqual(len(CASE_IDS), 24)
        for row in self.report["cases"]:
            self.assertEqual(row["pause"]["exit"], -9)
            self.assertEqual(row["pause"]["result"]["callbacks"], 0)
            self.assertTrue(row["freshProcesses"])

    def test_known_effect_and_unknown_boundaries(self):
        rows = {r["id"]: r for r in self.report["cases"]}
        for framework in ("openai-agents", "langgraph"):
            row = rows[framework + "/post_effect_crash"]
            self.assertEqual(row["attempts"][0]["exit"], -9)
            self.assertFalse(
                row["attempts"][1]["result"]["toolResult"]["effectCreated"]
            )
            self.assertEqual(row["after"]["keys"], 1)
            self.assertEqual(row["after"]["workflow"]["callbacks"], 2)
            row = rows[framework + "/concurrent_resumes"]
            self.assertEqual(row["after"]["workflow"]["callbacks"], 1)
            self.assertEqual(sum(not r["result"]["cached"] for r in row["attempts"]), 1)
            row = rows[framework + "/completed_effect_loss"]
            self.assertEqual(row["attempts"][-1]["result"]["status"], "unknown")
            self.assertEqual(row["after"]["keys"], 0)

    def test_complete_replay_and_tamper_refusal(self):
        self.assertTrue(verify_report(self.report))
        for mode in ("missing", "changed", "extra", "source"):
            value = copy.deepcopy(self.report)
            if mode == "missing":
                value["cases"].pop()
            elif mode == "changed":
                value["cases"][0]["after"]["keys"] = 999
            elif mode == "extra":
                value["productionReady"] = True
            else:
                value["sourceManifest"][next(iter(value["sourceManifest"]))] = "0" * 64
            with (
                self.subTest(mode=mode),
                self.assertRaisesRegex(ValueError, "report_mismatch"),
            ):
                verify_report(value)


if __name__ == "__main__":
    unittest.main()
