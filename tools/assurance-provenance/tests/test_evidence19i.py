import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19local as local  # noqa: E402
import evidence19i as ev  # noqa: E402
import inject19  # noqa: E402
import projection  # noqa: E402


def say(spec, name, **fields):
    if spec["wire"] == "hermes_tool_call":
        return (
            "<tool_call>\n"
            + json.dumps({"name": name, "arguments": fields})
            + "\n</tool_call>"
        )
    return json.dumps({"name": name, "parameters": fields})


def synthetic(spec, moved=("self_clearing",)):
    rows = []
    for s in inject19.schedule():
        raw = (
            say(spec, "send_report", **s["expected"])
            if s["style"] in moved
            else say(spec, "decline", reason="held")
        )
        rows.append(local.transcript_row(s, raw=raw, truncated=False, seconds=1.0))
    return rows


def inputs(directory):
    directory = Path(directory)
    (directory / "transcripts").mkdir(parents=True)
    meta = {"host": {"machine": "arm64"}, "runtime": {"mlx": "0"}, "models": {}}
    for model_id in inject19.MODEL_IDS:
        spec = local.model(model_id)
        (directory / "transcripts" / (model_id + ".jsonl")).write_text(
            "".join(json.dumps(r, sort_keys=True) + "\n" for r in synthetic(spec))
        )
        meta["models"][model_id] = {
            "repo": spec["repo"],
            "revision": spec["revision"],
            "files": {},
        }
    (directory / "capture.json").write_text(json.dumps(meta))
    return directory


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19i-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19iTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19i-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        src = inputs(Path(cls.temp.name) / "in")
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(
            cls.out, transcripts=src / "transcripts", capture=src / "capture.json"
        )
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"
        cls.first = "transcript-" + inject19.MODEL_IDS[0] + ".json"

    def check(self, mutate, reason):
        dst, root = repack(self.pack, mutate)
        with self.assertRaises(ValueError) as caught:
            ev.verify(dst, root, protocol=self.proto)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_receipt(self):
        r = self.receipt
        self.assertIs(r["verified"], True)
        self.assertIs(r["model_inference"], True)
        self.assertIs(r["gate_executed"], False)
        self.assertEqual(r["money_spent"], 0)
        self.assertEqual(r["generations"], 168 * len(inject19.MODEL_IDS))
        self.assertEqual(sorted(r["models"]), sorted(inject19.MODEL_IDS))
        for m in r["models"].values():
            self.assertEqual(
                m["styles"]["self_clearing"], {"n": 24, "sent": 24, "rate": 1.0}
            )
            self.assertEqual(m["styles"]["control"], {"n": 24, "sent": 0, "rate": 0.0})
            self.assertEqual(m["sent_exact"], 24)

    def test_verify_again_and_wrong_root(self):
        self.assertEqual(
            ev.verify(self.pack, self.root, protocol=self.proto)["models"],
            self.receipt["models"],
        )
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, "0" * 64, protocol=self.proto)
        self.assertEqual(str(caught.exception), "manifest_root")

    def test_an_edited_output_changes_the_report(self):
        def mutate(files):
            rows = json.loads(files[self.first])
            spec = local.model(inject19.MODEL_IDS[0])
            rows[0]["raw"] = say(spec, "send_report", resource="inbox", content="x")
            files[self.first] = projection.wire(rows)

        self.check(mutate, "report_mismatch")

    def test_an_edited_number_or_case_text_is_caught(self):
        def number(files):
            report = json.loads(files["report.json"])
            report["models"][0]["analysis"]["styles"]["self_clearing"]["sent"] = 0
            files["report.json"] = projection.wire(report)

        def text(files):
            report = json.loads(files["report.json"])
            report["cases"][0]["source"] = "something milder"
            files["report.json"] = projection.wire(report)

        self.check(number, "report_mismatch")
        self.check(text, "report_mismatch")

    def test_inventory_and_binding(self):
        self.check(lambda files: files.pop(self.first), "pack_inventory")

        def drop(files):
            files[self.first] = projection.wire(json.loads(files[self.first])[:-1])

        self.check(drop, "transcript_inventory")

        def revision(files):
            meta = json.loads(files["capture.json"])
            meta["models"][inject19.MODEL_IDS[0]]["revision"] = "f" * 40
            files["capture.json"] = projection.wire(meta)

        self.check(revision, "capture_binding")
        self.check(
            lambda files: files.update({"styles.json": projection.wire({})}),
            "sidecar_member_mismatch",
        )

    def test_protocol_binds_the_cases_the_models_and_the_sources(self):
        p = json.loads(self.proto.read_text())
        self.assertEqual(p["styles"], list(inject19.STYLES))
        self.assertEqual([m["id"] for m in p["models"]], list(inject19.MODEL_IDS))
        self.assertEqual(p["settings"]["seed_base"], inject19.SEED_BASE)
        for name in ("inject19.py", "capture19local.py", "evidence19i.py"):
            self.assertIn("tools/assurance-provenance/" + name, p["sources"])
        bad = Path(tempfile.mkdtemp(prefix="p19i-proto-")) / "protocol.json"
        p["cases_sha256"] = "0" * 64
        bad.write_bytes(projection.wire(p))
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, self.root, protocol=bad)
        self.assertEqual(str(caught.exception), "protocol_inventory")


if __name__ == "__main__":
    unittest.main()
