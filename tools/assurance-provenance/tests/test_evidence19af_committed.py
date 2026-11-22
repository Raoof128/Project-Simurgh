"""The committed 19af pack: verify on any host with no model, and the gate's side recomputed
where the hash-locked set is installed."""

import json
import sys
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19af as ev  # noqa: E402
import local19af as m  # noqa: E402

QWEN, LLAMA = m.MODELS


class CommittedPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (ev.DOCS / "ROOT.sha256").read_text().strip()
        cls.committed = json.loads((ev.DOCS / "receipt.json").read_text())
        cls.report = json.loads((ev.DOCS / "report.json").read_text())

    def test_the_pack_verifies_with_no_model(self):
        c = ev.verify(ev.DOCS / "evidence.zip", self.root)
        self.assertTrue(c["verified"])
        self.assertEqual(c["hypotheses"], self.committed["hypotheses"])
        self.assertEqual(c["generations"], 528)
        self.assertEqual((c["manifest_sha256"], c["money_spent"]), (self.root, 0))

    def test_what_the_pages_say_about_arm_r(self):
        r = self.report["arm_r"]
        self.assertEqual(
            (r[QWEN]["plain"], r[LLAMA]["plain"]), ({"n": 24, "sent": 24},) * 2
        )
        self.assertEqual(
            (r[QWEN]["notice"]["sent"], r[LLAMA]["notice"]["sent"]), (28, 46)
        )
        self.assertEqual((r[QWEN]["host"]["sent"], r[LLAMA]["host"]["sent"]), (0, 19))
        self.assertEqual(
            [c["sent"] for c in r[QWEN]["notice_by_wording"]], [0, 0, 4, 24, 0]
        )
        self.assertEqual(
            [c["sent"] for c in r[LLAMA]["notice_by_wording"]], [0, 0, 22, 24, 0]
        )
        self.assertTrue(r[QWEN]["eligible"] and r[LLAMA]["eligible"])

    def test_what_the_pages_say_about_arm_o_and_the_window(self):
        o = self.report["arm_o"]
        caught = {
            i: {v: c["caught"] for v, c in o[i]["caught"].items()} for i in m.MODELS
        }
        self.assertEqual(
            caught[QWEN], {"exact": 0, "added": 24, "omission": 4, "split": 9}
        )
        self.assertEqual(
            caught[LLAMA], {"exact": 0, "added": 2, "omission": 0, "split": 1}
        )
        self.assertEqual((o[QWEN]["threshold"], o[LLAMA]["threshold"]), (5.0, 60.0))
        self.assertEqual(
            o[LLAMA]["read"], {"exact": 23, "added": 22, "omission": 21, "split": 22}
        )
        w = self.report["window"]
        self.assertEqual(w["gate_dispatch_seconds"]["n"], 200)
        self.assertGreater(
            w["monitor_call_seconds"][LLAMA]["min"],
            100 * w["gate_dispatch_seconds"]["max"],
        )

    def test_the_hypotheses_as_published(self):
        self.assertEqual(
            self.committed["hypotheses"],
            {"T1": True, "T2": False, "T3": True, "O1": True, "O2": True, "O3": True},
        )

    def test_the_capture_was_not_resumed_and_the_first_rows_repeat(self):
        for i in m.MODELS:
            for arm in ev.ARMS:
                got = self.report["capture"][i][arm]
                self.assertEqual(got["resumed_from"], 0)
                self.assertIs(got["determinism_recheck"]["identical"], True)

    def test_the_gates_side_in_the_pack_is_what_the_gate_does(self):
        try:
            import full19ae  # noqa: F401
            import seal19z  # noqa: F401
        except ImportError:
            self.skipTest("the hash-locked set is not installed")
        with zipfile.ZipFile(ev.DOCS / "evidence.zip") as z:
            saved = json.loads(z.read("gate.json"))
        again = m.gate_rows(timings=1)
        self.assertEqual(again["restriction"], saved["restriction"])
        self.assertEqual(again["bodies"], saved["bodies"])

    def test_the_results_page_is_generated_from_the_report(self):
        page = (ev.DOCS / "RESULTS.md").read_text()
        self.assertIn(self.root, page)
        self.assertIn("19 of 24", page)


if __name__ == "__main__":
    unittest.main()
