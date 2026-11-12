import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19p as ev  # noqa: E402
import inject19n as n  # noqa: E402
import projection  # noqa: E402
from test_replay19 import Stub  # noqa: E402
from test_replay19p import AGENT, synthetic_sources  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19p-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19pTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19p-ev-")
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
        k = len(n.MODELS)
        self.assertIs(r["verified"], True)
        self.assertEqual(r["kind"], "frozen_replay_recomputed")
        self.assertIs(r["model_inference"], False)
        self.assertEqual(r["inputs"], {"19n": "e" * 64})
        self.assertEqual(r["generations"], AGENT * k)
        self.assertEqual(r["restricted_sends_proposed"], 164 * k)
        self.assertEqual(r["active_exact_sends_proposed"], 24 * k)
        self.assertEqual(r["composed"]["effects_in_restricted_state"], 0)
        self.assertEqual(r["composed"]["restricted_sends_blocked"], 164 * k)
        self.assertEqual(r["composed"]["exact_active_sends_refused"], 0)
        self.assertEqual(r["blocks"]["retry"]["sends_proposed"], 48 * k)
        self.assertEqual(r["blocks"]["retry"]["landed_composed"], 0)
        self.assertGreater(r["credential_only"]["effects_in_restricted_state"], 0)

    def test_structure_only_on_any_host(self):
        r = self.verify(self.pack, self.root)
        self.assertEqual(r["kind"], "structure_checked")
        self.assertEqual(r["replay"]["result"], "not_run")
        self.assertEqual(r["composed"], self.receipt["composed"])

    def test_rows_must_follow_the_transcripts(self):
        def proposal(files):
            report = json.loads(files["report.json"])
            row = next(r for r in report["rows"] if r["proposal"] == "declined")
            row["proposal"] = "call"
            files["report.json"] = projection.wire(report)

        def effect(files):
            report = json.loads(files["report.json"])
            row = next(r for r in report["rows"] if r["proposal"] == "declined")
            row["branches"]["composed"]["new_effects"] = 1
            files["report.json"] = projection.wire(report)

        def state(files):
            report = json.loads(files["report.json"])
            row = next(r for r in report["rows"] if r["block"] == "retry")
            row["state"] = "active"
            files["report.json"] = projection.wire(report)

        def placement(files):
            report = json.loads(files["report.json"])
            row = next(
                r for r in report["rows"] if r["placement"] == "tool_result_body"
            )
            row["placement"] = "untrusted_source"
            files["report.json"] = projection.wire(report)

        def dropped(files):
            report = json.loads(files["report.json"])
            del report["rows"][-1]
            files["report.json"] = projection.wire(report)

        def added(files):
            report = json.loads(files["report.json"])
            report["rows"].append(report["rows"][-1])
            files["report.json"] = projection.wire(report)

        def other_input(files):
            report = json.loads(files["report.json"])
            report["inputs"] = {"19n": "0" * 64}
            files["report.json"] = projection.wire(report)

        def extra_field(files):
            report = json.loads(files["report.json"])
            report["rows"][0]["note"] = "x"
            files["report.json"] = projection.wire(report)

        def totals(files):
            report = json.loads(files["report.json"])
            report["totals"]["composed"]["exact_active_sends_refused"] = 5
            files["report.json"] = projection.wire(report)

        def by_block(files):
            report = json.loads(files["report.json"])
            first = sorted(report["summary"])[0]
            report["summary"][first]["blocks"]["retry"]["landed_credential_only"] += 1
            files["report.json"] = projection.wire(report)

        self.check(proposal, "row_mismatch")
        self.check(effect, "branch_mismatch")
        self.check(state, "row_mismatch")
        self.check(placement, "row_mismatch")
        self.check(dropped, "report_rows")
        self.check(added, "report_rows")
        self.check(other_input, "input_binding")
        self.check(extra_field, "row_mismatch")
        self.check(totals, "totals_mismatch")
        self.check(by_block, "summary_mismatch")

    def test_a_consistently_edited_dispatch_passes_structure_and_fails_the_replay(self):
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
            report["summary"] = ev.replay19p.summarise(report["rows"])
            report["totals"] = ev.replay19p.totals(report["rows"])
            files["report.json"] = projection.wire(report)
            files["summary.json"] = projection.wire(report["summary"])
            files["totals.json"] = projection.wire(report["totals"])

        dst, root = repack(self.pack, mutate)
        self.assertEqual(self.verify(dst, root)["kind"], "structure_checked")
        with self.assertRaises(ValueError) as caught:
            self.verify(dst, root, replay=True, engine=Stub())
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_a_sidecar_that_is_not_the_reports(self):
        def mutate(files):
            totals = json.loads(files["totals.json"])
            totals["restricted_sends_proposed"] += 1
            files["totals.json"] = projection.wire(totals)

        self.check(mutate, "sidecar_member_mismatch")

    def test_an_edited_transcript_does_not_verify(self):
        other = synthetic_sources()
        first = n.MODELS[0]["id"]
        rows = other["transcripts"][first]
        send = next(i for i, r in enumerate(rows) if r.get("block") == "summary_write")
        rows[send] = {**rows[send], "raw": "Another summary."}
        with self.assertRaises(ValueError):
            ev.verify(self.pack, self.root, protocol=self.proto, sources=other)

    def test_inputs_and_frozen_files_are_bound(self):
        other = synthetic_sources()
        other["root"] = "f" * 64
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, self.root, protocol=self.proto, sources=other)
        self.assertEqual(str(caught.exception), "protocol_inventory")
        p = json.loads(self.proto.read_text())
        for name in ev.replay19.FROZEN:
            self.assertIn(name, p["sources"])
        for name in (
            "replay19.py",
            "replay19l.py",
            "replay19p.py",
            "inject19n.py",
            "evidence19n.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, p["sources"])
        self.assertIn("docs/research/transfer-phase-17/tasks.json", p["sources"])

    @unittest.skipIf(
        ev.replay19.host_can_replay(), "refusal test is for hosts that cannot replay"
    )
    def test_replay_refuses_off_linux_without_a_stand_in(self):
        with self.assertRaises(ValueError) as caught:
            self.verify(self.pack, self.root, replay=True)
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")


if __name__ == "__main__":
    unittest.main()
