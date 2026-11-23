"""Lane 19ag evidence pack: build with a stand-in gate, verify by structure and by replay, and
refuse packs that were changed."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19ag as ev  # noqa: E402
import full19ae  # noqa: E402
import guard19ag as m  # noqa: E402
import projection  # noqa: E402
from test_guard19ag import FIXTURE, StubGate, d, seat_file, seq  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        held = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(held)
    dst = Path(tempfile.mkdtemp(prefix="p19ag-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, held)


def edit_report(change):
    def mutate(held):
        report = json.loads(held["report.json"])
        change(report)
        held["report.json"] = projection.wire(report)

    return mutate


class Evidence19agTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19ag-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        base = Path(cls.temp.name)
        cls.paths = {}
        for seat in m.SEATS:
            path = base / (seat + ".json")
            path.write_bytes(
                seat_file(seat, [seq(d("b", 2), d("a")), {"steps": [], "note": "bad"}])
            )
            cls.paths[seat] = str(path)
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
        self.assertEqual(
            c["hypotheses"], dict.fromkeys(("G0", "G1", "G2", "G3", "G4", "G5"), True)
        )
        earlier = json.loads(
            (ev.ROOT / "docs/research/provenance-phase-19ae/receipt.json").read_text()
        )["totals"]["run"]
        self.assertEqual(
            (c["totals"]["run"], c["totals"]["recorded"], c["totals"]["fresh"]),
            (earlier + 3, earlier, 3),
        )
        self.assertGreater(c["totals"]["full_raised"], 0)
        self.assertEqual(c["sources"]["seat-a"]["rejected"], 1)
        self.assertEqual(c["manifest_sha256"], self.root)

    def test_without_replay_verify_checks_structure_and_says_so(self):
        c = self.verify()
        self.assertEqual(
            (c["kind"], c["replay"]["result"]), ("structure_checked", "not_run")
        )
        self.assertEqual(c["totals"], self.receipt["totals"])

    def test_the_pack_holds_every_file_it_read(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
            inside = z.read("attempts-19ac-seat-b.json")
        self.assertEqual(
            names,
            {
                "report.json",
                "summary.json",
                "hypotheses.json",
                *("attempts-" + s + ".json" for s in m.SOURCES),
            },
        )
        self.assertEqual(inside, (ev.ROOT / ev.FILES["19ac-seat-b"]).read_bytes())
        # lane 19ae's sources, all now recorded, and this lane's three fresh seats
        self.assertEqual(len(m.SOURCES), len(full19ae.SOURCES) + len(m.SEATS))
        self.refused(lambda f: f.pop("attempts-seat-c.json"), "pack_inventory")
        self.refused(
            lambda f: f.update({"attempts-seat-c.json": seat_file("seat-c", [])}),
            "protocol_inventory",
        )

    def test_a_row_must_describe_the_attempt_and_its_flags_must_follow(self):
        self.refused(edit_report(lambda rep: rep["rows"].pop()), "report_rows")
        self.refused(
            edit_report(lambda rep: rep["rows"][0].update(note="x")), "row_mismatch"
        )
        self.refused(
            edit_report(
                lambda rep: rep["rows"][-1].update(full=rep["rows"][-1]["guarded"])
            ),
            "row_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][-1]["guarded"].update(gained=True)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][-1]["guarded"].update(unrecorded=5)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["rows"][0]["full"].update(effects=3)),
            "row_outcome",
        )

    def test_the_fixture_summary_and_hypotheses_are_recomputed(self):
        self.refused(
            edit_report(lambda rep: rep["summary"]["fixture"].update(b="c" * 64)),
            "row_outcome",
        )
        self.refused(
            edit_report(lambda rep: rep["summary"].pop("fixture")), "summary_mismatch"
        )
        self.refused(
            edit_report(lambda rep: rep["summary"]["totals"].update(guarded_gained=1)),
            "summary_mismatch",
        )
        self.refused(
            edit_report(lambda rep: rep["hypotheses"]["G4"].update(holds=False)),
            "hypotheses_mismatch",
        )
        self.refused(
            lambda f: f.update({"summary.json": projection.wire({})}),
            "sidecar_member_mismatch",
        )

    def test_a_hidden_gain_is_caught_by_replay(self):
        out = Path(tempfile.mkdtemp(prefix="p19ag-leak-")) / "out"
        receipt = ev.run(out, files=self.paths, gate=StubGate(leak=True))
        self.assertIs(receipt["hypotheses"]["G4"], False)
        given = ev.read_files(self.paths)
        honest = StubGate()

        def hide(held):
            rep = json.loads(held["report.json"])
            got = m.received(given)
            want = [a for s in m.SOURCES for a in got[s]["attempts"]]
            for row, attempt in zip(rep["rows"], want):
                row["guarded"] = m.flags(
                    attempt["steps"], honest.one("guarded", attempt["steps"]), FIXTURE
                )
            rep["summary"] = m.summarise(rep["rows"], got, FIXTURE)
            rep["hypotheses"] = m.hypotheses(rep["summary"])
            held["report.json"] = projection.wire(rep)
            held["summary.json"] = projection.wire(rep["summary"])
            held["hypotheses.json"] = projection.wire(rep["hypotheses"])

        pack, new_root = repack(out / "evidence.zip", hide)
        proto = out / "protocol.json"
        self.assertIs(
            ev.verify(pack, new_root, protocol=proto)["hypotheses"]["G4"], True
        )
        with self.assertRaises(ValueError) as caught:
            ev.verify(
                pack, new_root, protocol=proto, replay=True, gate=StubGate(leak=True)
            )
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_the_protocol_pins_the_gate_every_repair_and_the_brief(self):
        proto = json.loads(self.proto.read_text())
        for name in (
            "guard19ag.py",
            "full19ae.py",
            "bind19ad.py",
            "seal19z.py",
            "repair19y.py",
            "gate19.py",
            "tamper19z.py",
            "redteam19y.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, proto["sources"])
        self.assertIn(ev.BRIEF, proto["sources"])
        self.assertEqual(len(proto["sources"]), 18)
        self.assertEqual(
            proto["limits"],
            {"retry_mark": 20, "seat_attempts": 40, "steps": 12, "batch": 25},
        )
        other = dict(proto, sources=dict(proto["sources"], **{ev.BRIEF: "0" * 64}))
        path = Path(tempfile.mkdtemp(prefix="p19ag-proto-")) / "protocol.json"
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
