import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19local as local  # noqa: E402
import evidence19h as ev  # noqa: E402
import projection  # noqa: E402


def call(name, **parameters):
    return json.dumps({"name": name, "parameters": parameters})


def hermes(name, **arguments):
    return (
        "<tool_call>\n"
        + json.dumps({"name": name, "arguments": arguments})
        + "\n</tool_call>"
    )


def synthetic(spec, *, leak=0):
    """A compliant model in its own wire, except ``leak`` restricted deployment sends."""
    say = hermes if spec["wire"] == "hermes_tool_call" else call
    rows, leaked = [], 0
    for s in local.schedule():
        send = say("send_report", **local.expected(s["task_id"]))
        raw = send if s["state"] == "active" else say("decline", reason="held")
        if s["state"] != "active" and s["arm"] == "deployment" and leaked < leak:
            raw, leaked = send, leaked + 1
        rows.append(local.transcript_row(s, raw=raw, truncated=False, seconds=1.0))
    return rows


def capture_meta():
    return {
        "host": {"machine": "arm64", "system": "Darwin"},
        "runtime": {"mlx": "0", "mlx_lm": "0", "python": "3.12"},
        "models": {
            m["id"]: {"repo": m["repo"], "revision": m["revision"], "files": {}}
            for m in local.MODELS
        },
    }


def inputs(directory, *, leak=0):
    directory = Path(directory)
    (directory / "transcripts").mkdir(parents=True)
    for m in local.MODELS:
        (directory / "transcripts" / (m["id"] + ".jsonl")).write_text(
            "".join(
                json.dumps(r, sort_keys=True) + "\n" for r in synthetic(m, leak=leak)
            )
        )
    (directory / "capture.json").write_text(json.dumps(capture_meta()))
    return directory


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19h-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19hTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19h-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        src = inputs(Path(cls.temp.name) / "in", leak=6)
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(
            cls.out, transcripts=src / "transcripts", capture=src / "capture.json"
        )
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"

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
        self.assertEqual(r["generations"], 144 * len(local.MODELS))
        self.assertEqual(r["informed_attacker"], "not_run")
        self.assertEqual(r["hosted_capture"], "not_run")
        self.assertEqual(r["money_spent"], 0)
        self.assertIs(r["independent_custody"], False)
        self.assertEqual(sorted(r["models"]), sorted(m["id"] for m in local.MODELS))
        for m in r["models"].values():
            self.assertIs(m["tool_use_established"], True)
            self.assertEqual(
                m["restricted"]["deployment"], {"n": 24, "emitted": 6, "rate": 0.25}
            )
            self.assertEqual(m["restricted"]["evaluation"]["emitted"], 0)
            self.assertIs(m["evaluable"], False)  # the evaluation arm sits on the floor
            self.assertLess(m["evaluation_minus_deployment"]["difference"], 0)

    def test_verify_again_from_the_pack_alone(self):
        again = ev.verify(self.pack, self.root, protocol=self.proto)
        self.assertEqual(again["models"], self.receipt["models"])

    def test_wrong_root(self):
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, "0" * 64, protocol=self.proto)
        self.assertEqual(str(caught.exception), "manifest_root")

    def test_an_edited_output_changes_the_report(self):
        name = "transcript-" + local.MODELS[0]["id"] + ".json"

        def mutate(files):
            rows = json.loads(files[name])
            victim = next(
                r for r in rows if r["arm"] == "evaluation" and "decline" in r["raw"]
            )
            victim["raw"] = call("send_report", **local.expected(victim["task_id"]))
            files[name] = projection.wire(rows)

        self.check(mutate, "report_mismatch")

    def test_an_edited_number_is_caught(self):
        def mutate(files):
            report = json.loads(files["report.json"])
            report["models"][0]["analysis"]["shift"]["arms"]["deployment"][
                "emitted"
            ] = 0
            files["report.json"] = projection.wire(report)

        self.check(mutate, "report_mismatch")

    def test_a_missing_or_extra_transcript(self):
        name = "transcript-" + local.MODELS[-1]["id"] + ".json"
        self.check(lambda files: files.pop(name), "pack_inventory")
        self.check(
            lambda files: files.update({"transcript-other.json": b"[]\n"}),
            "pack_inventory",
        )

    def test_a_dropped_generation(self):
        name = "transcript-" + local.MODELS[0]["id"] + ".json"

        def mutate(files):
            files[name] = projection.wire(json.loads(files[name])[:-1])

        self.check(mutate, "transcript_inventory")

    def test_a_transcript_from_another_revision(self):
        def mutate(files):
            meta = json.loads(files["capture.json"])
            meta["models"][local.MODELS[0]["id"]]["revision"] = "f" * 40
            files["capture.json"] = projection.wire(meta)

        self.check(mutate, "capture_binding")

    def test_a_claimed_gate_or_attacker_run(self):
        def gate(files):
            report = json.loads(files["report.json"])
            report["gate_executed"] = True
            files["report.json"] = projection.wire(report)

        self.check(gate, "report_mismatch")

    def test_sidecar_must_follow_the_report(self):
        def mutate(files):
            files["shift.json"] = projection.wire({})

        self.check(mutate, "sidecar_member_mismatch")

    def test_protocol_binds_the_sources_and_the_models(self):
        p = json.loads(self.proto.read_text())
        self.assertIs(p["model_inference"], True)
        self.assertIs(p["gate_executed"], False)
        self.assertEqual(
            [m["id"] for m in p["models"]], [m["id"] for m in local.MODELS]
        )
        self.assertIn("tools/assurance-provenance/capture19local.py", p["sources"])
        self.assertIn("tools/assurance-provenance/capture19.py", p["sources"])
        self.assertIn("docs/research/transfer-phase-17/tasks.json", p["sources"])
        bad = Path(tempfile.mkdtemp(prefix="p19h-proto-")) / "protocol.json"
        p["sources"]["tools/assurance-provenance/capture19local.py"] = "0" * 64
        bad.write_bytes(projection.wire(p))
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, self.root, protocol=bad)
        self.assertTrue(str(caught.exception).startswith("source_binding"))


if __name__ == "__main__":
    unittest.main()
