"""Lane 19ac evidence pack: build with a stand-in gate, verify by structure and by replay, and
refuse packs that were changed."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19ac as ev  # noqa: E402
import planted19ac as m  # noqa: E402
import projection  # noqa: E402
from test_planted19ac import FORGE, MINTED, PLAIN, StubGate, file  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19ac-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit_report(change):
    def mutate(files):
        report = json.loads(files["report.json"])
        change(report)
        files["report.json"] = projection.wire(report)

    return mutate


class Evidence19acTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19ac-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        base = Path(cls.temp.name)
        cls.author = base / "author.json"
        cls.author.write_bytes(file("author", [PLAIN, FORGE]))
        cls.subs = base / "submissions"
        cls.subs.mkdir()
        (cls.subs / "seat-a.json").write_bytes(
            file("seat-a", [FORGE, MINTED, {"steps": [], "note": "bad"}])
        )
        (cls.subs / "seat-b.json").write_bytes(file("seat-b", [PLAIN, FORGE]))
        cls.out = base / "out"
        cls.receipt = ev.run(
            cls.out, author=cls.author, submissions=cls.subs, gate=StubGate()
        )
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
        self.assertEqual(c["hypotheses"], dict.fromkeys(("P0", "P1", "P2", "P3"), True))
        self.assertEqual((c["totals"]["run"], c["totals"]["seat_attempts"]), (6, 4))
        self.assertEqual(c["sources"]["seat-a"]["rejected"], 1)
        self.assertEqual(c["manifest_sha256"], self.root)
        self.assertIs(c["model_inference"], False)

    def test_without_replay_verify_checks_structure_and_says_so(self):
        c = self.verify()
        self.assertEqual(
            (c["kind"], c["replay"]["result"]), ("structure_checked", "not_run")
        )
        self.assertEqual(c["totals"], self.receipt["totals"])

    def test_the_pack_holds_all_three_files_as_given(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
            inside = z.read("submission-seat-a.json")
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
        self.assertEqual(inside, (self.subs / "seat-a.json").read_bytes())
        self.refused(lambda f: f.pop("submission-seat-b.json"), "pack_inventory")
        self.refused(
            lambda f: f.update({"submission-seat-b.json": file("seat-b", [PLAIN])}),
            "protocol_inventory",
        )

    def test_a_row_must_describe_the_attempt_and_its_flag_must_follow(self):
        self.refused(edit_report(lambda rep: rep["rows"].pop()), "report_rows")
        self.refused(
            edit_report(lambda rep: rep["rows"][1].update(note="x")), "row_mismatch"
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][1].update(steps_sha256="0" * 64)),
            "row_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][1]["planted"].update(gained=False)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][0]["real"].update(gained=True)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][0]["real"].pop("effects")),
            "row_outcome",
        )

    def test_a_changed_summary_hypothesis_or_sidecar_is_refused(self):
        self.refused(
            edit_report(
                lambda rep: rep["summary"]["totals"].update(seat_real_gained=1)
            ),
            "summary_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep["hypotheses"]["P2"].update(holds=False)),
            "hypotheses_mismatch",
        )
        self.refused(
            lambda f: f.update({"hypotheses.json": projection.wire({})}),
            "sidecar_member_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep.update(protocol_sha256="0" * 64)),
            "protocol_binding",
        )

    def test_a_hidden_gain_on_the_real_gate_is_caught_by_replay(self):
        out = Path(tempfile.mkdtemp(prefix="p19ac-leaky-")) / "out"
        receipt = ev.run(
            out, author=self.author, submissions=self.subs, gate=StubGate(leaky=True)
        )
        self.assertIs(receipt["hypotheses"]["P1"], False)
        given = ev.read_files(self.author, self.subs)
        honest = StubGate()

        def hide(files):
            rep = json.loads(files["report.json"])
            got = m.received(given)
            want = [a for s in m.SOURCES for a in got[s]["attempts"]]
            for row, attempt in zip(rep["rows"], want):
                row["real"] = m.flags(
                    attempt["steps"], honest.run("real", attempt["steps"])
                )
            rep["summary"] = m.summarise(rep["rows"], got)
            rep["hypotheses"] = m.hypotheses(rep["summary"])
            files["report.json"] = projection.wire(rep)
            files["summary.json"] = projection.wire(rep["summary"])
            files["hypotheses.json"] = projection.wire(rep["hypotheses"])

        pack, new_root = repack(out / "evidence.zip", hide)
        proto = out / "protocol.json"
        self.assertIs(
            ev.verify(pack, new_root, protocol=proto)["hypotheses"]["P1"], True
        )
        with self.assertRaises(ValueError) as caught:
            ev.verify(
                pack, new_root, protocol=proto, replay=True, gate=StubGate(leaky=True)
            )
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_the_protocol_pins_the_brief_the_planted_module_and_the_gate(self):
        proto = json.loads(self.proto.read_text())
        for name in (
            "planted19ac.py",
            "retry19aa.py",
            "seal19z.py",
            "repair19y.py",
            "gate19.py",
            "rig.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, proto["sources"])
        self.assertIn(ev.BRIEF, proto["sources"])
        self.assertEqual(len(proto["sources"]), 11)
        self.assertEqual(
            proto["limits"]["attempts"], {"author": 20, "seat-a": 40, "seat-b": 40}
        )
        other = dict(proto, sources=dict(proto["sources"], **{ev.BRIEF: "0" * 64}))
        path = Path(tempfile.mkdtemp(prefix="p19ac-proto-")) / "protocol.json"
        path.write_bytes(projection.wire(other))
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, self.root, protocol=path)
        self.assertEqual(str(caught.exception).split(":")[0], "source_binding")

    def test_run_and_replay_need_a_gate_or_the_replay_host(self):
        if ev.host_can_replay():
            self.skipTest("this host can replay")
        with self.assertRaises(ValueError) as caught:
            ev.run(
                Path(tempfile.mkdtemp()) / "out",
                author=self.author,
                submissions=self.subs,
            )
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")
        with self.assertRaises(ValueError):
            self.verify(replay=True)


if __name__ == "__main__":
    unittest.main()
