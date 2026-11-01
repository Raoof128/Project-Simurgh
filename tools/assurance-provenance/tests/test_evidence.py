import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence  # noqa: E402
import projection  # noqa: E402

OUTPUTS = {
    "protocol.json",
    "report.json",
    "evidence.zip",
    "ROOT.sha256",
    "receipt.json",
}


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19a-mut-")) / "evidence.zip"
    root = projection.write_pack(dst, files)
    return dst, root


class EvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19a-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = evidence.run(cls.out, replay=False)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()

    def test_run_writes_outputs(self):
        self.assertTrue(OUTPUTS <= {p.name for p in self.out.iterdir()})
        self.assertIs(self.receipt["verified"], True)
        self.assertEqual(self.receipt["kind"], "hash_bound_projection")
        self.assertEqual(self.receipt["replay"]["result"], "not_run")
        self.assertEqual(self.receipt["generations"], 96)
        self.assertEqual(self.receipt["branches"], 288)
        self.assertIs(self.receipt["independent_custody"], False)
        self.assertIs(self.receipt["model_inference"], False)
        # Either the lane sources are uncommitted, or the receipt names their commit. The first
        # version asserted "uncommitted" alone and failed on committed bytes (e2e of 1 Nov 2026).
        self.assertRegex(self.receipt["tree_state"], r"^(uncommitted|[0-9a-f]{40})$")

    def test_verify_round_trip(self):
        got = evidence.verify(
            self.out / "evidence.zip", self.root, protocol=self.out / "protocol.json"
        )
        self.assertIs(got["verified"], True)
        self.assertEqual(got["archive_root"], projection.P17_ROOT())

    def test_wrong_root(self):
        with self.assertRaises(ValueError) as ctx:
            evidence.verify(
                self.out / "evidence.zip", "0" * 64, protocol=self.out / "protocol.json"
            )
        self.assertEqual(str(ctx.exception), "manifest_root")

    def _mutant(self, mutate):
        return repack(self.out / "evidence.zip", mutate)

    def test_dropped_split_row_is_row_inventory(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            rep["split"]["luna"]["rows"].pop()
            files["report.json"] = projection.wire(rep)

        pack, root = self._mutant(mutate)
        with self.assertRaises(ValueError) as ctx:
            evidence.verify(pack, root, protocol=self.out / "protocol.json")
        self.assertEqual(str(ctx.exception), "row_inventory")

    def test_relabelled_split_is_split_mismatch(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            row = rep["split"]["llama"]["rows"][0]
            row["split"] = (
                "refused_by_model" if row["split"] != "refused_by_model" else "other"
            )
            files["report.json"] = projection.wire(rep)

        pack, root = self._mutant(mutate)
        with self.assertRaises(ValueError) as ctx:
            evidence.verify(pack, root, protocol=self.out / "protocol.json")
        self.assertEqual(str(ctx.exception), "split_mismatch")

    def test_inflated_coverage_is_coverage_mismatch(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            rep["coverage"]["luna"]["composed"]["new"]["record_observed"] += 1
            files["report.json"] = projection.wire(rep)

        pack, root = self._mutant(mutate)
        with self.assertRaises(ValueError) as ctx:
            evidence.verify(pack, root, protocol=self.out / "protocol.json")
        self.assertEqual(str(ctx.exception), "coverage_mismatch")

    def test_edited_sidecar_is_sidecar_mismatch(self):
        def mutate(files):
            rep = json.loads(files["report.json"])
            rep["awareness"]["luna"]["flagged"] = 3
            files["report.json"] = projection.wire(rep)

        pack, root = self._mutant(mutate)
        with self.assertRaises(ValueError) as ctx:
            evidence.verify(pack, root, protocol=self.out / "protocol.json")
        self.assertEqual(str(ctx.exception), "sidecar_mismatch")

    def test_protocol_source_edit_is_source_binding(self):
        proto = json.loads((self.out / "protocol.json").read_text())
        name = next(n for n in proto["sources"] if n.endswith("tasks.json"))
        proto["sources"][name] = "0" * 64
        bad = Path(self.temp.name) / "protocol-bad.json"
        bad.write_bytes(projection.wire(proto))
        with self.assertRaises(ValueError) as ctx:
            evidence.verify(self.out / "evidence.zip", self.root, protocol=bad)
        self.assertTrue(str(ctx.exception).startswith("source_binding:"))

    def test_run_refuses_existing_directory(self):
        with self.assertRaises(FileExistsError):
            evidence.run(self.out, replay=False)


if __name__ == "__main__":
    unittest.main()
