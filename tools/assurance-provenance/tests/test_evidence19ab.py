"""Lane 19ab evidence pack: build with a stand-in gate, verify by structure and by replay, and
refuse packs that were changed."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import body19ab as m  # noqa: E402
import evidence19ab as ev  # noqa: E402
import projection  # noqa: E402
from test_body19ab import FIXTURE, GOOD, A, StubGate, att, file  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19ab-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit_report(change):
    def mutate(files):
        report = json.loads(files["report.json"])
        change(report)
        files["report.json"] = projection.wire(report)

    return mutate


class Evidence19abTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19ab-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.author = Path(cls.temp.name) / "author.json"
        cls.author.write_bytes(file([*GOOD, att("c", {}, "bad")]))
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
            c["sources"], {"author": {"received": 5, "rejected": 1, "run": 4}}
        )
        self.assertEqual((c["totals"]["run"], c["totals"]["changed"]), (4, 2))
        self.assertEqual(
            c["hypotheses"], dict.fromkeys(("B1", "B2", "B3", "B4", "B5"), True)
        )
        self.assertIs(c["model_inference"], False)
        self.assertEqual(c["manifest_sha256"], self.root)

    def test_without_replay_verify_checks_structure_and_says_so(self):
        c = self.verify()
        self.assertEqual(
            (c["kind"], c["replay"]["result"]), ("structure_checked", "not_run")
        )
        self.assertEqual(c["totals"], self.receipt["totals"])

    def test_the_pack_holds_the_file_of_attempts_as_given(self):
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

    def test_a_row_must_describe_the_attempt_and_its_facts_must_follow(self):
        for field, value in (("body_sha256", "0" * 64), ("route", "b"), ("note", "x")):

            def change(rep, field=field, value=value):
                rep["rows"][1][field] = value

            self.refused(edit_report(change), "row_mismatch")
        self.refused(
            edit_report(lambda rep: rep["rows"][1]["facts"].update(changed=False)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][1]["outcome"].update(first="observed")),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][0]["outcome"].update(effects=2)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][0]["outcome"].pop("payloads")),
            "row_outcome",
        )

    def test_the_fixture_in_the_report_decides_what_changed(self):
        def other(rep):
            rep["summary"]["fixture"]["actions"]["a"]["content"] = "report b"

        self.refused(edit_report(other), "row_outcome")
        self.refused(
            edit_report(lambda rep: rep["summary"].pop("fixture")), "summary_mismatch"
        )
        self.refused(
            edit_report(
                lambda rep: rep["summary"]["fixture"]["payload_sha256"].update(a="z")
            ),
            "summary_mismatch",
        )

    def test_a_hidden_observation_is_caught_by_replay(self):
        out = Path(tempfile.mkdtemp(prefix="p19ab-loose-")) / "out"
        receipt = ev.run(out, author=self.author, gate=StubGate(loose=True))
        self.assertIs(receipt["hypotheses"]["B1"], False)
        given = ev.read_files(self.author)
        honest = StubGate()

        def hide(files):
            rep = json.loads(files["report.json"])
            want = m.received(given)["author"]["attempts"]
            for row, attempt in zip(rep["rows"], want):
                row["outcome"] = honest.run(attempt["route"], attempt["body"])
                row["facts"] = m.facts(
                    attempt["route"], attempt["body"], row["outcome"], FIXTURE
                )
            rep["summary"] = m.summarise(rep["rows"], m.received(given), FIXTURE)
            rep["hypotheses"] = m.hypotheses(rep["summary"])
            files["report.json"] = projection.wire(rep)
            files["summary.json"] = projection.wire(rep["summary"])
            files["hypotheses.json"] = projection.wire(rep["hypotheses"])

        pack, new_root = repack(out / "evidence.zip", hide)
        proto = out / "protocol.json"
        self.assertIs(
            ev.verify(pack, new_root, protocol=proto)["hypotheses"]["B1"], True
        )
        with self.assertRaises(ValueError) as caught:
            ev.verify(
                pack, new_root, protocol=proto, replay=True, gate=StubGate(loose=True)
            )
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_a_changed_summary_hypothesis_or_sidecar_is_refused(self):
        self.refused(
            edit_report(lambda rep: rep["summary"]["totals"].update(changed=0)),
            "summary_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep["hypotheses"]["B1"].update(holds=False)),
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
            "body19ab.py",
            "seal19z.py",
            "repair19y.py",
            "gate19.py",
            "rig.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, proto["sources"])
        self.assertEqual(len(proto["sources"]), 9)
        self.assertEqual(proto["limits"]["body"], m.MAX_BODY)

        def refused(change, reason):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19ab-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)

        refused(lambda p: p["limits"].update(body=9), "protocol_inventory")
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

    def test_a_pack_is_not_written_over_an_existing_one(self):
        other = Path(self.temp.name) / "other.json"
        other.write_bytes(file([att("a", dict(A)), att("a", {**A, "id": "b"})]))
        out = Path(tempfile.mkdtemp(prefix="p19ab-other-")) / "out"
        self.assertEqual(ev.run(out, author=other, gate=StubGate())["totals"]["run"], 2)
        with self.assertRaises(FileExistsError):
            ev.run(out, author=other, gate=StubGate())


if __name__ == "__main__":
    unittest.main()
