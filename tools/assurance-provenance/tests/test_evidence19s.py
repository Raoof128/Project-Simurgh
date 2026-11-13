"""Lane 19s evidence pack: build from scripted monitor outputs, verify, and refuse packs that
were changed. No model runs here."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19local as local  # noqa: E402
import evidence19s as ev  # noqa: E402
import monitor19s as m  # noqa: E402
import projection  # noqa: E402
from test_monitor19s import reads_state, scored  # noqa: E402


def rarely(row):
    return reads_state(row) if row["trial"] == 3 else "I cannot rate this."


BEHAVIOUR = {"qwen2.5-7b-4bit": reads_state, "qwen3-4b-4bit": rarely}


def write_inputs(root, behaviour=BEHAVIOUR):
    root = Path(root)
    (root / "transcripts").mkdir(parents=True)
    capture = {"host": {"machine": "test"}, "runtime": {}, "models": {}}
    sched = m.schedule(m.prompt())
    for spec in m.MONITORS:
        rows = [
            local.transcript_row(s, raw=behaviour[spec["id"]](s), truncated=False)
            for s in sched
        ]
        (root / "transcripts" / (spec["id"] + ".jsonl")).write_text(
            "".join(json.dumps(r, sort_keys=True) + "\n" for r in rows)
        )
        capture["models"][spec["id"]] = {
            "repo": spec["repo"],
            "revision": spec["revision"],
            "generations": len(rows),
        }
    (root / "capture.json").write_text(json.dumps(capture))
    return root


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19s-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19sTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19s-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.inputs = write_inputs(Path(cls.temp.name) / "in")
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(
            cls.out,
            transcripts=cls.inputs / "transcripts",
            capture=cls.inputs / "capture.json",
        )
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"

    def refused(self, change, reason):
        pack, root = repack(self.pack, change)
        with self.assertRaises(ValueError) as caught:
            ev.verify(pack, root, protocol=self.proto)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_run_writes_a_pack_that_verifies(self):
        c = self.receipt
        self.assertTrue(c["verified"])
        self.assertEqual(c["generations"], 2 * 192)
        self.assertEqual(c["usable"], ["qwen2.5-7b-4bit"])
        self.assertEqual(c["held_on"], {"M1": ["qwen2.5-7b-4bit"], "M2": [], "M3": []})
        good = c["models"]["qwen2.5-7b-4bit"]
        self.assertEqual(good["caught"], {"n": 96, "caught": 96})
        self.assertEqual(good["flagged_authorised"], 0)
        self.assertEqual(good["auroc"], 1.0)
        self.assertEqual(good["hypotheses"], {"M1": True, "M2": False, "M3": False})
        weak = c["models"]["qwen3-4b-4bit"]
        self.assertFalse(weak["usable"])
        self.assertIsNone(weak["hypotheses"])
        self.assertEqual(
            weak["outcomes"], {"scored": 48, "unscored": 144, "truncated": 0}
        )
        self.assertIs(c["gate_executed"], False)
        self.assertEqual(c["money_spent"], 0)
        again = ev.verify(self.pack, self.root, protocol=self.proto)
        self.assertEqual(
            {k: v for k, v in again.items() if k != "tree_state"},
            {k: v for k, v in c.items() if k != "tree_state"},
        )

    def test_the_pack_inventory_is_fixed(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
        self.assertEqual(
            names,
            {
                "report.json",
                "capture.json",
                "caught.json",
                "hypotheses.json",
                *(ev.member(i) for i in m.MONITOR_IDS),
            },
        )

        def extra(files):
            files["notes.txt"] = b"x"

        self.refused(extra, "pack_inventory")

    def test_a_changed_score_changes_the_report(self):
        def change(files):
            name = ev.member("qwen2.5-7b-4bit")
            rows = json.loads(files[name])
            rows[0]["raw"] = scored(1)
            files[name] = projection.wire(rows)

        self.refused(change, "report_mismatch")

    def test_a_row_moved_to_another_slot_is_refused(self):
        def change(files):
            name = ev.member("qwen2.5-7b-4bit")
            rows = json.loads(files[name])
            rows[10], rows[11] = rows[11], rows[10]
            files[name] = projection.wire(rows)

        self.refused(change, "transcript_binding")

    def test_a_changed_report_or_sidecar_is_refused(self):
        def report(files):
            saved = json.loads(files["report.json"])
            saved["held_on"]["M2"] = ["qwen2.5-7b-4bit"]
            files["report.json"] = projection.wire(saved)

        self.refused(report, "report_mismatch")

        def sidecar(files):
            files["caught.json"] = projection.wire({})

        self.refused(sidecar, "sidecar_member_mismatch")

        def binding(files):
            saved = json.loads(files["report.json"])
            saved["protocol_sha256"] = "0" * 64
            files["report.json"] = projection.wire(saved)

        self.refused(binding, "protocol_binding")

    def test_the_capture_record_must_name_the_declared_revisions(self):
        def change(files):
            meta = json.loads(files["capture.json"])
            meta["models"]["qwen3-4b-4bit"]["revision"] = "0" * 40
            files["capture.json"] = projection.wire(meta)

        self.refused(change, "capture_binding")

        def missing(files):
            meta = json.loads(files["capture.json"])
            del meta["models"]["qwen3-4b-4bit"]
            files["capture.json"] = projection.wire(meta)

        self.refused(missing, "capture_binding")

    def test_the_protocol_pins_the_monitor_prompt_its_licence_and_the_sources(self):
        proto = json.loads(self.proto.read_text())
        self.assertEqual(proto["prompt_sha256"], m.PROMPT_SHA256)
        self.assertEqual(proto["primary_model"], "qwen2.5-7b-4bit")
        for name in ev.PROMPT_FILES:
            self.assertIn(name, proto["sources"])
        self.assertIn("tools/assurance-provenance/monitor19s.py", proto["sources"])
        self.assertEqual(len(proto["sources"]), 13)

        def refused(change, reason):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19s-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)

        refused(lambda p: p.update(prompt_sha256="0" * 64), "protocol_inventory")
        refused(lambda p: p.update(schedule_digest="0" * 64), "protocol_inventory")
        refused(lambda p: p["settings"].update(fpr=0.5), "protocol_inventory")
        refused(lambda p: p["sources"].pop(ev.PROMPT_FILES[0]), "protocol_inventory")
        refused(
            lambda p: p["sources"].update({ev.PROMPT_FILES[0]: "0" * 64}),
            "source_binding",
        )

    def test_run_refuses_an_existing_directory_before_it_writes(self):
        before = (self.out / "report.json").read_bytes()
        (self.out / "report.json").write_bytes(b"{}")
        try:
            with self.assertRaises(FileExistsError):
                ev.run(
                    self.out,
                    transcripts=self.inputs / "transcripts",
                    capture=self.inputs / "capture.json",
                )
            self.assertEqual((self.out / "report.json").read_bytes(), b"{}")
        finally:
            (self.out / "report.json").write_bytes(before)

    def test_a_wrong_root_is_refused(self):
        with self.assertRaises(ValueError):
            ev.verify(self.pack, "0" * 64, protocol=self.proto)


if __name__ == "__main__":
    unittest.main()
