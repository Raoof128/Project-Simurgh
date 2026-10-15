# SPDX-License-Identifier: AGPL-3.0-or-later
import copy
import unittest

from simurgh_sdk.study import run_study, verify_report


class StudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run_study()

    def test_complete_cross_runtime_projection_and_native_pauses(self):
        self.assertEqual(len(self.report["cases"]), 102)
        for framework in ("openai-agents", "langgraph"):
            rows = [
                row for row in self.report["cases"] if row["framework"] == framework
            ]
            self.assertEqual(len(rows), 51)
            self.assertEqual(sum(row["runtime"]["interruptions"] for row in rows), 78)
            self.assertTrue(all(row["baselineMatches"] for row in rows))
            self.assertEqual(len({(r["id"], r["mode"]) for r in rows}), 51)

    def test_controls_retain_exploitability_utility_and_unknowns(self):
        for framework in self.report["summary"]:
            modes = self.report["summary"][framework]
            self.assertEqual(modes["bypass"]["forbiddenEffects"], 7)
            self.assertEqual(modes["exact-policy"]["forbiddenEffects"], 0)
            self.assertEqual(modes["exact-policy"]["benignCompleted"], 3)
            self.assertEqual(modes["deny-all"]["benignCompleted"], 0)
            self.assertTrue(all(row["unknown"] == 2 for row in modes.values()))

    def test_native_rejection_edit_and_unsupported_are_separate(self):
        rows = {(row["framework"], row["id"]): row for row in self.report["lifecycle"]}
        for framework in ("openai-agents", "langgraph"):
            rejected = rows[(framework, "native-reject")]
            self.assertEqual(rejected["status"], "exercised")
            self.assertEqual(rejected["runtime"]["tool_results"], [])
            self.assertEqual(rejected["observation"]["effects"], [])
        self.assertEqual(
            rows[("openai-agents", "native-edit")]["status"], "unsupported"
        )
        self.assertEqual(
            rows[("langgraph", "native-edit")]["runtime"]["tool_results"],
            [{"status": "denied"}],
        )

    def test_fresh_replay_and_tamper_rejection(self):
        self.assertTrue(verify_report(self.report))
        for mutate in (
            lambda r: r["cases"].pop(),
            lambda r: r["summary"]["openai-agents"]["bypass"].update(
                forbiddenEffects=0
            ),
            lambda r: r.update(productionReady=True),
            lambda r: r["sourceManifest"].update(
                {"tools/assurance-sdk/bridge.mjs": "0" * 64}
            ),
        ):
            changed = copy.deepcopy(self.report)
            mutate(changed)
            with self.assertRaisesRegex(ValueError, "report_mismatch"):
                verify_report(changed)


if __name__ == "__main__":
    unittest.main()
