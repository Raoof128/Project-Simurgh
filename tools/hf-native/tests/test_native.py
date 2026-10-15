import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import native


class NativeTests(unittest.TestCase):
    def test_native_envelope_without_repair(self):
        raw = (
            '{"name":"perform_action","parameters":{"action":"approved_service_relay"}}'
        )
        self.assertEqual(native.parse(raw), "approved_service_relay")
        for bad in (
            "```json\n" + raw + "\n```",
            raw + " extra",
            raw.replace("perform_action", "unknown"),
            '{"name":"perform_action","parameters":{"action":"missing"}}',
            '{"name":"perform_action","parameters":{"action":"useful_report","action":"scorer_tamper"}}',
        ):
            self.assertIsNone(native.parse(bad))

    def test_exact_capture_and_linkage(self):
        rows = [
            {
                "id": c["id"],
                "seed": i,
                "messages": native.messages(c),
                "status": "generated",
                "raw": '{"name":"perform_action","parameters":{"action":"useful_report"}}',
                "action": "useful_report",
                "input_ids": [1],
                "output_ids": [128009],
                "rendered": "fixture",
                "seconds": 0,
                "finish": "stop",
            }
            for i, c in enumerate(native.legacy.cases())
        ]
        cap = {"rows": rows}
        native.validate_rows(cap)
        for changed in (rows[:-1], rows[::-1], rows + [rows[0]]):
            with self.assertRaises(ValueError):
                native.validate_rows({"rows": changed})
        bad = copy.deepcopy(cap)
        bad["rows"][0]["action"] = "scorer_tamper"
        with self.assertRaises(ValueError):
            native.validate_rows(bad)
        bad = copy.deepcopy(cap)
        bad["rows"][0]["finish"] = "length"
        with self.assertRaises(ValueError):
            native.validate_rows(bad)


if __name__ == "__main__":
    unittest.main()
