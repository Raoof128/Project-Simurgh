"""Lane 19z evidence pack: build with a stand-in gate, verify by structure and by replay, and
refuse packs that were changed."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19z as ev  # noqa: E402
import projection  # noqa: E402
import tamper19z as t  # noqa: E402
from test_tamper19z import CONTROL, GRANT, SCRIPT, StubGate, file  # noqa: E402


def write_inputs(root):
    root = Path(root)
    (root / "subs").mkdir(parents=True)
    (root / "author.json").write_bytes(file("author", [GRANT, SCRIPT, CONTROL]))
    (root / "subs/seat-a.json").write_bytes(
        file("seat-a", [GRANT, {"ops": [], "note": "bad"}])
    )
    (root / "subs/seat-b.json").write_bytes(file("seat-b", [SCRIPT]))
    return root


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19z-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit_report(change):
    def mutate(files):
        report = json.loads(files["report.json"])
        change(report)
        files["report.json"] = projection.wire(report)

    return mutate


class Evidence19zTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19z-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.inputs = write_inputs(Path(cls.temp.name) / "in")
        cls.out = Path(cls.temp.name) / "out"
        cls.kw = {
            "author": cls.inputs / "author.json",
            "submissions": cls.inputs / "subs",
        }
        cls.receipt = ev.run(cls.out, gate=StubGate(), **cls.kw)
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
        self.assertEqual(
            (c["kind"], c["replay"]), ("gate_recomputed", {"result": "verified"})
        )
        self.assertEqual(
            c["sources"],
            {
                "author": {"received": 3, "rejected": 0, "run": 3},
                "seat-a": {"received": 2, "rejected": 1, "run": 1},
                "seat-b": {"received": 1, "rejected": 0, "run": 1},
            },
        )
        self.assertEqual(c["totals"]["run"], 5)
        self.assertEqual(
            (c["totals"]["open_gained"], c["totals"]["sealed_gained"]), (2, 0)
        )
        self.assertEqual(
            c["hypotheses"], {"Z0": True, "Z1": True, "Z2": True, "Z3": True}
        )
        self.assertIs(c["model_inference"], False)
        self.assertEqual(c["manifest_sha256"], self.root)

    def test_without_replay_verify_checks_structure_and_says_so(self):
        c = self.verify()
        self.assertEqual(
            (c["kind"], c["replay"]["result"]), ("structure_checked", "not_run")
        )
        self.assertEqual(c["totals"], self.receipt["totals"])

    def test_the_pack_holds_every_file_of_attempts_as_received(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
            seat = z.read("submission-seat-a.json")
        self.assertEqual(
            names,
            {
                "report.json",
                "summary.json",
                "hypotheses.json",
                "attempts-author.json",
                "submission-seat-a.json",
                "submission-seat-b.json",
            },
        )
        self.assertEqual(seat, (self.inputs / "subs/seat-a.json").read_bytes())
        self.refused(lambda f: f.update({"notes.txt": b"x"}), "pack_inventory")
        self.refused(lambda f: f.pop("attempts-author.json"), "pack_inventory")

    def test_a_changed_file_of_attempts_is_refused(self):
        def change(files):
            files["submission-seat-b.json"] = file("seat-b", [CONTROL])

        self.refused(change, "protocol_inventory")

    def test_a_dropped_or_reordered_row_is_refused(self):
        self.refused(edit_report(lambda r: r["rows"].pop(0)), "report_rows")

        def swap(report):
            report["rows"][0], report["rows"][1] = report["rows"][1], report["rows"][0]

        self.refused(edit_report(swap), "row_mismatch")

    def test_a_row_must_describe_the_submitted_attempt(self):
        for field, value in (
            ("ops_sha256", "0" * 64),
            ("ops_count", 5),
            ("note", "x"),
            ("source", "seat-b"),
        ):

            def change(report, field=field, value=value):
                report["rows"][0][field] = value

            self.refused(edit_report(change), "row_mismatch")

    def test_a_rows_flags_must_follow_from_its_outcome(self):
        def hide(report):
            report["rows"][0]["open"]["gained"] = False

        self.refused(edit_report(hide), "row_outcome")

        def fake(report):
            report["rows"][2]["sealed"]["denied"] = True

        self.refused(edit_report(fake), "row_outcome")

        def open_latch(report):
            report["rows"][2]["open"]["latched"] = ["context.sqlite"]

        self.refused(edit_report(open_latch), "row_outcome")

        def missing(report):
            del report["rows"][1]["sealed"]["touched"]

        self.refused(edit_report(missing), "row_outcome")

        def ops(report):
            report["rows"][1]["sealed"]["ops"] = []

        self.refused(edit_report(ops), "row_outcome")

    def test_a_hidden_gain_is_caught_by_replay(self):
        out = Path(tempfile.mkdtemp(prefix="p19z-blind-")) / "out"
        receipt = ev.run(out, gate=StubGate(blind="GRANT"), **self.kw)
        self.assertEqual(
            (receipt["hypotheses"]["Z1"], receipt["totals"]["sealed_gained"]),
            (False, 2),
        )
        given = ev.read_files(**self.kw)

        def hide(files):
            report = json.loads(files["report.json"])
            for row in report["rows"]:
                if row["sealed"]["gained"]:
                    row["sealed"].update(
                        verdicts={"b": "blocked", "a": "blocked"},
                        effects=0,
                        latched=["context.sqlite"],
                        gained=False,
                        denied=True,
                    )
            got = t.received(given)
            report["summary"] = t.summarise(
                report["rows"], got, report["summary"]["baseline"]
            )
            report["hypotheses"] = t.hypotheses(report["summary"])
            files["report.json"] = projection.wire(report)
            files["summary.json"] = projection.wire(report["summary"])
            files["hypotheses.json"] = projection.wire(report["hypotheses"])

        pack, new_root = repack(out / "evidence.zip", hide)
        proto = out / "protocol.json"
        hidden = ev.verify(pack, new_root, protocol=proto)
        self.assertIs(hidden["hypotheses"]["Z1"], True)
        with self.assertRaises(ValueError) as caught:
            ev.verify(
                pack,
                new_root,
                protocol=proto,
                replay=True,
                gate=StubGate(blind="GRANT"),
            )
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_a_changed_summary_hypothesis_or_sidecar_is_refused(self):
        def summary(report):
            report["summary"]["totals"]["sealed_gained"] = 0
            report["summary"]["totals"]["open_gained"] = 0

        self.refused(edit_report(summary), "summary_mismatch")

        def baseline(report):
            report["summary"]["baseline"]["sealed"]["latched"] = ["x"]

        # the baseline is a measurement, so structure takes it from the report; a baseline
        # that says the untouched sealed gate latched is caught through Z2
        self.refused(edit_report(baseline), "hypotheses_mismatch")
        self.refused(
            edit_report(lambda r: r["hypotheses"]["Z3"].update(holds=False)),
            "hypotheses_mismatch",
        )
        self.refused(
            edit_report(lambda r: r["attempt_files"]["seat-a"].update(rejected=[])),
            "file_binding",
        )
        self.refused(
            lambda f: f.update({"summary.json": projection.wire({})}),
            "sidecar_member_mismatch",
        )
        self.refused(
            edit_report(lambda r: r.update(protocol_sha256="0" * 64)),
            "protocol_binding",
        )
        self.refused(edit_report(lambda r: r.update(schema="other")), "report_schema")

    def test_the_protocol_pins_the_seal_the_gate_and_the_brief(self):
        proto = json.loads(self.proto.read_text())
        self.assertIn(ev.BRIEF, proto["sources"])
        for name in (
            "seal19z.py",
            "tamper19z.py",
            "repair19y.py",
            "gate19.py",
            "rig.py",
            "tests/test_seal19z.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, proto["sources"])
        self.assertEqual(len(proto["sources"]), 11)
        self.assertEqual(set(proto["attempt_files"]), set(t.SOURCES))
        self.assertEqual(proto["stores"], list(t.STORES))

        def refused(change, reason):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19z-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)

        refused(lambda p: p["limits"].update(ops=60), "protocol_inventory")
        refused(lambda p: p["sources"].pop(ev.BRIEF), "protocol_inventory")
        refused(lambda p: p["sources"].update({ev.BRIEF: "0" * 64}), "source_binding")
        refused(
            lambda p: p["attempt_files"].update(author="0" * 64), "protocol_inventory"
        )

    def test_run_and_replay_need_a_gate_or_the_replay_host(self):
        if ev.host_can_replay():
            self.skipTest("this host can replay")
        with self.assertRaises(ValueError) as caught:
            ev.run(Path(tempfile.mkdtemp()) / "out", **self.kw)
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")
        with self.assertRaises(ValueError) as caught:
            self.verify(replay=True)
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")

    def test_run_refuses_an_existing_directory_before_it_writes(self):
        with self.assertRaises(FileExistsError):
            ev.run(self.out, gate=StubGate(), **self.kw)


if __name__ == "__main__":
    unittest.main()
