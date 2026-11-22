"""Lane 19z seal, on the real gate: a write to a store or to the bound script latches the
sealed gate, the host's own operations do not, and each test shows what the open gate does."""

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import repair19y  # noqa: E402
import seal19z  # noqa: E402

GRANT_B = """UPDATE grants SET actions='["a","b"]' WHERE actor='child'"""
BASELINE = {"b": "blocked", "a": "observed"}


class Base(unittest.TestCase):
    def rig(self, cls=seal19z.Rig):
        tmp = tempfile.TemporaryDirectory(prefix="p19z-")
        self.addCleanup(tmp.cleanup)
        r = cls(Path(tmp.name) / "rig")
        self.addCleanup(r.close)
        return r

    def sql(self, r, store, text):
        with sqlite3.connect(Path(r.pipe.directory) / store) as db:
            db.executescript(text)

    def both(self, r):
        r.dispatch("b")
        r.dispatch("a")
        return dict(r.verdicts), len(r.effects())


class SealTests(Base):
    def test_an_untouched_sealed_gate_behaves_as_the_open_one(self):
        for cls in (seal19z.FileRig, seal19z.Rig):
            r = self.rig(cls)
            self.assertEqual(self.both(r), (BASELINE, 1))
            self.assertEqual(r.latched(), [])
            self.assertIs(r.script_changed(), False)
        self.assertIs(type(self.rig().pipe), seal19z.Pipeline)
        self.assertIsInstance(self.rig().pipe, repair19y.Pipeline)

    def test_a_grant_written_into_the_store_is_honoured_by_the_open_gate(self):
        r = self.rig(seal19z.FileRig)
        self.sql(r, "context.sqlite", GRANT_B)
        verdicts, effects = self.both(r)
        self.assertEqual(verdicts["b"], "observed")
        self.assertEqual(effects, 1)

    def test_the_same_write_latches_the_sealed_gate(self):
        r = self.rig()
        self.sql(r, "context.sqlite", GRANT_B)
        self.assertEqual(self.both(r), ({"b": "blocked", "a": "blocked"}, 0))
        self.assertEqual(r.latched(), ["context.sqlite"])
        self.assertEqual(r.pipe.changed, ["context.sqlite"])

    def test_every_store_is_under_the_seal(self):
        names = seal19z.stores(self.rig().pipe.directory)
        self.assertEqual(len(names), 9)
        for name in names:
            r = self.rig()
            with sqlite3.connect(Path(r.pipe.directory) / name) as db:
                db.execute("CREATE TABLE planted(x)")
            self.assertEqual(self.both(r)[0], {"b": "blocked", "a": "blocked"}, name)
            self.assertEqual(r.latched(), [name])

    def test_a_deleted_or_added_store_latches_without_raising(self):
        r = self.rig()
        (Path(r.pipe.directory) / "context.sqlite").unlink()
        self.assertEqual(self.both(r), ({"b": "blocked", "a": "blocked"}, 0))
        self.assertEqual(r.latched(), ["context.sqlite"])
        r = self.rig()
        (Path(r.pipe.directory) / "extra.sqlite").write_bytes(b"x")
        self.assertEqual(self.both(r)[0], {"b": "blocked", "a": "blocked"})
        self.assertEqual(r.latched(), ["extra.sqlite"])

    def test_the_script_is_bound(self):
        text = "#!/bin/sh\necho changed\n"
        opened = self.rig(seal19z.FileRig)
        opened.script.write_text(text)
        self.assertEqual(self.both(opened), (BASELINE, 1))
        self.assertIs(opened.script_changed(), True)
        r = self.rig()
        r.script.write_text(text)
        self.assertEqual(self.both(r), ({"b": "blocked", "a": "blocked"}, 0))
        self.assertEqual([n.rsplit("/", 1)[-1] for n in r.latched()], ["run.sh"])
        same = self.rig()
        same.script.write_bytes(seal19z.SCRIPT_TEXT.encode())
        self.assertEqual(self.both(same), (BASELINE, 1))
        self.assertEqual(same.latched(), [])

    def test_a_latched_gate_stays_latched_after_the_change_is_undone(self):
        r = self.rig()
        before = (Path(r.pipe.directory) / "pipeline.sqlite").read_bytes()
        self.sql(r, "pipeline.sqlite", "UPDATE state SET held=1")
        self.assertIs(r.pipe.intact(), False)
        (Path(r.pipe.directory) / "pipeline.sqlite").write_bytes(before)
        self.assertIs(r.pipe.intact(), False)
        self.assertEqual(self.both(r)[0], {"b": "blocked", "a": "blocked"})
        with self.assertRaises(ValueError):
            r.pipe.update(lambda: None)
        with self.assertRaises(ValueError):
            r.mint("b", approver_id="operator-1", nonce="n1")

    def test_the_hosts_own_operations_do_not_latch(self):
        r = self.rig()
        token = r.mint("b", approver_id="operator-1", nonce="n1")
        self.assertEqual(r.dispatch("b", approval=token), "observed")
        # a spent token is refused and the ordinary grant check decides; that is not a latch
        self.assertEqual(r.dispatch("b", approval=token), "blocked")
        # the fixture's budget is one attempt, and the approved b used it
        self.assertEqual(r.dispatch("a"), "blocked")
        self.assertEqual(len(r.effects()), 1)
        r.pipe.update(lambda: None)
        self.assertIs(r.pipe.intact(), True)
        self.assertEqual(r.latched(), [])

    def test_two_dispatches_and_a_read_only_look_do_not_latch(self):
        r = self.rig()
        with sqlite3.connect(Path(r.pipe.directory) / "context.sqlite") as db:
            db.execute("SELECT count(*) FROM grants").fetchone()
        self.assertEqual(self.both(r), (BASELINE, 1))
        self.assertEqual(r.dispatch("a"), "observed")
        self.assertEqual(r.latched(), [])

    def test_before_the_seal_is_armed_the_pipeline_is_the_repaired_gate(self):
        tmp = tempfile.TemporaryDirectory(prefix="p19z-")
        self.addCleanup(tmp.cleanup)
        r = seal19z.FileRig(Path(tmp.name) / "rig", gate_cls=seal19z.Pipeline)
        self.addCleanup(r.close)
        self.sql(r, "context.sqlite", GRANT_B)
        self.assertEqual(self.both(r)[0]["b"], "observed")
        self.assertEqual(r.latched(), [])

    def test_snapshot_and_difference(self):
        r = self.rig()
        d = r.pipe.directory
        one = seal19z.snapshot(d, [r.script])
        self.assertEqual(len(one), 10)
        self.assertEqual(seal19z.difference(one, one), [])
        r.script.unlink()
        two = seal19z.snapshot(d, [r.script])
        self.assertEqual(two["bound:" + str(r.script)], "absent")
        self.assertEqual(seal19z.difference(one, two), ["bound:" + str(r.script)])
        self.assertEqual(seal19z.file_digest(Path(d) / "missing"), "absent")


if __name__ == "__main__":
    unittest.main()
