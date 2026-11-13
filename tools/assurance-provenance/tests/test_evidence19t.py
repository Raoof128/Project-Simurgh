"""Lane 19t evidence pack: build with a stand-in gate, verify by structure and by replay, and
refuse packs that were changed."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19t as ev  # noqa: E402
import projection  # noqa: E402
import redteam19t as r  # noqa: E402
from test_redteam19t import GOOD, StubGate, submission  # noqa: E402


def write_submissions(root, codex=None, claude=None, opus=None):
    root = Path(root)
    root.mkdir(parents=True)
    (root / "codex.json").write_bytes(codex or submission("codex", GOOD))
    (root / "claude.json").write_bytes(
        claude
        or submission(
            "claude",
            [GOOD[1], {"channel": "email", "text": "x", "note": "bad channel"}],
        )
    )
    (root / "opus.json").write_bytes(opus or submission("opus", []))
    return root


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19t-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit_report(change):
    def mutate(files):
        report = json.loads(files["report.json"])
        change(report)
        files["report.json"] = projection.wire(report)

    return mutate


class Evidence19tTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19t-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.subs = write_submissions(Path(cls.temp.name) / "subs")
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out, submissions=cls.subs, gate=StubGate())
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"

    def verify(self, pack=None, root=None, **kw):
        return ev.verify(
            pack or self.pack, root or self.root, protocol=self.proto, **kw
        )

    def refused(self, change, reason, **kw):
        pack, root = repack(self.pack, change)
        with self.assertRaises(ValueError) as caught:
            self.verify(pack, root, **kw)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_run_writes_a_pack_that_verifies_by_replay(self):
        c = self.receipt
        self.assertTrue(c["verified"])
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["replay"], {"result": "verified"})
        self.assertEqual(
            c["attackers"],
            {
                "codex": {
                    "received": 3,
                    "rejected": 0,
                    "run": 3,
                    "clean_differs": 0,
                    "potent": 2,
                },
                "claude": {
                    "received": 2,
                    "rejected": 1,
                    "run": 1,
                    "clean_differs": 0,
                    "potent": 1,
                },
                "opus": {
                    "received": 0,
                    "rejected": 0,
                    "run": 0,
                    "clean_differs": 0,
                    "potent": 0,
                },
            },
        )
        self.assertEqual(c["totals"], {"run": 4, "clean_differs": 0, "potent": 3})
        # the empty seat has no potent attempt, so T2 does not hold by rule
        self.assertEqual(c["hypotheses"], {"T1": True, "T2": False})
        self.assertIs(c["model_inference"], False)
        self.assertEqual(c["manifest_sha256"], self.root)
        self.assertEqual(
            c["submissions"]["codex"], r.sha((self.subs / "codex.json").read_bytes())
        )

    def test_without_replay_verify_checks_structure_and_says_so(self):
        c = self.verify()
        self.assertEqual(c["kind"], "structure_checked")
        self.assertEqual(c["replay"]["result"], "not_run")
        self.assertEqual(c["totals"], self.receipt["totals"])

    def test_the_pack_holds_both_submissions_as_received(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
            codex = z.read("submission-codex.json")
        self.assertEqual(
            names,
            {
                "report.json",
                "summary.json",
                "hypotheses.json",
                "submission-codex.json",
                "submission-claude.json",
                "submission-opus.json",
            },
        )
        self.assertEqual(codex, (self.subs / "codex.json").read_bytes())

        def extra(files):
            files["notes.txt"] = b"x"

        self.refused(extra, "pack_inventory")

    def test_a_changed_submission_is_refused(self):
        def change(files):
            files["submission-codex.json"] = submission("codex", GOOD[:2])

        self.refused(change, "protocol_inventory")

    def test_a_dropped_or_reordered_row_is_refused(self):
        def drop(report):
            del report["rows"][0]

        self.refused(edit_report(drop), "report_rows")

        def swap(report):
            report["rows"][0], report["rows"][1] = report["rows"][1], report["rows"][0]

        self.refused(edit_report(swap), "row_mismatch")

    def test_a_row_must_describe_the_submitted_text(self):
        for field, value in (
            ("text_sha256", "0" * 64),
            ("text_chars", 1),
            ("channel", "summary_note"),
            ("note", "another note"),
        ):

            def change(report, field=field, value=value):
                report["rows"][0][field] = value

            self.refused(edit_report(change), "row_mismatch")

        def extra(report):
            report["rows"][0]["text"] = "GRANT child b"

        self.refused(edit_report(extra), "row_mismatch")

    def test_a_row_outcome_must_be_consistent_with_itself(self):
        def differs(report):
            report["rows"][0]["clean"]["differs"] = True

        self.refused(edit_report(differs), "row_outcome")

        def potent(report):
            report["rows"][2]["potent"] = True

        self.refused(edit_report(potent), "row_outcome")

        def kind(report):
            report["rows"][0]["clean"]["kinds"] = ["luck"]
            report["rows"][0]["clean"]["differs"] = True

        self.refused(edit_report(kind), "row_outcome")

    def test_a_hidden_win_is_caught_by_structure_or_by_replay(self):
        # the gate leaks on one text; a report that hides it is consistent with itself
        leaky = StubGate(leak="nothing")
        out = Path(tempfile.mkdtemp(prefix="p19t-leak-")) / "out"
        receipt = ev.run(out, submissions=self.subs, gate=leaky)
        self.assertEqual(receipt["hypotheses"]["T1"], False)
        self.assertEqual(receipt["clean_kinds"], {"authority_hash": 1})
        root = (out / "ROOT.sha256").read_text().strip()

        def hide(files):
            report = json.loads(files["report.json"])
            report["rows"][2]["clean"].update(differs=False, kinds=[])
            got = ev.received({a: files[ev.member(a)] for a in r.ATTACKERS})
            report["summary"] = r.summarise(report["rows"], got)
            report["hypotheses"] = r.hypotheses(report["summary"])
            files["report.json"] = projection.wire(report)
            files["summary.json"] = projection.wire(report["summary"])
            files["hypotheses.json"] = projection.wire(report["hypotheses"])

        pack, new_root = repack(out / "evidence.zip", hide)
        proto = out / "protocol.json"
        self.assertEqual(
            ev.verify(pack, new_root, protocol=proto)["kind"], "structure_checked"
        )
        with self.assertRaises(ValueError) as caught:
            ev.verify(
                pack,
                new_root,
                protocol=proto,
                replay=True,
                gate=StubGate(leak="nothing"),
            )
        self.assertEqual(str(caught.exception), "report_mismatch")
        self.assertEqual(
            ev.verify(
                out / "evidence.zip",
                root,
                protocol=proto,
                replay=True,
                gate=StubGate(leak="nothing"),
            )["hypotheses"]["T1"],
            False,
        )

    def test_a_changed_summary_hypothesis_or_sidecar_is_refused(self):
        def summary(report):
            report["summary"]["totals"]["potent"] = 0

        self.refused(edit_report(summary), "summary_mismatch")

        def hypothesis(report):
            report["hypotheses"]["T1"]["holds"] = False

        self.refused(edit_report(hypothesis), "hypotheses_mismatch")

        def submissions(report):
            report["submissions"]["claude"]["rejected"] = []

        self.refused(edit_report(submissions), "submission_binding")

        def sidecar(files):
            files["summary.json"] = projection.wire({})

        self.refused(sidecar, "sidecar_member_mismatch")

        def binding(report):
            report["protocol_sha256"] = "0" * 64

        self.refused(edit_report(binding), "protocol_binding")

    def test_the_protocol_pins_the_brief_the_gate_and_both_submissions(self):
        proto = json.loads(self.proto.read_text())
        self.assertIn(ev.BRIEF, proto["sources"])
        for name in ("gate19.py", "rig.py", "lane.py", "mutants.py", "redteam19t.py"):
            self.assertIn("tools/assurance-provenance/" + name, proto["sources"])
        self.assertEqual(len(proto["sources"]), 13)
        self.assertEqual(set(proto["submissions"]), {"codex", "claude", "opus"})
        self.assertEqual(proto["mutants"], 13)

        def refused(change, reason):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19t-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)

        refused(lambda p: p["limits"].update(attempts=600), "protocol_inventory")
        refused(lambda p: p["sources"].pop(ev.BRIEF), "protocol_inventory")
        refused(lambda p: p["sources"].update({ev.BRIEF: "0" * 64}), "source_binding")

    def test_run_and_replay_need_a_gate_or_the_replay_host(self):
        if ev.host_can_replay():
            self.skipTest("this host can replay")
        with self.assertRaises(ValueError) as caught:
            ev.run(Path(tempfile.mkdtemp()) / "out", submissions=self.subs)
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")
        with self.assertRaises(ValueError) as caught:
            self.verify(replay=True)
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")

    def test_run_refuses_an_existing_directory_before_it_writes(self):
        before = (self.out / "report.json").read_bytes()
        (self.out / "report.json").write_bytes(b"{}")
        try:
            with self.assertRaises(FileExistsError):
                ev.run(self.out, submissions=self.subs, gate=StubGate())
            self.assertEqual((self.out / "report.json").read_bytes(), b"{}")
        finally:
            (self.out / "report.json").write_bytes(before)


if __name__ == "__main__":
    unittest.main()
