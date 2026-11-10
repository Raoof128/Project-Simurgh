import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19j as ev  # noqa: E402
import projection  # noqa: E402
from test_replay19 import Stub, synthetic_sources  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19j-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19jTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19j-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.sources = synthetic_sources()
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out, sources=cls.sources, engine=Stub())
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"

    def verify(self, pack, root, **kw):
        return ev.verify(pack, root, protocol=self.proto, sources=self.sources, **kw)

    def check(self, mutate, reason, **kw):
        dst, root = repack(self.pack, mutate)
        with self.assertRaises(ValueError) as caught:
            self.verify(dst, root, **kw)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_receipt(self):
        r = self.receipt
        self.assertIs(r["verified"], True)
        self.assertEqual(r["kind"], "frozen_replay_recomputed")
        self.assertEqual(r["replay"], {"result": "verified"})
        self.assertIs(r["model_inference"], False)
        self.assertEqual(r["generations"], 768)
        self.assertEqual(r["inputs"], {"19h": "a" * 64, "19i": "b" * 64})
        self.assertEqual(r["restricted_sends_proposed"], 12 * 3 + 24 * 2)
        self.assertEqual(r["composed"]["effects_in_restricted_state"], 0)
        self.assertEqual(
            r["composed"]["restricted_sends_blocked"], r["restricted_sends_proposed"]
        )
        self.assertGreater(r["credential_only"]["effects_in_restricted_state"], 0)

    def test_structure_only_on_any_host(self):
        r = self.verify(self.pack, self.root)
        self.assertEqual(r["kind"], "structure_checked")
        self.assertEqual(r["replay"]["result"], "not_run")
        self.assertEqual(r["composed"], self.receipt["composed"])

    def test_a_row_that_disagrees_with_the_transcripts(self):
        def mutate(files):
            report = json.loads(files["report.json"])
            row = next(r for r in report["rows"] if r["proposal"] == "declined")
            row["proposal"] = "call"
            files["report.json"] = projection.wire(report)

        self.check(mutate, "row_mismatch")

    def test_an_undispatched_row_cannot_claim_an_effect(self):
        def mutate(files):
            report = json.loads(files["report.json"])
            row = next(r for r in report["rows"] if r["proposal"] == "declined")
            row["branches"]["composed"]["new_effects"] = 1
            files["report.json"] = projection.wire(report)

        self.check(mutate, "branch_mismatch")

    def test_totals_and_summary_follow_the_rows(self):
        def totals(files):
            report = json.loads(files["report.json"])
            report["totals"]["composed"]["restricted_sends_blocked"] = 0
            files["report.json"] = projection.wire(report)

        def summary(files):
            report = json.loads(files["report.json"])
            key = sorted(report["summary"])[0]
            report["summary"][key]["controls"]["composed"][
                "effects_in_restricted_state"
            ] = 9
            files["report.json"] = projection.wire(report)

        self.check(totals, "totals_mismatch")
        self.check(summary, "summary_mismatch")

    def test_a_consistently_edited_dispatch_passes_structure_and_fails_the_replay(self):
        """What only the replay can catch: a dispatched row whose result, split, summary and
        totals were all edited together."""

        def mutate(files):
            report = json.loads(files["report.json"])
            row = next(
                r
                for r in report["rows"]
                if r["state"] != "active" and r["proposal"] == "call"
            )
            row["branches"]["credential_only"].update(
                status="blocked", new_effects=0, split="blocked_by_gate"
            )
            report["summary"] = ev.replay19.summarise(report["rows"])
            report["totals"] = ev.totals(report["rows"])
            files["report.json"] = projection.wire(report)
            files["summary.json"] = projection.wire(report["summary"])
            files["totals.json"] = projection.wire(report["totals"])

        dst, root = repack(self.pack, mutate)
        self.assertEqual(self.verify(dst, root)["kind"], "structure_checked")
        with self.assertRaises(ValueError) as caught:
            self.verify(dst, root, replay=True, engine=Stub())
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_inputs_are_bound(self):
        other = synthetic_sources()
        other["19i"]["root"] = "c" * 64
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, self.root, protocol=self.proto, sources=other)
        self.assertEqual(str(caught.exception), "protocol_inventory")
        with self.assertRaises(ValueError) as caught:
            self.verify(self.pack, "0" * 64)
        self.assertEqual(str(caught.exception), "manifest_root")
        self.check(
            lambda files: files.update({"summary.json": projection.wire({})}),
            "sidecar_member_mismatch",
        )

    def test_protocol_pins_the_frozen_files_it_calls(self):
        p = json.loads(self.proto.read_text())
        for name in ev.replay19.FROZEN:
            self.assertIn(name, p["sources"])
        self.assertIn("tools/assurance-provenance/replay19.py", p["sources"])
        self.assertIs(p["model_inference"], False)

    @unittest.skipIf(
        ev.replay19.host_can_replay(), "refusal test is for hosts that cannot replay"
    )
    def test_replay_refuses_off_linux_without_a_stand_in(self):
        with self.assertRaises(ValueError) as caught:
            self.verify(self.pack, self.root, replay=True)
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")


if __name__ == "__main__":
    unittest.main()
