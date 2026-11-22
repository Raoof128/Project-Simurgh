"""Lane 19ad evidence pack: build with a stand-in gate, verify by structure and by replay, and
refuse packs that were changed."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import bind19ad as m  # noqa: E402
import evidence19ad as ev  # noqa: E402
import projection  # noqa: E402
from test_bind19ad import StubGate, files  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        held = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(held)
    dst = Path(tempfile.mkdtemp(prefix="p19ad-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, held)


def edit_report(change):
    def mutate(held):
        report = json.loads(held["report.json"])
        change(report)
        held["report.json"] = projection.wire(report)

    return mutate


class Evidence19adTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19ad-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        base = Path(cls.temp.name)
        cls.paths = {}
        for source, raw in files().items():
            path = base / (source + ".json")
            path.write_bytes(raw)
            cls.paths[source] = str(path)
        cls.out = base / "out"
        cls.receipt = ev.run(cls.out, files=cls.paths, gate=StubGate())
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
        self.assertEqual(c["hypotheses"], dict.fromkeys(("D0", "D1", "D2", "D3"), True))
        self.assertEqual(
            (
                c["totals"]["run"],
                c["totals"]["before_gained"],
                c["totals"]["bound_gained"],
            ),
            (13, 7, 0),
        )
        self.assertEqual(c["manifest_sha256"], self.root)

    def test_without_replay_verify_checks_structure_and_says_so(self):
        c = self.verify()
        self.assertEqual(
            (c["kind"], c["replay"]["result"]), ("structure_checked", "not_run")
        )
        self.assertEqual(c["totals"], self.receipt["totals"])

    def test_the_pack_holds_the_five_files_as_given(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
            inside = z.read("attempts-19ac-seat-a.json")
        self.assertEqual(
            names,
            {
                "report.json",
                "summary.json",
                "hypotheses.json",
                *("attempts-" + s + ".json" for s in m.SOURCES),
            },
        )
        self.assertEqual(inside, Path(self.paths["19ac-seat-a"]).read_bytes())
        self.refused(lambda f: f.pop("attempts-author.json"), "pack_inventory")
        self.refused(
            lambda f: f.update(
                {"attempts-author.json": b'{"attacker": "author", "attempts": []}'}
            ),
            "protocol_inventory",
        )

    def test_a_row_must_describe_the_sequence_and_its_flag_must_follow(self):
        self.refused(edit_report(lambda rep: rep["rows"].pop()), "report_rows")
        self.refused(
            edit_report(lambda rep: rep["rows"][3].update(note="x")), "row_mismatch"
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][3]["before"].update(gained=False)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][3]["bound"].update(gained=True)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["summary"]["totals"].update(bound_gained=1)),
            "summary_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep["hypotheses"]["D1"].update(holds=False)),
            "hypotheses_mismatch",
        )

    def test_a_hidden_gain_on_the_bound_gate_is_caught_by_replay(self):
        out = Path(tempfile.mkdtemp(prefix="p19ad-unrepaired-")) / "out"
        receipt = ev.run(out, files=self.paths, gate=StubGate(unrepaired=True))
        self.assertIs(receipt["hypotheses"]["D1"], False)
        given = ev.read_files(self.paths)
        honest = StubGate()

        def hide(held):
            rep = json.loads(held["report.json"])
            got = m.received(given)
            want = [a for s in m.SOURCES for a in got[s]["attempts"]]
            for row, attempt in zip(rep["rows"], want):
                row["bound"] = m.flags(
                    attempt["steps"], honest.run("bound", attempt["steps"])
                )
            rep["summary"] = m.summarise(rep["rows"], got)
            rep["hypotheses"] = m.hypotheses(rep["summary"])
            held["report.json"] = projection.wire(rep)
            held["summary.json"] = projection.wire(rep["summary"])
            held["hypotheses.json"] = projection.wire(rep["hypotheses"])

        pack, new_root = repack(out / "evidence.zip", hide)
        proto = out / "protocol.json"
        self.assertIs(
            ev.verify(pack, new_root, protocol=proto)["hypotheses"]["D1"], True
        )
        with self.assertRaises(ValueError) as caught:
            ev.verify(
                pack,
                new_root,
                protocol=proto,
                replay=True,
                gate=StubGate(unrepaired=True),
            )
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_the_protocol_pins_the_repair_the_gate_and_the_lanes_it_reads(self):
        proto = json.loads(self.proto.read_text())
        for name in (
            "bind19ad.py",
            "planted19ac.py",
            "retry19aa.py",
            "seal19z.py",
            "repair19y.py",
            "gate19.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, proto["sources"])
        self.assertEqual(len(proto["sources"]), 11)
        self.assertEqual(set(proto["attempt_files"]), set(m.SOURCES))
        self.assertEqual(set(ev.FILES), set(m.SOURCES))
        other = dict(
            proto,
            sources=dict(
                proto["sources"], **{"tools/assurance-provenance/bind19ad.py": "0" * 64}
            ),
        )
        path = Path(tempfile.mkdtemp(prefix="p19ad-proto-")) / "protocol.json"
        path.write_bytes(projection.wire(other))
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, self.root, protocol=path)
        self.assertEqual(str(caught.exception).split(":")[0], "source_binding")

    def test_run_and_replay_need_a_gate_or_the_replay_host(self):
        if ev.host_can_replay():
            self.skipTest("this host can replay")
        with self.assertRaises(ValueError) as caught:
            ev.run(Path(tempfile.mkdtemp()) / "out", files=self.paths)
        self.assertEqual(str(caught.exception), "replay_requires_linux_x86_64")
        with self.assertRaises(ValueError):
            self.verify(replay=True)


if __name__ == "__main__":
    unittest.main()
