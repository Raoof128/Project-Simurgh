import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import model
import study


class EvidenceTests(unittest.TestCase):
    def test_strict_model_parse_and_no_repair(self):
        for raw in (
            "refused",
            '```json\n{"action":"useful_report"}\n```',
            '{"action":"missing"}',
            '{"action":"useful_report","extra":1}',
            '{"action":"useful_report","action":"scorer_tamper"}',
        ):
            self.assertIsNone(model.parse(raw))
        self.assertEqual(model.parse('{"action":"useful_report"}'), "useful_report")

    def test_invalid_model_never_executes(self):
        with patch("model.run_case", side_effect=AssertionError("must not execute")):
            rows = model.controls(None)
        self.assertEqual(len(rows), 5)
        self.assertTrue(all(row["status"] == "invalid" for row in rows))

    def test_capture_raw_linkage_and_exact_inventory(self):
        cases = model.cases()
        rows = [
            {
                "id": c["id"],
                "seed": i,
                "messages": model.messages(c),
                "status": "generated",
                "raw": "refused",
                "action": None,
                "input_ids": [1],
                "output_ids": [2],
                "rendered": "fixture",
                "seconds": 0,
                "finish": "stop",
            }
            for i, c in enumerate(cases)
        ]
        cap = {"schema": "simurgh-hfc-model-capture-v1", "rows": rows}
        model.validate_rows(cap)
        bad = copy.deepcopy(cap)
        bad["rows"][0]["action"] = "scorer_tamper"
        with self.assertRaises(ValueError):
            model.validate_rows(bad)
        for altered in (rows[:-1], rows[::-1], rows + [rows[0]]):
            with self.assertRaises(ValueError):
                model.validate_rows({**cap, "rows": altered})

    def test_journal_and_completion_boundary_linkage(self):
        rows = [
            {
                "id": c["id"],
                "seed": i,
                "messages": model.messages(c),
                "status": "generated",
                "raw": "refused",
                "action": None,
                "input_ids": [1],
                "output_ids": [128009],
                "rendered": "fixture",
                "seconds": 0,
                "finish": "stop",
            }
            for i, c in enumerate(model.cases())
        ]
        authority = {"commit": "a" * 40, "protocol_sha256": "fixture"}
        cap = {
            "schema": "simurgh-hfc-model-capture-v1",
            "rows": rows,
            "provenance": authority,
            "settings": study.specification()["model_settings"],
            "manifest_sha256": study.digest(model.MANIFEST),
        }
        with (
            tempfile.TemporaryDirectory() as temporary,
            patch("model.bind", return_value=authority),
        ):
            path = Path(temporary) / "capture.json"
            journal = path.with_suffix(".jsonl")
            records = [{"header": {k: v for k, v in cap.items() if k != "rows"}}, *rows]
            journal.write_text("".join(json.dumps(r) + "\n" for r in records))
            model.validate_capture(cap, path, "fixture")
            journal.write_text("".join(json.dumps(r) + "\n" for r in records[:-1]))
            with self.assertRaisesRegex(ValueError, "capture_journal"):
                model.validate_capture(cap, path, "fixture")
            changed = copy.deepcopy(cap)
            changed["rows"][0]["output_ids"] = [3]
            with self.assertRaisesRegex(ValueError, "finish_linkage"):
                model.validate_capture(changed, path, "fixture")

    def test_source_hash_tamper_and_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / "protocol.json"
            data = study.specification()
            self.assertTrue(data["sources"])
            data["sources"] = {}
            p.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                study.bind(p, "a" * 40)
            with self.assertRaises(FileExistsError):
                study.save(p, {})

    def test_saved_summary_cannot_override_fresh_effects(self):
        report = {
            "rows": [
                {"case": c, "control": m} for c in study.CASES for m in study.CONTROLS
            ],
            "summary": {"errors": []},
            "provenance": {"commit": "a" * 40},
        }
        with (
            patch("study.bind", return_value=report["provenance"]),
            patch("study.summarize"),
            patch(
                "study.run",
                return_value={
                    "rows": report["rows"],
                    "summary": {"errors": ["failure"]},
                },
            ),
            self.assertRaises(ValueError),
        ):
            study.verify(report, "fixture")


if __name__ == "__main__":
    unittest.main()
