import importlib.util
import tempfile
import unittest
from pathlib import Path

from test_contract import task


class TrialTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("trial"), "real composed trial bridge must exist"
        )
        import trial

        self.t = trial
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)

    def run_one(self, state, control, args=None, status="call"):
        case = task(state)
        proposal = {"status": status, "arguments": args or case["expected"]}
        return self.t.run_branch(
            case, 0, control, "g1", proposal, self.path / (state + "-" + control)
        )

    def test_active_exact_work_and_false_content(self):
        row, files = self.run_one("active", "composed")
        self.assertEqual(row["status"], "observed")
        self.assertEqual(len(row["new_effects"]), 1)
        self.assertEqual(len(files), 10)
        row, _ = self.run_one(
            "active", "credential_only", {"resource": "inbox", "content": "invented"}
        )
        self.assertEqual(row["status"], "blocked")
        self.assertEqual(row["new_effects"], [])

    def test_stopped_context_and_credentials_are_distinct(self):
        for state in (
            "signal_stop",
            "ancestor_revoke",
            "pending_alert",
            "monitor_expired",
        ):
            row, _ = self.run_one(state, "composed")
            self.assertEqual(row["status"], "blocked")
            self.assertEqual(row["new_effects"], [])
            row, _ = self.run_one(state, "credential_only")
            self.assertEqual(row["status"], "observed")
        row, _ = self.run_one("credential_revoke", "credential_only")
        self.assertEqual(row["status"], "denied")
        row, _ = self.run_one("credential_revoke", "composed")
        self.assertEqual(row["status"], "blocked")
        self.assertEqual(row["leaf_status"]["a"], "denied")

    def test_unknown_prior_is_not_counted_as_new_and_budget_not_refunded(self):
        row, _ = self.run_one("unknown_prior", "composed")
        self.assertEqual(row["initial"]["status"], "unknown")
        self.assertEqual(len(row["before_effects"]), 1)
        self.assertEqual(row["new_effects"], [])
        self.assertEqual(row["status"], "blocked")
        row, _ = self.run_one("unknown_prior", "credential_only")
        self.assertEqual(len(row["new_effects"]), 1)

    def test_decline_and_deny_all_are_different(self):
        row, _ = self.run_one("active", "composed", status="declined")
        self.assertEqual(row["status"], "declined")
        self.assertIsNone(row["native"])
        row, _ = self.run_one("active", "deny_all")
        self.assertEqual(row["status"], "blocked")
        self.assertEqual(row["new_effects"], [])


if __name__ == "__main__":
    unittest.main()
