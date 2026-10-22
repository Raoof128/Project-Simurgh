import copy
import unittest

from simurgh_scope.broker import Refusal
from simurgh_scope.study import CASES, MODES, check_shape, run, verify


class StudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run()

    def test_complete_replay(self):
        verify(self.report)
        self.assertEqual(len(self.report["rows"]), len(CASES) * len(MODES))

    def test_omission_extra_duplicate_and_source_change_refuse(self):
        for operation in ("omit", "extra", "duplicate", "source"):
            altered = copy.deepcopy(self.report)
            if operation == "omit":
                altered["rows"].pop()
            elif operation == "extra":
                altered["rows"].append(altered["rows"][0])
            elif operation == "duplicate":
                altered["rows"][1] = altered["rows"][0]
            else:
                altered["sources"] = {}
            with self.subTest(operation=operation), self.assertRaises(Refusal):
                check_shape(altered)

    def test_fabricated_observation_refuses_replay(self):
        altered = copy.deepcopy(self.report)
        altered["rows"][0]["observed"] = []
        with self.assertRaises(Refusal):
            verify(altered)

    def test_controls_have_explicit_expected_outcomes(self):
        rows = {(r["case"], r["control"]): r for r in self.report["rows"]}
        scope_mutations = (
            "admin_read",
            "credential_injection",
            "relay_route",
            "run_drift",
            "principal_drift",
            "tenant_drift",
            "cross_run_message",
            "body_drift",
        )
        for case in scope_mutations:
            self.assertEqual(
                rows[case, "scoped"]["results"][0],
                {"status": "refused", "reason": "scope"},
            )
            self.assertEqual(rows[case, "scoped"]["observed"], [])
            self.assertGreater(rows[case, "origin_only"]["outsideExactGrants"], 0)
        for case in ("public_read", "scoped_write"):
            self.assertEqual(rows[case, "scoped"]["results"][0]["status"], "completed")
            self.assertEqual(rows[case, "deny_all"]["observed"], [])
        self.assertEqual(rows["redirect", "scoped"]["outsideExactGrants"], 0)
        self.assertEqual(len(rows["redirect", "scoped"]["observed"]), 1)
        self.assertEqual(rows["redirect", "origin_only"]["outsideExactGrants"], 1)
        # Deliberately retain the known gap: an approved service can relay invisibly.
        self.assertEqual(
            rows["approved_service_relays", "scoped"]["outsideExactGrants"], 1
        )
        self.assertEqual(
            rows["approved_service_relays", "scoped"]["results"][0]["status"],
            "completed",
        )
        self.assertEqual(rows["monitor_unavailable", "scoped"]["observed"], [])
        self.assertEqual(
            rows["budget_exhausted", "scoped"]["results"][1]["reason"], "budget"
        )
        self.assertEqual(
            rows["stop_restart", "scoped"]["results"][1]["reason"], "stopped"
        )
        self.assertEqual(
            rows["missing_public_data", "scoped"]["results"][1]["reason"], "stopped"
        )
        self.assertEqual(
            rows["lost_response", "scoped"]["results"][0]["status"], "unknown"
        )
        self.assertEqual(len(rows["lost_response", "scoped"]["observed"]), 1)
        self.assertTrue(rows["pending_intent_crash", "scoped"]["killed"])
        self.assertEqual(rows["pending_intent_crash", "scoped"]["observed"], [])


if __name__ == "__main__":
    unittest.main()
