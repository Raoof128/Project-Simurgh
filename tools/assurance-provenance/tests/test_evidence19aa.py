"""Lane 19aa evidence pack: build with a stand-in gate, verify by structure and by replay, and
refuse packs that were changed."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19aa as ev  # noqa: E402
import projection  # noqa: E402
import retry19aa as r  # noqa: E402
from test_retry19aa import GOOD, StubGate, d, file, seq  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19aa-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit_report(change):
    def mutate(files):
        report = json.loads(files["report.json"])
        change(report)
        files["report.json"] = projection.wire(report)

    return mutate


class Evidence19aaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19aa-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.author = Path(cls.temp.name) / "author.json"
        cls.author.write_bytes(file([*GOOD, {"steps": [], "note": "bad"}]))
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out, author=cls.author, gate=StubGate())
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
            c["sources"], {"author": {"received": 4, "rejected": 1, "run": 3}}
        )
        self.assertEqual((c["totals"]["run"], c["totals"]["refused"]), (3, 7))
        self.assertEqual(
            c["hypotheses"], dict.fromkeys(("R1", "R2", "R3", "R4", "R5"), True)
        )
        self.assertIs(c["model_inference"], False)
        self.assertEqual(c["manifest_sha256"], self.root)

    def test_without_replay_verify_checks_structure_and_says_so(self):
        c = self.verify()
        self.assertEqual(
            (c["kind"], c["replay"]["result"]), ("structure_checked", "not_run")
        )
        self.assertEqual(c["totals"], self.receipt["totals"])

    def test_the_pack_holds_the_file_of_sequences_as_given(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
            inside = z.read("attempts-author.json")
        self.assertEqual(
            names,
            {"report.json", "summary.json", "hypotheses.json", "attempts-author.json"},
        )
        self.assertEqual(inside, self.author.read_bytes())
        self.refused(lambda f: f.update({"notes.txt": b"x"}), "pack_inventory")
        self.refused(
            lambda f: f.update({"attempts-author.json": file(GOOD[:1])}),
            "protocol_inventory",
        )

    def test_a_dropped_or_reordered_row_is_refused(self):
        self.refused(edit_report(lambda rep: rep["rows"].pop(0)), "report_rows")

        def swap(rep):
            rep["rows"][0], rep["rows"][1] = rep["rows"][1], rep["rows"][0]

        self.refused(edit_report(swap), "row_mismatch")

    def test_a_row_must_describe_the_sequence_and_its_facts_must_follow(self):
        for field, value in (
            ("steps_sha256", "0" * 64),
            ("steps_count", 9),
            ("note", "x"),
        ):

            def change(rep, field=field, value=value):
                rep["rows"][0][field] = value

            self.refused(edit_report(change), "row_mismatch")
        self.refused(
            edit_report(lambda rep: rep["rows"][0]["facts"].update(refused=0)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][1]["facts"].update(b_observed=0)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][0]["outcome"].pop("effects")),
            "row_outcome",
        )

        def verdict(rep):
            rep["rows"][0]["outcome"]["dispatches"][0][2] = "observed"

        self.refused(edit_report(verdict), "row_outcome")

    def test_a_hidden_landing_is_caught_by_replay(self):
        out = Path(tempfile.mkdtemp(prefix="p19aa-leak-")) / "out"
        receipt = ev.run(out, author=self.author, gate=StubGate(leak=True))
        self.assertIs(receipt["hypotheses"]["R1"], False)
        given = ev.read_files(self.author)

        def hide(files):
            rep = json.loads(files["report.json"])
            want = r.received(given)["author"]["attempts"]
            for row, attempt in zip(rep["rows"], want):
                for item in row["outcome"]["dispatches"]:
                    if item[0] == "b" and item[1] != "token:b":
                        item[2] = "blocked"
                row["outcome"]["blocked_events"] = sum(
                    x[2] == "blocked" for x in row["outcome"]["dispatches"]
                )
                row["facts"] = r.facts(attempt["steps"], row["outcome"])
            rep["summary"] = r.summarise(rep["rows"], r.received(given))
            rep["hypotheses"] = r.hypotheses(rep["summary"])
            files["report.json"] = projection.wire(rep)
            files["summary.json"] = projection.wire(rep["summary"])
            files["hypotheses.json"] = projection.wire(rep["hypotheses"])

        pack, new_root = repack(out / "evidence.zip", hide)
        proto = out / "protocol.json"
        self.assertIs(
            ev.verify(pack, new_root, protocol=proto)["hypotheses"]["R1"], True
        )
        with self.assertRaises(ValueError) as caught:
            ev.verify(
                pack, new_root, protocol=proto, replay=True, gate=StubGate(leak=True)
            )
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_a_changed_summary_hypothesis_or_sidecar_is_refused(self):
        self.refused(
            edit_report(lambda rep: rep["summary"]["totals"].update(refused=0)),
            "summary_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep["hypotheses"]["R2"].update(holds=False)),
            "hypotheses_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep["attempt_files"]["author"].update(rejected=[])),
            "file_binding",
        )
        self.refused(
            lambda f: f.update({"summary.json": projection.wire({})}),
            "sidecar_member_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep.update(protocol_sha256="0" * 64)),
            "protocol_binding",
        )
        self.refused(
            edit_report(lambda rep: rep.update(schema="other")), "report_schema"
        )

    def test_the_protocol_pins_the_gate_the_seal_and_the_instrument(self):
        proto = json.loads(self.proto.read_text())
        for name in (
            "retry19aa.py",
            "seal19z.py",
            "repair19y.py",
            "gate19.py",
            "rig.py",
            "tests/test_retry19aa.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, proto["sources"])
        self.assertEqual(len(proto["sources"]), 9)
        self.assertEqual(proto["limits"]["times"], 200)

        def refused(change, reason):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19aa-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)

        refused(lambda p: p["limits"].update(times=9), "protocol_inventory")
        refused(
            lambda p: p["sources"].update(
                {"tools/assurance-provenance/gate19.py": "0" * 64}
            ),
            "source_binding",
        )
        refused(
            lambda p: p["attempt_files"].update(author="0" * 64), "protocol_inventory"
        )

    def test_run_and_replay_need_a_gate_or_the_replay_host(self):
        if ev.host_can_replay():
            self.skipTest("this host can replay")
        with self.assertRaises(ValueError) as caught:
            ev.run(Path(tempfile.mkdtemp()) / "out", author=self.author)
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")
        with self.assertRaises(ValueError):
            self.verify(replay=True)

    def test_a_sequence_file_of_another_shape_is_not_run(self):
        other = Path(self.temp.name) / "other.json"
        other.write_bytes(file([seq(d("b", 2), d("a"))]))
        out = Path(tempfile.mkdtemp(prefix="p19aa-other-")) / "out"
        self.assertEqual(ev.run(out, author=other, gate=StubGate())["totals"]["run"], 1)
        with self.assertRaises(FileExistsError):
            ev.run(out, author=other, gate=StubGate())


if __name__ == "__main__":
    unittest.main()
