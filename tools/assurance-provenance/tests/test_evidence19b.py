import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19b as ev  # noqa: E402
import projection  # noqa: E402

OUTPUTS = {
    "protocol.json",
    "agent-writable.json",
    "report.json",
    "evidence.zip",
    "ROOT.sha256",
    "receipt.json",
}


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19b-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19bTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19b-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"

    def test_outputs_and_receipt(self):
        self.assertTrue(OUTPUTS <= {p.name for p in self.out.iterdir()})
        r = self.receipt
        self.assertIs(r["verified"], True)
        self.assertEqual(r["arm"], "composed_successor")
        self.assertEqual(r["wired_deterministic_channels"], 3)
        self.assertIs(r["phase_19b_closed"], False)
        self.assertEqual(r["kill_count"], 9)
        self.assertEqual(r["clean_differences"], 0)
        self.assertEqual(r["lean"]["states_compared"], 48)
        self.assertIs(r["independent_custody"], False)
        self.assertIs(r["model_inference"], False)

    def test_verify_round_trip(self):
        got = ev.verify(self.out / "evidence.zip", self.root, protocol=self.proto)
        self.assertIs(got["verified"], True)

    def test_protocol_pins_successor_and_frozen_sources(self):
        proto = json.loads(self.proto.read_text())
        names = set(proto["sources"])
        for needle in (
            "tools/assurance-composed-successor/successor.py",
            "tools/assurance-composed/composition.py",
            "tools/assurance-context/context_gate.py",
            "tools/assurance-signals/signals.py",
            "tools/assurance-credentials/gateway.py",
            "tools/assurance-provenance/lane.py",
            "proofs/phase19/AuthorityProvenance.lean",
        ):
            self.assertIn(needle, names)
        self.assertNotIn("tools/assurance-provenance/projection.py", names)
        self.assertEqual(proto["awm_hash"], self.receipt["awm_hash"])

    def _reject(self, mutate, reason):
        pack, root = repack(self.out / "evidence.zip", mutate)
        with self.assertRaises(ValueError) as ctx:
            ev.verify(pack, root, protocol=self.proto)
        self.assertEqual(str(ctx.exception), reason)

    def test_dropped_lane_row(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            rep["write_anywhere"]["rows"].pop()
            files["report.json"] = projection.wire(rep)

        self._reject(mutate, "row_inventory")

    def test_changed_verdict(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            rep["write_anywhere"]["rows"][0]["verdicts"]["a"] = "blocked"
            files["report.json"] = projection.wire(rep)

        self._reject(mutate, "oracle_mismatch")

    def test_relabelled_provenance_class(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            rep["write_anywhere"]["provenance"]["rows"][0]["authority_inputs"][0][
                "class"
            ] = "issuer"
            files["report.json"] = projection.wire(rep)

        self._reject(mutate, "provenance_mismatch")

    def test_inflated_kill_count(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            rep["write_anywhere"]["mutants"][0]["killed"] = False
            rep["write_anywhere"]["kill_count"] = 8
            files["report.json"] = projection.wire(rep)

        self._reject(mutate, "kill_count_mismatch")

    def test_edited_outage(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            rep["outage"]["no_outage_control"]["verdict"] = "blocked"
            files["report.json"] = projection.wire(rep)

        self._reject(mutate, "outage_mismatch")


if __name__ == "__main__":
    unittest.main()
