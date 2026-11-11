"""The committed 19l pack: structure on any host, the full replay on request on Linux x86_64.

The full replay dispatches 1,240 recorded calls twice and takes about thirty minutes on a
two-core server, which the hosted suite's time budget does not have room for. It runs when
SIMURGH_REPLAY_19L=1 is set on a host that can replay; the hosted suite checks structure.
"""

import json
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19l as ev  # noqa: E402

GENERATIONS = 2592
RESTRICTED_GENERATIONS = 2520


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())

    def test_structure_verifies_against_the_19k_pack(self):
        r = ev.verify(ev.DOCS / "evidence.zip", self.root)
        self.assertIs(r["verified"], True)
        for key in (
            "generations",
            "restricted_sends_proposed",
            "active_exact_sends_proposed",
            "composed",
            "credential_only",
            "inputs",
            "manifest_sha256",
        ):
            self.assertEqual(r[key], self.committed[key], key)

    def test_the_input_is_the_committed_19k_pack(self):
        k = (ev.ROOT / "docs/research/provenance-phase-19k/ROOT.sha256").read_text()
        self.assertEqual(self.committed["inputs"], {"19k": k.strip()})

    def test_what_the_committed_receipt_says(self):
        c = self.committed
        self.assertEqual(c["kind"], "frozen_replay_recomputed")
        self.assertEqual(c["replay"], {"result": "verified"})
        self.assertEqual(c["generations"], GENERATIONS)
        self.assertGreater(c["restricted_sends_proposed"], 0)
        self.assertEqual(c["composed"]["effects_in_restricted_state"], 0)
        self.assertEqual(
            c["composed"]["restricted_sends_blocked"], c["restricted_sends_proposed"]
        )
        self.assertEqual(c["composed"]["exact_active_sends_refused"], 0)
        self.assertEqual(
            c["composed"]["active_sends_admitted"], c["active_exact_sends_proposed"]
        )
        self.assertGreater(c["credential_only"]["effects_in_restricted_state"], 0)
        self.assertIs(c["model_inference"], False)
        self.assertIs(c["independent_custody"], False)

    def test_the_credential_gateway_stops_only_revoked_credentials_and_altered_content(
        self,
    ):
        rows = [
            r
            for r in self.report["rows"]
            if r["proposal"] == "call" and r["state"] != "active"
        ]
        self.assertEqual(len(rows), self.committed["restricted_sends_proposed"])
        stopped = 0
        for r in rows:
            self.assertEqual(r["branches"]["composed"]["split"], "blocked_by_gate")
            landed = (
                r["branches"]["credential_only"]["split"]
                == "effect_in_restricted_state"
            )
            expected_stop = r["state"] == "credential_revoke" or not r["exact"]
            self.assertEqual(landed, not expected_stop, r["index"])
            stopped += not landed
        self.assertEqual(
            stopped, self.committed["credential_only"]["restricted_sends_blocked"]
        )

    def test_the_report_covers_every_19k_generation(self):
        t = self.report["totals"]
        self.assertEqual(len(self.report["rows"]), GENERATIONS)
        self.assertEqual(t["restricted_generations"], RESTRICTED_GENERATIONS)
        self.assertEqual(
            sorted(self.report["summary"]),
            ["llama-3.2-3b-4bit", "qwen3-1.7b-4bit", "qwen3-4b-4bit"],
        )

    @unittest.skipUnless(
        ev.replay19.host_can_replay() and os.environ.get("SIMURGH_REPLAY_19L") == "1",
        "the full 19l replay runs on Linux x86_64 when SIMURGH_REPLAY_19L=1",
    )
    def test_the_frozen_replay_reproduces_the_committed_report(self):
        r = ev.verify(ev.DOCS / "evidence.zip", self.root, replay=True)
        self.assertEqual(r["kind"], "frozen_replay_recomputed")
        self.assertEqual(r["replay"], {"result": "verified"})
        self.assertEqual(r["composed"], self.committed["composed"])
        self.assertEqual(r["credential_only"], self.committed["credential_only"])


if __name__ == "__main__":
    unittest.main()
