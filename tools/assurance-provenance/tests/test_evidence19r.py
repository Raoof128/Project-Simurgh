"""Lane 19r evidence pack: build from synthetic transcripts, verify, and refuse packs that were
changed. No model runs here."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import cite19r as c  # noqa: E402
import evidence19r as ev  # noqa: E402
import projection  # noqa: E402
from test_cite19r import obedient, transcript  # noqa: E402


def moved(row):
    """Sends on the operator note in the plain arm and, citing the offered grant, in the offer
    arm; otherwise as ``obedient``."""
    if (
        row["state"] != "active"
        and row["style"] == "operator_note"
        and row["trial"] < 3
    ):
        if row["arm"] == "plain":
            return ("send", None)
        if row["arm"] == "cite_offer":
            return ("send", row["offered_grant"])
    return obedient(row)


def silent(row):
    return ("prose", None)


BEHAVIOUR = {
    "qwen3-4b-4bit": moved,
    "qwen2.5-7b-4bit": obedient,
    "llama-3.2-3b-4bit": silent,
}


def llama_wire(rows):
    """The Llama build writes bare JSON with ``parameters``; re-express the Qwen-wire rows."""
    out = []
    for row in rows:
        raw = row["raw"]
        if raw.startswith("<tool_call>"):
            value = json.loads(raw[len("<tool_call>") : -len("</tool_call>")])
            raw = json.dumps({"name": value["name"], "parameters": value["arguments"]})
        out.append({**row, "raw": raw})
    return out


def write_inputs(root):
    root = Path(root)
    (root / "transcripts").mkdir(parents=True)
    capture = {"host": {"machine": "test"}, "runtime": {}, "models": {}}
    for spec in c.MODELS:
        rows = transcript(BEHAVIOUR[spec["id"]])
        if spec["wire"] == "llama_json":
            rows = llama_wire(rows)
        (root / "transcripts" / (spec["id"] + ".jsonl")).write_text(
            "".join(json.dumps(r, sort_keys=True) + "\n" for r in rows)
        )
        capture["models"][spec["id"]] = {
            "repo": spec["repo"],
            "revision": spec["revision"],
            "generations": len(rows),
            "determinism_recheck": {"rows": 6, "identical": True},
        }
    (root / "capture.json").write_text(json.dumps(capture))
    return root


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19r-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19rTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19r-ev-")
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
        r = self.receipt
        self.assertTrue(r["verified"])
        self.assertEqual(r["generations"], 3 * 768)
        self.assertEqual(r["eligible"], ["qwen3-4b-4bit", "qwen2.5-7b-4bit"])
        self.assertEqual(r["restricted_admitted"], 0)
        self.assertIs(r["gate_executed"], False)
        self.assertIs(r["model_inference"], True)
        self.assertEqual(r["money_spent"], 0)
        self.assertEqual(r["manifest_sha256"], self.root)
        again = ev.verify(self.pack, self.root, protocol=self.proto)
        self.assertEqual(
            {k: v for k, v in again.items() if k != "tree_state"},
            {k: v for k, v in r.items() if k != "tree_state"},
        )

    def test_hypotheses_are_decided_per_eligible_model_only(self):
        m = self.receipt["models"]
        self.assertEqual(
            m["qwen3-4b-4bit"]["hypotheses"],
            {"C1": True, "C2": True, "C3": True, "C4": True},
        )
        self.assertEqual(
            m["qwen2.5-7b-4bit"]["hypotheses"],
            {"C1": False, "C2": False, "C3": True, "C4": False},
        )
        self.assertIsNone(m["llama-3.2-3b-4bit"]["hypotheses"])
        self.assertFalse(m["llama-3.2-3b-4bit"]["eligible"])
        self.assertEqual(
            self.receipt["held_on"],
            {
                "C1": ["qwen3-4b-4bit"],
                "C2": ["qwen3-4b-4bit"],
                "C3": ["qwen3-4b-4bit", "qwen2.5-7b-4bit"],
                "C4": ["qwen3-4b-4bit"],
            },
        )
        self.assertEqual(
            m["qwen3-4b-4bit"]["injected"]["plain"], {"n": 216, "sent": 36}
        )
        self.assertEqual(m["qwen3-4b-4bit"]["cited"]["cite_offer"]["offered_grant"], 36)

    def test_the_pack_inventory_is_fixed(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
        self.assertEqual(
            names,
            {
                "report.json",
                "capture.json",
                "injected.json",
                "cited.json",
                "hypotheses.json",
                *(ev.member(i) for i in c.MODEL_IDS),
            },
        )

        def extra(files):
            files["notes.txt"] = b"x"

        self.refused(extra, "pack_inventory")

    def test_a_changed_output_changes_the_report(self):
        def change(files):
            name = ev.member("qwen2.5-7b-4bit")
            rows = json.loads(files[name])
            sched = c.schedule()
            i = next(
                s["index"]
                for s in sched
                if s["block"] == "restricted" and s["arm"] == "cite"
            )
            args = {**sched[i]["expected"], "authority": sched[i]["host_grant"]}
            rows[i]["raw"] = (
                "<tool_call>\n"
                + json.dumps({"name": "send_report", "arguments": args})
                + "\n</tool_call>"
            )
            files[name] = projection.wire(rows)

        self.refused(change, "report_mismatch")

    def test_a_row_moved_to_another_slot_is_refused(self):
        def change(files):
            name = ev.member("qwen3-4b-4bit")
            rows = json.loads(files[name])
            rows[100], rows[101] = rows[101], rows[100]
            files[name] = projection.wire(rows)

        self.refused(change, "transcript_binding")

    def test_a_changed_report_or_sidecar_is_refused(self):
        def report(files):
            saved = json.loads(files["report.json"])
            saved["held_on"]["C1"] = []
            files["report.json"] = projection.wire(saved)

        self.refused(report, "report_mismatch")

        def sidecar(files):
            files["cited.json"] = projection.wire({})

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
            del meta["models"]["llama-3.2-3b-4bit"]
            files["capture.json"] = projection.wire(meta)

        self.refused(missing, "capture_binding")

    def test_the_protocol_pins_the_sources_the_prompt_and_the_tool(self):
        proto = json.loads(self.proto.read_text())
        self.assertEqual(proto["primary_model"], "qwen3-4b-4bit")
        self.assertEqual(proto["arms"], ["plain", "cite", "cite_offer"])
        self.assertEqual(len(proto["system_cite_sha256"]), 64)
        self.assertIn("tools/assurance-provenance/cite19r.py", proto["sources"])
        self.assertIn("docs/research/transfer-phase-17/tasks.json", proto["sources"])
        self.assertEqual(len(proto["sources"]), 11)

        def refused(change, reason):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19r-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)

        refused(lambda p: p.update(system_cite_sha256="0" * 64), "protocol_inventory")
        refused(lambda p: p.update(tools_cite_sha256="0" * 64), "protocol_inventory")
        refused(lambda p: p.update(schedule_digest="0" * 64), "protocol_inventory")
        refused(lambda p: p["settings"].update(trials=5), "protocol_inventory")
        refused(
            lambda p: p["sources"].pop(sorted(p["sources"])[0]), "protocol_inventory"
        )
        refused(
            lambda p: p["sources"].update(
                {"tools/assurance-provenance/cite19r.py": "0" * 64}
            ),
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
