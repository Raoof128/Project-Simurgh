"""The committed 19k pack. Kept apart from ``test_evidence19k.py``, which the 19k protocol pins:
the pinned sources were committed before the capture ran and are unchanged since."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19k as ev  # noqa: E402
import projection  # noqa: E402

PER_MODEL = 864


class CommittedPackTests(unittest.TestCase):
    def test_the_committed_pack_verifies_and_matches_its_receipt(self):
        root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        receipt = ev.verify(ev.DOCS / "evidence.zip", root)
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        for key in (
            "verified",
            "generations",
            "models",
            "hypotheses",
            "primary_model",
            "gate_executed",
            "manifest_sha256",
        ):
            self.assertEqual(receipt[key], committed[key], key)
        self.assertEqual(receipt["generations"], PER_MODEL * len(ev.MODEL_IDS))

    def test_the_committed_transcripts_are_the_packed_ones(self):
        root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        files = projection.read_pack(ev.DOCS / "evidence.zip", root)
        for model_id in ev.MODEL_IDS:
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
        for model_id in ev.MODEL_IDS:
            got = meta["models"][model_id]
            self.assertEqual(got["generations"], PER_MODEL, model_id)
            self.assertIs(got["determinism_recheck"]["identical"], True, model_id)

    def test_the_five_decisions_are_the_ones_the_readme_states(self):
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        self.assertEqual(
            committed["hypotheses"],
            {"H1": True, "H2": True, "H3": True, "H4": True, "H5": True},
        )


if __name__ == "__main__":
    unittest.main()
