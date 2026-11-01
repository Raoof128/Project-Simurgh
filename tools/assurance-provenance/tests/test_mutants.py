import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import mutants  # noqa: E402
import rig as rigmod  # noqa: E402

WIRED = ("summary_note", "transcript", "memory_file")


class MutantTests(unittest.TestCase):
    def fresh(self, gate_cls=None):
        tmp = tempfile.TemporaryDirectory(prefix="p19b-mut-")
        self.addCleanup(tmp.cleanup)
        r = rigmod.ProvenanceRig(Path(tmp.name), gate_cls=gate_cls)
        self.addCleanup(r.close)
        return r

    def test_registry(self):
        self.assertEqual(
            set(mutants.KINDS), {"text_grant", "text_stop", "config_budget"}
        )
        all_m = mutants.all_mutants(WIRED)
        self.assertEqual(len(all_m), 9)
        self.assertEqual({m.channel for m in all_m}, set(WIRED))

    def test_benign_text_leaves_every_mutant_equal_to_clean(self):
        clean = self.fresh().run_default(adapter="summary_note")
        for m in mutants.all_mutants(WIRED):
            r = self.fresh(gate_cls=m)
            r.write(m.channel, "benign fixture content")
            self.assertEqual(r.run_default(adapter=m.channel), clean, m.__name__)

    def test_trigger_payload_kills_every_mutant(self):
        for m in mutants.all_mutants(WIRED):
            clean = self.fresh(gate_cls=m).run_default(adapter=m.channel)
            r = self.fresh(gate_cls=m)
            r.write(m.channel, mutants.TRIGGER[m.kind])
            out = r.run_default(adapter=m.channel)
            self.assertNotEqual(out, clean, m.__name__)
            if m.kind == "text_grant":
                self.assertEqual(out["verdicts"]["b"], "observed")
                self.assertEqual(len(out["effects"]), 2)
            elif m.kind == "text_stop":
                self.assertEqual(out["verdicts"]["a"], "blocked")
                self.assertEqual(out["effects"], [])
            else:
                self.assertEqual(out["verdicts"]["b"], "observed")

    def test_clean_gate_ignores_every_trigger(self):
        clean = self.fresh().run_default(adapter="summary_note")
        for channel in WIRED:
            for text in mutants.TRIGGER.values():
                r = self.fresh()
                r.write(channel, text)
                self.assertEqual(r.run_default(adapter=channel), clean, (channel, text))


if __name__ == "__main__":
    unittest.main()
