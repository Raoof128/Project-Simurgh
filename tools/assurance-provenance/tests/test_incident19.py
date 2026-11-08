import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import drill19  # noqa: E402
import incident19  # noqa: E402


class IncidentRecordTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="p19g-inc-")
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.drill = drill19.run_drill(Path(cls.tmp.name) / "d")
        cls.rec = incident19.record_from_drill(cls.drill)

    def test_schema_file_and_record_shape(self):
        schema = json.loads(incident19.SCHEMA_PATH.read_text())
        self.assertEqual(schema["title"], "simurgh-deployer-incident-record-v1")
        for key in schema["required"]:
            self.assertIn(key, self.rec, key)
        self.assertEqual(self.rec["schema"], "simurgh-deployer-incident-record-v1")

    def test_counts_from_dispatch_verdicts(self):
        self.assertIn("dispatch verdicts", self.rec["counts_derived_from"])
        flipped = json.loads(json.dumps(self.drill))
        for s in flipped["steps"]:
            if s["step"] == "stop":
                s["retry_after_latch"] = "observed"
        self.assertEqual(incident19.record_from_drill(flipped)["blocked"], 2)
        self.assertEqual(self.rec["attempted"], 4)
        self.assertEqual(self.rec["blocked"], 3)
        self.assertEqual(self.rec["unknown"], 1)
        self.assertEqual(self.rec["landed_at_receiver"], 1)
        self.assertEqual(self.rec["claimed_prevented"], 0)
        self.assertIs(self.rec["model_telemetry_used"], False)

    def test_verify_and_mutations(self):
        self.assertEqual(incident19.verify_record(self.rec, self.drill), "ok")
        bad = json.loads(json.dumps(self.rec))
        bad["unknown"] = 0
        self.assertEqual(
            incident19.verify_record(bad, self.drill), "count_mismatch:unknown"
        )
        bad = json.loads(json.dumps(self.rec))
        bad["claimed_prevented"] = 1
        self.assertEqual(
            incident19.verify_record(bad, self.drill), "prevention_claimed"
        )

    def test_digest_values_are_reported_not_compared(self):
        # Another sqlite build writes different file bytes for the same rows (the library version
        # sits in every file header), so a fresh drill elsewhere yields different digest values.
        other = json.loads(json.dumps(self.drill))
        for step in other["steps"]:
            if step["step"] == "preserve":
                step["after"] = {
                    k: hashlib.sha256(b"other-build:" + v.encode()).hexdigest()
                    for k, v in step["after"].items()
                }
        self.assertEqual(incident19.verify_record(self.rec, other), "ok")

    def test_digest_inventory_is_checked(self):
        bad = json.loads(json.dumps(self.rec))
        bad["evidence_digests"].pop("service")
        self.assertEqual(incident19.verify_record(bad, self.drill), "digest_inventory")
        bad = json.loads(json.dumps(self.rec))
        bad["evidence_digests"]["service"] = "not-a-digest"
        self.assertEqual(incident19.verify_record(bad, self.drill), "digest_inventory")


if __name__ == "__main__":
    unittest.main()
