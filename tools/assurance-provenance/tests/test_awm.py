import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import awm  # noqa: E402


class ManifestTests(unittest.TestCase):
    def test_eleven_channels_with_readers(self):
        m = awm.manifest()
        self.assertEqual(m["schema"], "simurgh-phase19-awm-v1")
        self.assertEqual(len(m["channels"]), 11)
        ids = [c["id"] for c in m["channels"]]
        self.assertEqual(len(set(ids)), 11)
        for c in m["channels"]:
            self.assertEqual(
                set(c),
                {"id", "location", "writer", "readers", "wired", "deterministic"},
            )
            self.assertIsInstance(c["readers"], list)

    def test_wired_and_deterministic_counts(self):
        m = awm.manifest()
        wired = [c for c in m["channels"] if c["wired"]]
        self.assertEqual(
            {c["id"] for c in wired}, {"summary_note", "transcript", "memory_file"}
        )
        deterministic = [c for c in m["channels"] if c["deterministic"]]
        self.assertEqual(len(deterministic), 10)
        self.assertFalse(
            next(c for c in m["channels"] if c["id"] == "untrusted_source")[
                "deterministic"
            ]
        )
        self.assertEqual(m["wired_deterministic_channels"], 3)

    def test_hash_is_stable_and_bound_to_content(self):
        self.assertEqual(awm.manifest_hash(), awm.manifest_hash())
        self.assertEqual(len(awm.manifest_hash()), 64)
        m = awm.manifest()
        m["channels"][0]["wired"] = not m["channels"][0]["wired"]
        self.assertNotEqual(awm.manifest_hash(m), awm.manifest_hash())


if __name__ == "__main__":
    unittest.main()
