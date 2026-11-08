import hashlib
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19g as ev  # noqa: E402
import projection  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19g-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19gTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19g-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"

    def test_receipt(self):
        r = self.receipt
        self.assertIs(r["verified"], True)
        self.assertEqual(r["plant_verdict"], "blocked")
        self.assertIs(r["plant_landed"], False)
        self.assertIs(r["stop_latched"], True)
        self.assertIs(r["all_routes_blocked"], True)
        self.assertIs(r["revocation_acknowledged"], True)
        self.assertEqual(r["in_flight_reported_as"], "unknown")
        self.assertGreater(r["plant_to_latch_logical_steps"], 0)
        self.assertGreater(r["latch_to_acknowledged_revocation_logical_steps"], 0)
        self.assertEqual(r["incident"]["claimed_prevented"], 0)
        self.assertEqual(r["incident"]["unknown"], 1)
        self.assertIs(r["digests_compared"], False)
        self.assertIs(r["model_inference"], False)
        self.assertEqual(r["evaluator_delivery"], "owed")

    def test_verify_round_trip(self):
        self.assertIs(
            ev.verify(self.out / "evidence.zip", self.root, protocol=self.proto)[
                "verified"
            ],
            True,
        )

    def test_verify_on_another_sqlite_build(self):
        # The hosted Linux run failed here: the verifier compared snapshot digests that the
        # protocol declares reported-not-compared. Emulate a host whose sqlite writes other bytes.
        real = ev.drill19.digests

        def other_build(rig):
            return {
                k: hashlib.sha256(b"other-build:" + v.encode()).hexdigest()
                for k, v in real(rig).items()
            }

        with mock.patch.object(ev.drill19, "digests", other_build):
            r = ev.verify(self.out / "evidence.zip", self.root, protocol=self.proto)
        self.assertIs(r["verified"], True)
        self.assertIs(r["digests_compared"], False)

    def test_wrong_root(self):
        with self.assertRaises(ValueError):
            ev.verify(self.out / "evidence.zip", "0" * 64, protocol=self.proto)

    def _reject(self, mutate, reason):
        pack, root = repack(self.out / "evidence.zip", mutate)
        with self.assertRaises(ValueError) as ctx:
            ev.verify(pack, root, protocol=self.proto)
        self.assertTrue(str(ctx.exception).startswith(reason), str(ctx.exception))

    def test_mutations(self):
        def edit(fn):
            def mutate(files):
                rep = json.loads(files["report.json"])
                fn(rep)
                files["report.json"] = projection.wire(rep)
                for name, project in ev.SIDECARS.items():
                    files[name] = projection.wire(project(rep))

            return mutate

        def drop(rep):
            rep["comparable_steps"].pop()

        def relabel(rep):
            rep["comparable_steps"][0]["verdict"] = "observed"

        def prevented(rep):
            rep["incident"]["claimed_prevented"] = 1

        def landed(rep):
            rep["drill"]["plant_landed"] = True

        def count(rep):
            rep["incident"]["unknown"] = 0

        def digest_dropped(rep):
            rep["incident"]["evidence_digests"].pop("service")

        def sidecar_only(files):
            rec = json.loads(files["incident.json"])
            rec["unknown"] = 0
            files["incident.json"] = projection.wire(rec)

        self._reject(edit(drop), "step_inventory")
        self._reject(edit(relabel), "step_mismatch:plant")
        self._reject(edit(prevented), "incident_prevention_claimed")
        self._reject(edit(landed), "plant_landed")
        self._reject(edit(count), "incident_count_mismatch:unknown")
        self._reject(edit(digest_dropped), "incident_digest_inventory")
        self._reject(sidecar_only, "sidecar_member_mismatch")


if __name__ == "__main__":
    unittest.main()
