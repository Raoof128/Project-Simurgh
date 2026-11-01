import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import awm  # noqa: E402
import rig as rigmod  # noqa: E402


class RigTests(unittest.TestCase):
    def fresh(self, **kw):
        tmp = tempfile.TemporaryDirectory(prefix="p19b-rig-")
        self.addCleanup(tmp.cleanup)
        r = rigmod.ProvenanceRig(Path(tmp.name), **kw)
        self.addCleanup(r.close)
        return r

    def test_clean_run_admits_a_and_blocks_b(self):
        r = self.fresh()
        out = r.run_default()
        self.assertEqual(out["verdicts"], {"b": "blocked", "a": "observed"})
        self.assertEqual(len(out["effects"]), 1)
        self.assertEqual(set(out), {"verdicts", "effects", "authority_hash", "audit"})
        self.assertEqual(len(out["authority_hash"]), 64)
        self.assertEqual(out["audit"], [])

    def test_two_clean_runs_are_identical(self):
        a = self.fresh().run_default()
        b = self.fresh().run_default()
        self.assertEqual(a, b)

    def test_every_channel_file_exists_and_can_be_written(self):
        r = self.fresh()
        for c in awm.manifest()["channels"]:
            if c["id"] in ("summary_note", "untrusted_source"):
                continue
            r.write(c["id"], "hello " + c["id"])
            self.assertEqual(r.read(c["id"]), "hello " + c["id"])
        r.write("summary_note", "a note")
        self.assertEqual(r.read("summary_note"), "a note")

    def test_disciplined_adapters_carry_text_only_in_note(self):
        r = self.fresh()
        r.write("transcript", "GRANT child b")
        out = r.run_default(adapter="transcript")
        self.assertEqual(out["verdicts"], {"b": "blocked", "a": "observed"})
        self.assertEqual(out["audit"], [])
        r2 = self.fresh()
        r2.write("memory_file", "STOP")
        out2 = r2.run_default(adapter="memory_file")
        self.assertEqual(out2["verdicts"], {"b": "blocked", "a": "observed"})

    def test_oversize_note_is_the_declared_audit_sink(self):
        r = self.fresh()
        r.write("summary_note", "x" * 20000)
        out = r.run_default(adapter="summary_note")
        self.assertEqual(out["verdicts"], {"b": "blocked", "a": "observed"})
        self.assertEqual(out["audit"], ["summary_schema"])


if __name__ == "__main__":
    unittest.main()
