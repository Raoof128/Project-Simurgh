import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
DOCS = ROOT / "docs/research/model-composition-phase-10"


class ProjectionTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("outcomes"), "outcome projection must exist"
        )
        import outcomes

        self.o = outcomes
        self.cap = json.loads((DOCS / "capture.json").read_text())
        self.tasks = json.loads((DOCS / "tasks.json").read_text())
        self.root = (DOCS / "ROOT.sha256").read_text().strip()

    def build(self):
        return self.o.project(self.cap, self.tasks, self.root)

    def test_complete_outcomes_keep_denials_declines_and_initial_unknowns(self):
        view = self.build()
        self.o.validate(view)
        self.assertEqual(len(view["rows"]), 144)
        for control, active, bad in [
            ("credential_only", 22, 16),
            ("composed", 22, 0),
            ("deny_all", 0, 0),
        ]:
            s = view["summary"]["controls"][control]
            self.assertEqual(s["active_completion"], active)
            self.assertEqual(s["new_unauthorized_effect_branches"], bad)
            self.assertEqual(s["prior_effects"], 4)
        rows = [
            r
            for r in view["rows"]
            if r["control"] == "composed" and r["state"] == "credential_revoke"
        ]
        self.assertTrue(
            all(
                r["status"] == "blocked" and r["leaf_status"]["a"] == "denied"
                for r in rows
            )
        )
        self.assertEqual(
            sum(r["initial_status"] == "unknown" for r in view["rows"]), 12
        )

    def test_allowlist_omits_synthetic_secret_canaries(self):
        marker = "PRIVATE-SYNTHETIC-CANARY-NEVER-EXPORT"

        for task in self.tasks:
            task["instruction"] = marker
        self.tasks[0]["source"] = marker
        self.cap["model_header"]["private_annotation"] = marker
        self.cap["generations"][0]["output"]["rendered_prompt"] = marker
        self.cap["rows"][0]["storage"]["private_annotation"] = marker
        self.cap["rows"][0]["new_effects"][0]["action"]["content"] = marker
        view = self.build()
        self.o.validate(view)
        self.assertNotIn(marker, self.o.wire(view).decode())
        self.assertNotIn(self.tasks[0]["id"], self.o.wire(view).decode())
        self.assertIn("raw_state_and_credentials", view["omissions"])
        self.assertFalse(view["capabilities"]["replay_receiver_effects"])

    def test_missing_extra_outcome_and_summary_tampering_rejected(self):
        view = self.build()
        for change in (
            "missing",
            "extra",
            "status",
            "summary",
            "secret_field",
            "source",
            "row_order",
        ):
            bad = copy.deepcopy(view)
            if change == "missing":
                bad["rows"].pop()
            if change == "extra":
                bad["rows"].append(bad["rows"][0])
            if change == "status":
                bad["rows"][0]["status"] = "silently_sanitized"
            if change == "summary":
                bad["summary"]["controls"]["composed"]["active_completion"] = 24
            if change == "secret_field":
                bad["rows"][0]["content"] = "private"
            if change == "source":
                bad["source"]["capture_sha256"] = "invalid"
            if change == "row_order":
                bad["rows"][0], bad["rows"][1] = bad["rows"][1], bad["rows"][0]
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.o.validate(bad)

    def test_jsonl_round_trip_exact_and_missing_line_rejected(self):
        view = self.build()
        metadata, lines = self.o.to_jsonl(view)
        self.assertEqual(self.o.from_jsonl(metadata, lines), view)
        for malformed in (b"\n".join(lines.splitlines()[:-1]) + b"\n", lines + b"{}\n"):
            with self.assertRaises(ValueError):
                self.o.from_jsonl(metadata, malformed)

    def test_unknown_ack_stays_authorized_and_not_completion(self):
        row = self.cap["rows"][0]
        row["status"] = "unknown"
        row["native"]["status"] = "unknown"
        view = self.build()
        self.o.validate(view)
        self.assertEqual(view["rows"][0]["authorized_new_effects"], 1)
        self.assertEqual(view["rows"][0]["unauthorized_new_effects"], 0)
        self.assertFalse(view["rows"][0]["acknowledged_completion"])


if __name__ == "__main__":
    unittest.main()
