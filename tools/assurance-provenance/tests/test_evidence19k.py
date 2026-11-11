import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19local as local  # noqa: E402
import evidence19k as ev  # noqa: E402
import inject19k as k  # noqa: E402
import projection  # noqa: E402


def say(spec, name, **fields):
    if spec["wire"] == "hermes_tool_call":
        return (
            "<tool_call>\n"
            + json.dumps({"name": name, "arguments": fields})
            + "\n</tool_call>"
        )
    return json.dumps({"name": name, "parameters": fields})


def synthetic(spec):
    """Sends when authorised, and under an operator note outside the two firm states."""
    rows = []
    for s in k.schedule():
        send = s["block"] == "active_control" or (
            s["style"] == "operator_note"
            and s["state"] not in ("signal_stop", "credential_revoke")
            and (s["state"] == "unknown_prior" or s["trial"] < 2)
        )
        raw = (
            say(spec, "send_report", **s["expected"])
            if send
            else say(spec, "decline", reason="held")
        )
        rows.append(local.transcript_row(s, raw=raw, truncated=False, seconds=1.0))
    return rows


def inputs(directory):
    directory = Path(directory)
    (directory / "transcripts").mkdir(parents=True)
    meta = {"host": {"machine": "arm64"}, "runtime": {"mlx": "0"}, "models": {}}
    for spec in k.MODELS:
        (directory / "transcripts" / (spec["id"] + ".jsonl")).write_text(
            "".join(json.dumps(r, sort_keys=True) + "\n" for r in synthetic(spec))
        )
        meta["models"][spec["id"]] = {
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
    dst = Path(tempfile.mkdtemp(prefix="p19k-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19kTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19k-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        src = inputs(Path(cls.temp.name) / "in")
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(
            cls.out, transcripts=src / "transcripts", capture=src / "capture.json"
        )
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"
        cls.first = "transcript-" + k.MODELS[0]["id"] + ".json"

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
        self.assertEqual(r["generations"], 864 * 3)
        self.assertEqual(r["primary_model"], "qwen3-4b-4bit")
        self.assertEqual(sorted(r["models"]), sorted(m["id"] for m in k.MODELS))
        self.assertEqual(sorted(r["hypotheses"]), ["H1", "H2", "H3", "H4", "H5"])
        self.assertIs(r["hypotheses"]["H1"], True)
        self.assertIs(r["hypotheses"]["H2"], True)
        self.assertIs(r["hypotheses"]["H3"], True)
        self.assertIs(r["hypotheses"]["H4"], True)
        self.assertIs(
            r["hypotheses"]["H5"], False
        )  # urgency ties the other unmoved styles
        m = r["models"]["qwen3-4b-4bit"]
        self.assertEqual(
            m["active_control"], {"n": 24, "calls": 24, "exact": 24, "attempted": 24}
        )
        self.assertEqual(m["styles"]["operator_note"]["sent"], 20 + 3 * 10)
        self.assertEqual(m["styles"]["control"], {"n": 120, "sent": 0, "rate": 0.0})

    def test_verify_again_and_wrong_root(self):
        again = ev.verify(self.pack, self.root, protocol=self.proto)
        self.assertEqual(again["hypotheses"], self.receipt["hypotheses"])
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, "0" * 64, protocol=self.proto)
        self.assertEqual(str(caught.exception), "manifest_root")

    def test_an_edited_output_changes_the_report(self):
        def mutate(files):
            rows = json.loads(files[self.first])
            spec = k.MODELS[0]
            rows[100]["raw"] = say(spec, "send_report", resource="inbox", content="x")
            files[self.first] = projection.wire(rows)

        self.check(mutate, "report_mismatch")

    def test_an_edited_hypothesis_or_number_is_caught(self):
        def hypothesis(files):
            report = json.loads(files["report.json"])
            report["hypotheses"]["H5"]["supported"] = True
            files["report.json"] = projection.wire(report)

        def number(files):
            report = json.loads(files["report.json"])
            report["models"][0]["analysis"]["styles"]["urgency"]["sent"] = 50
            files["report.json"] = projection.wire(report)

        def text(files):
            report = json.loads(files["report.json"])
            report["cases"][3]["source"] = "something milder"
            files["report.json"] = projection.wire(report)

        self.check(hypothesis, "report_mismatch")
        self.check(number, "report_mismatch")
        self.check(text, "report_mismatch")

    def test_inventory_and_binding(self):
        self.check(lambda files: files.pop(self.first), "pack_inventory")

        def drop(files):
            files[self.first] = projection.wire(json.loads(files[self.first])[:-1])

        self.check(drop, "transcript_inventory")

        def revision(files):
            meta = json.loads(files["capture.json"])
            meta["models"][k.MODELS[1]["id"]]["revision"] = "f" * 40
            files["capture.json"] = projection.wire(meta)

        self.check(revision, "capture_binding")
        self.check(
            lambda files: files.update({"hypotheses.json": projection.wire({})}),
            "sidecar_member_mismatch",
        )

    def test_protocol_binds_cases_models_primary_and_sources(self):
        p = json.loads(self.proto.read_text())
        self.assertEqual(p["styles"], list(k.STYLES))
        self.assertEqual(p["primary_model"], "qwen3-4b-4bit")
        self.assertEqual([m["id"] for m in p["models"]], [m["id"] for m in k.MODELS])
        self.assertEqual(p["settings"]["seed_base"], k.SEED_BASE)
        for name in (
            "inject19k.py",
            "inject19.py",
            "capture19local.py",
            "evidence19k.py",
        ):
            self.assertIn("tools/assurance-provenance/" + name, p["sources"])
        for key, value in (
            ("cases_sha256", "0" * 64),
            ("primary_model", "llama-3.2-3b-4bit"),
        ):
            bad = Path(tempfile.mkdtemp(prefix="p19k-proto-")) / "protocol.json"
            q = dict(p, **{key: value})
            bad.write_bytes(projection.wire(q))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=bad)
            self.assertEqual(str(caught.exception), "protocol_inventory", key)


if __name__ == "__main__":
    unittest.main()
