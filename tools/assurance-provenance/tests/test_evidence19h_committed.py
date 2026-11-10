"""The committed 19h pack. Kept apart from ``test_evidence19h.py``, which the 19h protocol pins:
the pinned sources were committed before the capture ran and are unchanged since."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19local as local  # noqa: E402
import evidence19h as ev  # noqa: E402
import projection  # noqa: E402


class CommittedPackTests(unittest.TestCase):
    def test_the_committed_pack_verifies_and_matches_its_receipt(self):
        root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        receipt = ev.verify(ev.DOCS / "evidence.zip", root)
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        for key in (
            "verified",
            "generations",
            "models",
            "gate_executed",
            "manifest_sha256",
        ):
            self.assertEqual(receipt[key], committed[key], key)
        self.assertEqual(receipt["generations"], 144 * len(local.MODELS))

    def test_the_committed_transcripts_are_the_packed_ones(self):
        root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        files = projection.read_pack(ev.DOCS / "evidence.zip", root)
        for m in local.MODELS:
            lines = (
                (ev.DOCS / "transcripts" / (m["id"] + ".jsonl"))
                .read_text()
                .splitlines()
            )
            self.assertEqual(
                [json.loads(x) for x in lines],
                json.loads(files["transcript-" + m["id"] + ".json"]),
                m["id"],
            )

    def test_every_recorded_recheck_was_identical(self):
        meta = json.loads((ev.DOCS / "capture.json").read_text())
        for m in local.MODELS:
            got = meta["models"][m["id"]]
            self.assertEqual(got["generations"], 144, m["id"])
            self.assertIs(got["determinism_recheck"]["identical"], True, m["id"])
            self.assertTrue(got["files"], m["id"])


if __name__ == "__main__":
    unittest.main()
