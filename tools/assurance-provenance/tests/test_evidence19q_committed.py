"""The committed 19q pack: structure on any host; every row again when a copy of the dataset
at the pinned commit and its published key are given.

The dataset is not in this repository (it carries canary strings against inclusion in training
corpora). Set SIMURGH_SLEIGHT_DATASET to a clone at the pinned commit and SIMURGH_SLEIGHT_KEY to
the key its README publishes to run the full recomputation; it needs the ``cryptography``
package.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import dest19q as d  # noqa: E402
import evidence19q as ev  # noqa: E402

DATASET = os.environ.get("SIMURGH_SLEIGHT_DATASET")
KEY = os.environ.get("SIMURGH_SLEIGHT_KEY")


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())

    def test_structure_verifies(self):
        r = ev.verify(ev.DOCS / "evidence.zip", self.root)
        self.assertIs(r["verified"], True)
        self.assertEqual(r["kind"], "structure_checked")
        self.assertEqual(r["recompute"], {"result": "not_run", "reason": "no_dataset"})
        for key in (
            "dataset",
            "dataset_commit",
            "pairs",
            "excluded",
            "primary",
            "hypotheses",
            "manifest_sha256",
        ):
            self.assertEqual(r[key], self.committed[key], key)

    def test_what_the_committed_receipt_says(self):
        c = self.committed
        self.assertEqual(c["kind"], "dataset_recomputed")
        self.assertEqual(c["recompute"], {"result": "verified"})
        self.assertEqual(c["dataset_commit"], d.DATASET_COMMIT)
        self.assertEqual((c["pairs"], c["excluded"]), (43, 1))
        self.assertEqual(
            c["primary"],
            {
                "reading": "strict",
                "rule": "P",
                "attack_flagged": 7,
                "benign_flagged": 6,
                "paired": {
                    "attack_only": 1,
                    "both": 6,
                    "benign_only": 0,
                    "neither": 36,
                },
            },
        )
        # two of the three hypotheses declared before the run did not hold
        self.assertEqual(c["hypotheses"], {"Q1": False, "Q2": True, "Q3": False})
        self.assertIs(c["model_inference"], False)
        self.assertIs(c["independent_custody"], False)
        self.assertRegex(c["tree_state"], r"^[0-9a-f]{40}$")

    def test_the_report_holds_no_text_of_the_dataset(self):
        rows = self.report["rows"]
        self.assertEqual(len(rows), 86)
        for row in rows:
            self.assertEqual(set(row), ev.ROW_KEYS)
            for token in row["tokens"]:
                self.assertEqual(set(token), ev.TOKEN_KEYS)
                self.assertRegex(token["id"], r"^[0-9a-f]{16}$")
        raw = (ev.DOCS / "report.json").read_text()
        for needle in ("://", "canary GUID", "BENCHMARK DATA"):
            self.assertNotIn(needle, raw.replace("github.com/safety-research", ""))

    def test_no_cell_flags_a_benign_session_alone(self):
        cells = self.report["summary"]["cells"]
        for reading in d.READINGS:
            for rule in d.RULES:
                self.assertEqual(cells[reading][rule]["paired"]["benign_only"], 0)

    def test_the_lenient_reading_and_the_origin_counts(self):
        s = self.report["summary"]
        a = s["cells"]["lenient"]["A"]
        self.assertEqual((a["attack_flagged"], a["benign_flagged"]), (12, 6))
        self.assertEqual(a["paired"]["attack_only"], 6)
        self.assertEqual(
            s["used_by_origin"]["strict"]["benign"],
            {"principal": 6, "environment": 2, "agent": 7, "agent_prior": 0},
        )
        self.assertEqual(s["used_by_origin"]["lenient"]["attack"]["agent_prior"], 2)

    def test_the_protocol_binds_forty_four_encrypted_files_and_the_sources(self):
        proto = json.loads(ev.PROTOCOL.read_text())
        self.assertEqual(len(proto["inputs"]["blobs"]), 44)
        self.assertEqual(
            proto["inputs"]["excluded"],
            ["refusal_forcing/refusal-poisoning-credential-exfil"],
        )
        self.assertEqual(self.report["inputs"], proto["inputs"])

    @unittest.skipUnless(
        DATASET and KEY, "set SIMURGH_SLEIGHT_DATASET and SIMURGH_SLEIGHT_KEY"
    )
    def test_every_row_recomputes_from_the_dataset(self):
        r = ev.verify(
            ev.DOCS / "evidence.zip", self.root, dataset=DATASET, decrypt=d.fernet(KEY)
        )
        self.assertEqual(r["kind"], "dataset_recomputed")
        self.assertEqual(r["primary"], self.committed["primary"])


if __name__ == "__main__":
    unittest.main()
