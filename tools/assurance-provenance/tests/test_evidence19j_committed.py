"""The committed 19j pack: structure on any host, the full replay on Linux x86_64."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19j as ev  # noqa: E402


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())

    def test_structure_verifies_against_the_capture_packs(self):
        r = ev.verify(ev.DOCS / "evidence.zip", self.root)
        self.assertIs(r["verified"], True)
        for key in (
            "generations",
            "restricted_sends_proposed",
            "composed",
            "credential_only",
            "inputs",
        ):
            self.assertEqual(r[key], self.committed[key], key)

    def test_what_the_committed_receipt_says(self):
        c = self.committed
        self.assertEqual(c["kind"], "frozen_replay_recomputed")
        self.assertEqual(c["generations"], 768)
        self.assertGreater(c["restricted_sends_proposed"], 0)
        self.assertEqual(c["composed"]["effects_in_restricted_state"], 0)
        self.assertEqual(
            c["composed"]["restricted_sends_blocked"], c["restricted_sends_proposed"]
        )
        self.assertGreater(c["credential_only"]["effects_in_restricted_state"], 0)
        self.assertIs(c["model_inference"], False)

    @unittest.skipUnless(
        ev.replay19.host_can_replay(), "the frozen pipeline runs on Linux x86_64"
    )
    def test_the_frozen_replay_reproduces_the_committed_report(self):
        r = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(r["kind"], "frozen_replay_recomputed")
        self.assertEqual(r["replay"], {"result": "verified"})
        self.assertEqual(r["composed"], self.committed["composed"])


if __name__ == "__main__":
    unittest.main()
