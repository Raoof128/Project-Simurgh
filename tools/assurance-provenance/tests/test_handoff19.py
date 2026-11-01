import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import handoff19  # noqa: E402


class HandoffTests(unittest.TestCase):
    def test_handoff_document_is_recomputable(self):
        committed = (handoff19.DOCS / "HANDOFF.md").read_text()
        self.assertEqual(committed, handoff19.render())

    def test_template_is_committed(self):
        committed = json.loads(
            (handoff19.DOCS / "discrepancy-template.json").read_text()
        )
        self.assertEqual(committed, handoff19.discrepancy_template())
        self.assertEqual(set(committed["phases"]), {p["id"] for p in handoff19.PHASES})

    def test_expected_fields_exclude_host_dependent(self):
        for p in handoff19.PHASES:
            fields = handoff19.expected_fields(p["id"])
            for k in handoff19.EXCLUDED:
                self.assertNotIn(k, fields)
            self.assertEqual(
                fields["manifest_sha256"], handoff19.committed_root(p["id"])
            )
            self.assertIs(fields["verified"], True)

    def test_check_committed_receipt_is_empty(self):
        for p in handoff19.PHASES:
            self.assertEqual(
                handoff19.check(p["id"], handoff19.committed_receipt(p["id"])), []
            )

    def test_check_detects_changed_root_and_missing_field(self):
        r = handoff19.committed_receipt("19c")
        r["manifest_sha256"] = "0" * 64
        del r["new_reasons"]
        out = handoff19.check("19c", r)
        kinds = {(d["field"], d["kind"]) for d in out}
        self.assertEqual(
            kinds, {("manifest_sha256", "differs"), ("new_reasons", "missing")}
        )

    def test_status_is_owed(self):
        s = handoff19.status()
        self.assertEqual(s["iou"], "IOU-19-OPERATOR")
        self.assertEqual(s["status"], "owed")
        self.assertEqual(s["operator_receipts"], [])


if __name__ == "__main__":
    unittest.main()
