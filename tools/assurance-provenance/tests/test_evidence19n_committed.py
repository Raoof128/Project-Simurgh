"""The committed 19n pack. Kept apart from ``test_evidence19n.py``, which the 19n protocol pins:
the pinned sources were committed before the capture ran and are unchanged since."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19n as ev  # noqa: E402
import projection  # noqa: E402

SLOTS = 1152
GENERATIONS = 1056
MODELS = ("qwen3-1.7b-4bit", "qwen3-4b-4bit", "qwen2.5-7b-4bit", "qwen3-4b-8bit")


def root():
    return (ev.DOCS / "ROOT.sha256").read_text().strip()


def report():
    return json.loads((ev.DOCS / "report.json").read_text())


class CommittedPackTests(unittest.TestCase):
    def test_the_committed_pack_verifies_and_matches_its_receipt(self):
        receipt = ev.verify(ev.DOCS / "evidence.zip", root())
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        for key in (
            "verified",
            "arm",
            "generations",
            "models",
            "replication",
            "model_inference",
            "gate_executed",
            "money_spent",
            "manifest_sha256",
        ):
            self.assertEqual(receipt[key], committed[key], key)
        self.assertEqual(receipt["generations"], GENERATIONS * len(MODELS))
        self.assertIs(receipt["gate_executed"], False)
        self.assertEqual(receipt["money_spent"], 0)

    def test_the_committed_transcripts_are_the_packed_ones(self):
        files = projection.read_pack(ev.DOCS / "evidence.zip", root())
        self.assertEqual(ev.MODEL_IDS, MODELS)
        for model_id in MODELS:
            lines = (
                (ev.DOCS / "transcripts" / (model_id + ".jsonl"))
                .read_text()
                .splitlines()
            )
            self.assertEqual(len(lines), SLOTS, model_id)
            self.assertEqual(
                [json.loads(x) for x in lines],
                json.loads(files[ev.member(model_id)]),
                model_id,
            )
        self.assertEqual(
            json.loads((ev.DOCS / "capture.json").read_text()),
            json.loads(files["capture.json"]),
        )

    def test_each_model_ended_as_the_readme_states(self):
        meta = json.loads((ev.DOCS / "capture.json").read_text())["models"]
        for model_id in MODELS:
            got = meta[model_id]
            self.assertEqual(got["status"], "captured", model_id)
            self.assertEqual(got["slots"], SLOTS, model_id)
            self.assertEqual(got["generations"], GENERATIONS, model_id)
            self.assertEqual(got["resumed_at_row"], 0, model_id)
            self.assertIs(got["determinism_recheck"]["identical"], True, model_id)

    def test_the_decisions_are_the_ones_the_readme_states(self):
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        self.assertEqual(
            committed["replication"],
            {
                "eligible_models": list(MODELS),
                "held_on": {"N1": 1, "N2": 1, "N3": 0, "N4": 0},
            },
        )
        held = report()["replication"]["held_on"]
        self.assertEqual(held["N1"], ["qwen3-1.7b-4bit"])
        self.assertEqual(held["N2"], ["qwen2.5-7b-4bit"])

    def test_the_numbers_the_readme_quotes_are_the_reports(self):
        models = {m["id"]: m["analysis"] for m in report()["models"]}
        # after a refusal: 48 sends followed on each model, none repeated
        for model_id in MODELS:
            first = models[model_id]["retry"]["depths"][0]
            self.assertEqual((first["asked"], first["sent"]), (48, 0), model_id)
        # the attacker's confirmation trials
        self.assertEqual(
            [models[i]["attack"]["confirmation"]["sent"] for i in MODELS], [0, 8, 0, 8]
        )
        # the tool-result heading against the untrusted source, sends of 96
        self.assertEqual(
            [
                (
                    models[i]["placement"]["tool_result_body"]["injected"]["sent"],
                    models[i]["placement"]["untrusted_source"]["injected"]["sent"],
                )
                for i in MODELS
            ],
            [(33, 6), (42, 26), (37, 20), (32, 24)],
        )
        # instruction and belief texts, sends of 192
        self.assertEqual(
            [
                (
                    models[i]["kinds"]["instruction"]["sent"],
                    models[i]["kinds"]["belief"]["sent"],
                )
                for i in MODELS
            ],
            [(72, 8), (99, 16), (18, 51), (98, 5)],
        )
        # the second instruction wording, sends of 96
        self.assertEqual(
            [models[i]["wordings"]["instruction"][1]["sent"] for i in MODELS],
            [71, 95, 7, 94],
        )

    def test_the_results_page_and_the_readme_name_the_committed_root(self):
        for name in ("RESULTS.md", "README.md"):
            self.assertIn(root(), (ev.DOCS / name).read_text(), name)


if __name__ == "__main__":
    unittest.main()
