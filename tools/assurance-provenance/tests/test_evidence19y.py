"""Lane 19y evidence pack: build with a stand-in gate, verify by structure and by replay, and
refuse packs that were changed. Round one is read from 19t's committed pack, as in the run of
record."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19y as ev  # noqa: E402
import projection  # noqa: E402
import redteam19y as r  # noqa: E402
from test_redteam19y import NEW, StubGate, submission  # noqa: E402

RECORDED = 92  # the attempts lane 19t ran


def write_submissions(root, opus=None, fable=None):
    root = Path(root)
    root.mkdir(parents=True)
    (root / "opus-r2.json").write_bytes(opus or submission("opus-r2", NEW))
    (root / "fable-r2.json").write_bytes(
        fable
        or submission(
            "fable-r2",
            [NEW[1], {"channel": "email", "text": "x", "note": "bad channel"}],
        )
    )
    return root


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19y-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit_report(change):
    def mutate(files):
        report = json.loads(files["report.json"])
        change(report)
        files["report.json"] = projection.wire(report)

    return mutate


class Evidence19yTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19y-ev-")
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

    def test_round_one_is_19ts_pack(self):
        root, subs, record = ev.round_one()
        self.assertEqual(
            root, "0096b482e9a4ce62230ee7c4466eb57b7a0094b569a5f9d96899963166611a46"
        )
        self.assertEqual(set(subs), set(r.ROUND_ONE))
        self.assertEqual(len(record), RECORDED)
        got = r.received({1: subs, 2: ev.read_submissions(self.subs)})
        self.assertEqual(
            {a: len(v["attempts"]) for a, v in got[1].items()},
            {"codex": 0, "claude": 46, "opus": 46},
        )
        self.assertEqual(sum(x["clean"]["differs"] for x in record), 49)

    def test_run_writes_a_pack_that_verifies_by_replay(self):
        c = self.receipt
        self.assertTrue(c["verified"])
        self.assertEqual(c["kind"], "gate_recomputed")
        self.assertEqual(c["replay"], {"result": "verified"})
        self.assertEqual(c["rounds"]["1"]["totals"]["run"], RECORDED)
        self.assertEqual(c["rounds"]["1"]["totals"]["repaired_differs"], 0)
        self.assertEqual(
            c["rounds"]["2"]["attackers"],
            {
                "opus-r2": {
                    "received": 3,
                    "rejected": 0,
                    "run": 3,
                    "before_differs": 0,
                    "repaired_differs": 0,
                    "potent": 2,
                },
                "fable-r2": {
                    "received": 2,
                    "rejected": 1,
                    "run": 1,
                    "before_differs": 0,
                    "repaired_differs": 0,
                    "potent": 1,
                },
            },
        )
        self.assertEqual(
            c["rounds"]["2"]["totals"],
            {"run": 4, "before_differs": 0, "repaired_differs": 0, "potent": 3},
        )
        # the stand-in gate is not 19b's, so what it sees before the repair is not 19t's record
        self.assertEqual(
            c["hypotheses"], {"Y0": False, "Y1": True, "Y2": True, "Y3": True}
        )
        self.assertIs(c["model_inference"], False)
        self.assertEqual(c["manifest_sha256"], self.root)
        self.assertEqual(
            c["submissions"]["2"]["opus-r2"],
            r.sha((self.subs / "opus-r2.json").read_bytes()),
        )
        self.assertEqual(set(c["submissions"]["1"]), set(r.ROUND_ONE))

    def test_without_replay_verify_checks_structure_and_says_so(self):
        c = self.verify()
        self.assertEqual(c["kind"], "structure_checked")
        self.assertEqual(c["replay"]["result"], "not_run")
        self.assertEqual(c["rounds"], self.receipt["rounds"])

    def test_the_pack_holds_the_round_two_submissions_as_received(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
            opus = z.read("submission-opus-r2.json")
        self.assertEqual(
            names,
            {
                "report.json",
                "summary.json",
                "hypotheses.json",
                "submission-opus-r2.json",
                "submission-fable-r2.json",
            },
        )
        self.assertEqual(opus, (self.subs / "opus-r2.json").read_bytes())

        def extra(files):
            files["notes.txt"] = b"x"

        self.refused(extra, "pack_inventory")

        def missing(files):
            del files["submission-fable-r2.json"]

        self.refused(missing, "pack_inventory")

    def test_a_changed_submission_is_refused(self):
        def change(files):
            files["submission-opus-r2.json"] = submission("opus-r2", NEW[:2])

        self.refused(change, "protocol_inventory")

    def test_a_dropped_or_reordered_row_is_refused(self):
        def drop(report):
            del report["rows"][0]

        self.refused(edit_report(drop), "report_rows")

        def swap(report):
            report["rows"][0], report["rows"][1] = report["rows"][1], report["rows"][0]

        self.refused(edit_report(swap), "row_mismatch")

        def swap_rounds(report):
            report["rows"][0], report["rows"][-1] = (
                report["rows"][-1],
                report["rows"][0],
            )

        self.refused(edit_report(swap_rounds), "row_mismatch")

    def test_a_row_must_describe_the_submitted_text(self):
        for index in (0, RECORDED):
            for field, value in (
                ("text_sha256", "0" * 64),
                ("text_chars", 1),
                ("channel", "config_file"),
                ("note", "another note"),
                ("round", 3),
                ("attacker", "codex"),
            ):

                def change(report, index=index, field=field, value=value):
                    report["rows"][index][field] = value

                self.refused(edit_report(change), "row_mismatch")

        def extra(report):
            report["rows"][0]["text"] = "GRANT child b"

        self.refused(edit_report(extra), "row_mismatch")

    def test_a_row_outcome_must_be_consistent_with_itself(self):
        for side in ("before", "repaired"):

            def differs(report, side=side):
                report["rows"][RECORDED][side]["differs"] = True

            self.refused(edit_report(differs), "row_outcome")

            def kind(report, side=side):
                report["rows"][RECORDED][side].update(differs=True, kinds=["luck"])

            self.refused(edit_report(kind), "row_outcome")

            def raised_without_the_kind(report, side=side):
                report["rows"][RECORDED][side]["raised"] = "ProgrammingError"

            self.refused(edit_report(raised_without_the_kind), "row_outcome")

            def kind_without_the_class(report, side=side):
                report["rows"][RECORDED][side].update(differs=True, kinds=["raised"])

            self.refused(edit_report(kind_without_the_class), "row_outcome")

            def missing(report, side=side):
                del report["rows"][RECORDED][side]["effects"]

            self.refused(edit_report(missing), "row_outcome")

        def potent(report):
            report["rows"][RECORDED + 2]["potent"] = True

        self.refused(edit_report(potent), "row_outcome")

        def potent_although_the_gate_changed(report):
            row = report["rows"][RECORDED]
            row["repaired"].update(differs=True, kinds=["audit"])

        self.refused(edit_report(potent_although_the_gate_changed), "row_outcome")

    def test_a_hidden_win_is_caught_by_structure_or_by_replay(self):
        # the repaired gate leaks on one text; a report that hides it agrees with itself
        out = Path(tempfile.mkdtemp(prefix="p19y-leak-")) / "out"
        receipt = ev.run(out, submissions=self.subs, gate=StubGate(leak="nothing"))
        self.assertEqual(receipt["hypotheses"]["Y2"], False)
        self.assertEqual(
            receipt["rounds"]["2"]["repaired_kinds"], {"authority_hash": 1}
        )
        root = (out / "ROOT.sha256").read_text().strip()
        _, first, record = ev.round_one()

        def hide(files):
            report = json.loads(files["report.json"])
            report["rows"][RECORDED + 2]["repaired"].update(differs=False, kinds=[])
            subs = {1: first, 2: {a: files[ev.member(a)] for a in r.ROUND_TWO}}
            report["summary"] = r.summarise(report["rows"], r.received(subs))
            report["hypotheses"] = r.hypotheses(
                report["summary"], report["rows"], record
            )
            files["report.json"] = projection.wire(report)
            files["summary.json"] = projection.wire(report["summary"])
            files["hypotheses.json"] = projection.wire(report["hypotheses"])

        pack, new_root = repack(out / "evidence.zip", hide)
        proto = out / "protocol.json"
        hidden = ev.verify(pack, new_root, protocol=proto)
        self.assertEqual(hidden["kind"], "structure_checked")
        self.assertIs(hidden["hypotheses"]["Y2"], True)
        with self.assertRaises(ValueError) as caught:
            ev.verify(
                pack,
                new_root,
                protocol=proto,
                replay=True,
                gate=StubGate(leak="nothing"),
            )
        self.assertEqual(str(caught.exception), "report_mismatch")
        self.assertIs(
            ev.verify(
                out / "evidence.zip",
                root,
                protocol=proto,
                replay=True,
                gate=StubGate(leak="nothing"),
            )["hypotheses"]["Y2"],
            False,
        )

    def test_a_changed_summary_hypothesis_or_sidecar_is_refused(self):
        def summary(report):
            report["summary"]["rounds"]["2"]["totals"]["potent"] = 0

        self.refused(edit_report(summary), "summary_mismatch")

        def hypothesis(report):
            report["hypotheses"]["Y0"]["holds"] = True

        self.refused(edit_report(hypothesis), "hypotheses_mismatch")

        def submissions(report):
            report["submissions"]["2"]["fable-r2"]["rejected"] = []

        self.refused(edit_report(submissions), "submission_binding")

        def sidecar(files):
            files["summary.json"] = projection.wire({})

        self.refused(sidecar, "sidecar_member_mismatch")

        def binding(report):
            report["protocol_sha256"] = "0" * 64

        self.refused(edit_report(binding), "protocol_binding")

        def schema(report):
            report["schema"] = "simurgh-phase19t-report-v1"

        self.refused(edit_report(schema), "report_schema")

    def test_the_protocol_pins_the_brief_the_repair_and_19ts_pack(self):
        proto = json.loads(self.proto.read_text())
        self.assertIn(ev.BRIEF, proto["sources"])
        self.assertIn(ev.ROUND_ONE_PACK, proto["sources"])
        self.assertIn(ev.ROUND_ONE_ROOT, proto["sources"])
        for name in (
            "repair19y.py",
            "redteam19y.py",
            "gate19.py",
            "rig.py",
            "lane.py",
            "mutants.py",
            "redteam19t.py",
            "tests/test_repair19y.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, proto["sources"])
        self.assertEqual(len(proto["sources"]), 18)
        self.assertEqual(
            {k: set(v) for k, v in proto["submissions"].items()},
            {"1": set(r.ROUND_ONE), "2": set(r.ROUND_TWO)},
        )
        self.assertEqual(proto["seats"]["2"], ["opus-r2", "fable-r2"])
        self.assertEqual(proto["mutants"], 13)
        self.assertEqual(proto["round_one_pack_root"], ev.round_one()[0])

        def refused(change, reason):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19y-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)

        refused(lambda p: p["limits"].update(attempts=600), "protocol_inventory")
        refused(lambda p: p["sources"].pop(ev.BRIEF), "protocol_inventory")
        refused(lambda p: p["sources"].update({ev.BRIEF: "0" * 64}), "source_binding")
        refused(
            lambda p: p["sources"].update({ev.ROUND_ONE_PACK: "0" * 64}),
            "source_binding",
        )
        refused(lambda p: p.update(round_one_pack_root="0" * 64), "protocol_inventory")
        refused(
            lambda p: p["submissions"]["1"].update(claude="0" * 64),
            "protocol_inventory",
        )

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
