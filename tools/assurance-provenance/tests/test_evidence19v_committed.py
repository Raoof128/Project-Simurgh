"""The committed 19v pack. Kept apart from ``test_evidence19v.py``, which the 19v protocol pins:
the pinned sources were committed before the capture ran and are unchanged since."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19v as ev  # noqa: E402
import inject19v  # noqa: E402
import projection  # noqa: E402

SLOTS = 1152
MODELS = (
    "qwen3-8b",
    "granite-4.2-8b",
    "qwen3-14b",
    "qwen3-32b",
    "qwen3.8-27b",
    "arete-27b",
    "nemotron-3.5-30b-a3b",
    "qwen3.6-35b-a3b",
)
GENERATIONS = (1045, 1056, 1049, 1054, 1010, 1008, 1056, 1008)
RETRIED = MODELS[3:]


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
            "metered_usd",
            "within_cap",
            "manifest_sha256",
        ):
            self.assertEqual(receipt[key], committed[key], key)
        self.assertEqual(receipt["generations"], sum(GENERATIONS))
        self.assertEqual(receipt["generations"], 8286)
        self.assertIs(receipt["gate_executed"], False)
        self.assertEqual(receipt["metered_usd"], 15.178044)
        self.assertIs(receipt["within_cap"], True)
        self.assertEqual(
            committed["tree_state"], "613d8f440ab7142f41202dd112c63da853f81aeb"
        )

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
        meta = json.loads((ev.DOCS / "capture.json").read_text())
        for model_id, generations in zip(MODELS, GENERATIONS):
            got = meta["models"][model_id]
            self.assertEqual(got["status"], "captured", model_id)
            self.assertEqual(got["slots"], SLOTS, model_id)
            self.assertEqual(got["generations"], generations, model_id)
            self.assertEqual(got["resumed_at_row"], 0, model_id)
            self.assertIs(got["determinism_recheck"]["identical"], True, model_id)
            earlier = [a["reason"] for a in got.get("earlier_attempts", [])]
            want = ["fetch_failed:RuntimeError"] if model_id in RETRIED else []
            self.assertEqual(earlier, want, model_id)
        self.assertEqual(
            meta["rental"],
            {
                "provider": "Runpod",
                "machine": (
                    "NVIDIA A100 80GB PCIe then NVIDIA A100 80GB PCIe, secure cloud, "
                    "one GPU at a time, two rentals of 9116 and 17028 seconds"
                ),
                "usd_per_hour": 2.09,
                "seconds": 26144,
            },
        )
        self.assertEqual(
            meta["runtime"]["kernels"],
            {
                "causal-conv1d": None,
                "flash-linear-attention": "0.6.0",
                "mamba-ssm": None,
            },
        )
        self.assertEqual(
            (meta["runtime"]["torch"], meta["runtime"]["transformers"]),
            ("2.15.0", "5.23.0"),
        )

    def test_the_decisions_are_the_ones_the_readme_states(self):
        committed = json.loads((ev.DOCS / "receipt.json").read_text())
        self.assertEqual(
            committed["replication"],
            {
                "eligible_models": list(MODELS),
                "held_on": {"N1": 1, "N2": 1, "N3": 1, "N4": 1},
            },
        )
        held = report()["replication"]["held_on"]
        self.assertEqual(held["N1"], ["qwen3-14b"])
        for name in ("N2", "N3", "N4"):
            self.assertEqual(held[name], ["qwen3-32b"], name)

    def test_the_numbers_the_readme_quotes_are_the_reports(self):
        rep = report()
        models = {m["id"]: m["analysis"] for m in rep["models"]}
        elig = {m["id"]: m["eligibility"] for m in rep["models"]}

        def injected(i):
            return sum(v["injected"]["sent"] for v in models[i]["placement"].values())

        self.assertEqual([injected(i) for i in MODELS], [37, 52, 41, 46, 2, 0, 90, 0])
        self.assertEqual(sum(injected(i) for i in MODELS[4:6] + MODELS[7:]), 2)
        self.assertEqual(
            [elig[i]["control_sent"] for i in MODELS], [0, 4, 0, 0, 0, 0, 0, 0]
        )
        for i in MODELS:
            self.assertEqual(models[i]["active_control"]["calls"], 24, i)
        self.assertEqual(
            [models[i]["active_control"]["exact"] for i in MODELS],
            [24, 24, 24, 24, 24, 24, 24, 0],
        )
        # the model's own attack text, confirmation sends of 48
        self.assertEqual(
            [models[i]["attack"]["confirmation"]["sent"] for i in MODELS],
            [24, 4, 16, 25, 0, 11, 0, 8],
        )
        # after a refusal: sends followed, and none repeated
        first = [models[i]["retry"]["depths"][0] for i in MODELS]
        self.assertEqual([d["asked"] for d in first], [37, 48, 41, 46, 2, 0, 48, 0])
        self.assertEqual(sum(d["asked"] for d in first), 222)
        self.assertEqual(sum(d["sent"] for d in first), 0)
        # instruction and belief texts, sends of 192
        self.assertEqual(
            [
                (
                    models[i]["kinds"]["instruction"]["sent"],
                    models[i]["kinds"]["belief"]["sent"],
                )
                for i in MODELS
            ],
            [(32, 5), (20, 32), (10, 31), (0, 46), (0, 2), (0, 0), (86, 4), (0, 0)],
        )
        # the strict and the lenient count of calls are equal on every model
        for i in MODELS:
            reader = models[i]["reader"]
            self.assertEqual(reader["strict_calls"], reader["lenient_calls"], i)
        forms = models["nemotron-3.5-30b-a3b"]["reader"]["forms"]
        self.assertEqual((forms["wrapped_with_text"], forms["prose"]), (63, 71))
        self.assertEqual(
            models["granite-4.2-8b"]["reader"]["forms"]["wrapped_with_text"], 3
        )
        # the three Qwen3 sizes
        self.assertEqual(
            [(r["id"], r["injected_sent"], r["injected_n"]) for r in rep["ladder"]],
            [("qwen3-8b", 37, 384), ("qwen3-14b", 41, 384), ("qwen3-32b", 46, 384)],
        )

    def test_the_hypotheses_the_readme_gives_numbers_for(self):
        by_id = {m["id"]: m for m in report()["models"]}

        def numbers(model_id, name):
            n = by_id[model_id]["hypotheses"][name]["numbers"]
            return n["a_sent"], n["a_n"], n["b_sent"], n["b_n"]

        self.assertEqual(numbers("qwen3-14b", "N1"), (37, 288, 4, 96))
        self.assertEqual(numbers("qwen3-32b", "N2"), (46, 192, 0, 192))
        self.assertEqual(numbers("qwen3-32b", "N3"), (10, 72, 0, 36))
        self.assertEqual(numbers("qwen3-32b", "N4"), (25, 48, 8, 96))
        for model_id in ("arete-27b", "qwen3.6-35b-a3b"):
            n4 = by_id[model_id]["hypotheses"]["N4"]
            self.assertIs(n4["supported"], False, model_id)
            self.assertGreater(n4["numbers"]["newcombe_low"], 0, model_id)
            self.assertEqual(n4["numbers"]["cluster_low"], 0, model_id)

    def test_the_wire_of_each_model_is_the_declared_one(self):
        wires = {m["id"]: m["wire"] for m in report()["models"]}
        self.assertEqual(
            [i for i in MODELS if wires[i] == inject19v.WIRE],
            [
                "granite-4.2-8b",
                "qwen3.8-27b",
                "arete-27b",
                "nemotron-3.5-30b-a3b",
                "qwen3.6-35b-a3b",
            ],
        )

    def test_the_results_page_and_the_readme_name_the_committed_root(self):
        for name in ("RESULTS.md", "README.md"):
            self.assertIn(root(), (ev.DOCS / name).read_text(), name)


if __name__ == "__main__":
    unittest.main()
