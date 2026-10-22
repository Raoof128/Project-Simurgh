import copy
import importlib.util
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("evidence"), "phase5 evidence module missing"
        )
        import evidence

        self.e = evidence

    def test_pack_validation_recomputes_inventory_effects_and_summary(self):
        with tempfile.TemporaryDirectory() as d:
            rows, drills, files = self.e.execute(Path(d) / "matrix")
            report = {
                "schema": "simurgh-phase5-report-v1",
                "rows": rows,
                "drills": drills,
                "summary": self.e.summarize(rows, drills),
            }
            files["report.json"] = self.e.wire(report)
            self.e.check_files(files)
            self.assertEqual(report["summary"]["recover"]["useful"], 7)
            self.assertEqual(report["summary"]["baseline"]["useful"], 3)
            self.assertEqual(report["summary"]["stop"]["detected"], 4)
            self.assertEqual(report["summary"]["stop"]["false_alarms"], 0)
            for mutation in ("omission", "invention", "summary", "effect", "extra"):
                bad = dict(files)
                changed = copy.deepcopy(report)
                if mutation == "omission":
                    changed["rows"].pop()
                elif mutation == "invention":
                    changed["rows"][0]["result"]["status"] = "invented"
                elif mutation == "summary":
                    changed["summary"]["recover"]["useful"] = 13
                elif mutation == "effect":
                    bad[next(k for k in bad if k.endswith(".sqlite"))] = b"corrupt"
                else:
                    bad["extra.json"] = b"{}"
                bad["report.json"] = self.e.wire(changed)
                with self.assertRaises((ValueError, sqlite3.DatabaseError)):
                    self.e.check_files(bad)
            duplicate = dict(files)
            duplicate["report.json"] = b'{"schema":"forged",' + files["report.json"][1:]
            with self.assertRaises(ValueError):
                self.e.check_files(duplicate)
            altered = copy.deepcopy(report)
            altered["rows"][0]["events"][0]["policy"] = "invented"
            self.assertNotEqual(self.e.projection(report), self.e.projection(altered))

    def test_projection_removes_only_declared_runtime_timing(self):
        row = {
            "status": "unknown",
            "time_ns": 123,
            "ordering_ns": {"send_entered": 1},
            "stop_latency_ns": 5,
            "detection_latency_ns": 7,
            "events": [{"type": "revoked", "time_ns": 4, "seq": 1}],
        }
        self.assertEqual(
            self.e.projection(row),
            {"status": "unknown", "events": [{"type": "revoked", "seq": 1}]},
        )


if __name__ == "__main__":
    unittest.main()
