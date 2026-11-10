"""The committed 19i pack. Kept apart from ``test_evidence19i.py``, which the 19i protocol pins:
the pinned sources were committed before the capture ran and are unchanged since."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19i as ev  # noqa: E402
import inject19  # noqa: E402
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
        self.assertEqual(receipt["generations"], 168 * len(inject19.MODEL_IDS))

    def test_the_committed_transcripts_are_the_packed_ones(self):
        root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        files = projection.read_pack(ev.DOCS / "evidence.zip", root)
        for model_id in inject19.MODEL_IDS:
            lines = (
                (ev.DOCS / "transcripts" / (model_id + ".jsonl"))
                .read_text()
                .splitlines()
            )
            self.assertEqual(
                [json.loads(x) for x in lines],
                json.loads(files["transcript-" + model_id + ".json"]),
                model_id,
            )

    def test_every_recorded_recheck_was_identical(self):
        meta = json.loads((ev.DOCS / "capture.json").read_text())
        for model_id in inject19.MODEL_IDS:
            got = meta["models"][model_id]
            self.assertEqual(got["generations"], 168, model_id)
            self.assertIs(got["determinism_recheck"]["identical"], True, model_id)


if __name__ == "__main__":
    unittest.main()
