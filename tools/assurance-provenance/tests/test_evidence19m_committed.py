"""The committed 19m pack. Kept apart from ``test_evidence19m.py``, which the 19m protocol pins:
the pinned sources were committed before the capture ran and are unchanged since."""

import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19m as ev  # noqa: E402
import inject19m  # noqa: E402
import projection  # noqa: E402

PER_MODEL = 864
CAPTURED = (
    "qwen3-0.6b-4bit",
    "qwen2.5-1.5b-4bit",
    "llama-3.2-3b-8bit",
    "qwen3-4b-8bit",
    "qwen2.5-7b-4bit",
    "llama-3.1-8b-4bit",
)
# P19-MODELS02: the lines the interrupted process had written, pinned before the resume
INTERRUPTED = "llama-3.2-3b-8bit"
INTERRUPTED_ROWS = 772
INTERRUPTED_SHA256 = "37d0a7ad2b6bd57abb81fb77f8030cbf7e7fbeac350fd083daa632dccd9ac2a5"


def root():
    return (ev.DOCS / "ROOT.sha256").read_text().strip()


def as_rule_ii_would_have_it(models):
    out = copy.deepcopy(models)
    for m in out:
        if m["id"] == INTERRUPTED:
            for key in ("analysis", "extras", "eligibility", "hypotheses"):
                m.pop(key, None)
            m["status"] = "not_captured"
    return out


class CommittedPackTests(unittest.TestCase):
    def test_the_committed_pack_verifies_and_matches_its_receipt(self):
        receipt = ev.verify(ev.DOCS / "evidence.zip", root())
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        for key in (
            "verified",
            "generations",
            "models",
            "replication",
            "predictions",
            "gate_executed",
            "money_spent",
            "manifest_sha256",
        ):
            self.assertEqual(receipt[key], committed[key], key)
        self.assertEqual(receipt["generations"], PER_MODEL * len(CAPTURED) + 24 + 409)

    def test_the_committed_transcripts_are_the_packed_ones(self):
        files = projection.read_pack(ev.DOCS / "evidence.zip", root())
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
        self.assertEqual(
            json.loads((ev.DOCS / "capture.json").read_text()),
            json.loads(files["capture.json"]),
        )

    def test_each_model_ended_as_the_readme_states(self):
        meta = json.loads((ev.DOCS / "capture.json").read_text())["models"]
        for model_id in CAPTURED:
            got = meta[model_id]
            self.assertEqual(got["status"], "captured", model_id)
            self.assertEqual(got["generations"], PER_MODEL, model_id)
            self.assertIs(got["determinism_recheck"]["identical"], True, model_id)
        self.assertEqual(meta["qwen2.5-3b-4bit"]["status"], "stopped_positive_control")
        self.assertEqual(meta["qwen2.5-3b-4bit"]["active_calls"], 0)
        self.assertEqual(meta["qwen3-8b-4bit"]["status"], "not_captured")
        self.assertEqual(meta["qwen3-8b-4bit"]["reason"], "process_exit_-9")
        self.assertEqual(meta["qwen3-8b-4bit"]["partial_rows"], 409)

    def test_the_resumed_transcript_keeps_the_lines_written_before_the_interruption(
        self,
    ):
        raw = (ev.DOCS / "transcripts" / (INTERRUPTED + ".jsonl")).read_bytes()
        lines = raw.splitlines(keepends=True)
        self.assertEqual(len(lines), PER_MODEL)
        self.assertEqual(
            hashlib.sha256(b"".join(lines[:INTERRUPTED_ROWS])).hexdigest(),
            INTERRUPTED_SHA256,
        )

    def test_the_decisions_are_the_ones_the_readme_states(self):
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        self.assertEqual(
            committed["replication"],
            {
                "eligible_models": ["qwen3-4b-8bit", "qwen2.5-7b-4bit"],
                "held_on": {
                    "H1": 2,
                    "H2": 0,
                    "H3": 2,
                    "H4": 0,
                    "H5": 1,
                    "H6": 2,
                    "H7": 2,
                    "H8": 2,
                },
            },
        )
        self.assertEqual(
            committed["predictions"], {"P1": "not_decided", "P2": False, "P3": True}
        )

    def test_the_counts_with_the_interrupted_model_treated_as_not_captured(self):
        report = json.loads((ev.DOCS / "report.json").read_text())
        models = as_rule_ii_would_have_it(report["models"])
        self.assertEqual(inject19m.replication(models), report["replication"])
        predictions = inject19m.predictions(models)
        self.assertEqual(predictions["P1"], report["predictions"]["P1"])
        self.assertEqual(predictions["P2"], report["predictions"]["P2"])
        self.assertIs(predictions["P3"]["decided"], False)
        self.assertEqual(sum(m["status"] == "captured" for m in models), 5)


if __name__ == "__main__":
    unittest.main()
