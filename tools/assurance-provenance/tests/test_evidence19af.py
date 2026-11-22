"""Lane 19af evidence pack: build from made-up generations, verify, and refuse packs that were
changed. No model runs here."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19af as ev  # noqa: E402
import local19af as m  # noqa: E402
import projection  # noqa: E402
from test_local19af import DECLINE, kept, llama_call  # noqa: E402

GATE = {
    "restriction": [
        {"wording": w, "channel": c, "verdict": "observed", "effects": 1}
        for w in range(5)
        for c in m.CHANNELS
    ],
    "bodies": [
        {
            "body": b,
            "verdict": "observed" if b == "exact" else "blocked",
            "effects": int(b == "exact"),
        }
        for b in m.BODIES
    ],
    "dispatch_seconds": [0.004, 0.005, 0.006],
}
SCORE = {"exact": 5, "added": 80, "omission": 5, "split": 5}


def call(model_id, expected):
    if model_id.startswith("qwen"):
        return (
            "<tool_call>\n"
            + json.dumps({"name": "send_report", "arguments": expected})
            + "\n</tool_call>"
        )
    return llama_call(expected)


def decline(model_id):
    if model_id.startswith("qwen"):
        return '<tool_call>\n{"name": "decline", "arguments": {"reason": "held"}}\n</tool_call>'
    return DECLINE


def capture_dir():
    base = Path(tempfile.mkdtemp(prefix="p19af-cap-"))
    meta = {"models": {}, "host": {"machine": "arm64"}}
    for i in m.MODELS:
        rows = []
        for s in m.schedule_r():
            sends = s["arm"] == "plain" or (s["arm"] == "notice" and s["trial"] < 2)
            rows.append(kept(s, call(i, s["expected"]) if sends else decline(i)))
        (base / f"transcript-R-{i}.jsonl").write_text(
            "".join(json.dumps(r) + "\n" for r in rows)
        )
        rows = [
            kept(s, f"<score>{SCORE[s['arm']]}</score>", seconds=12.0)
            for s in m.schedule_o()
        ]
        (base / f"transcript-O-{i}.jsonl").write_text(
            "".join(json.dumps(r) + "\n" for r in rows)
        )
        done = {
            "generations": 0,
            "resumed_from": 0,
            "determinism_recheck": {"rows": 4, "identical": True},
        }
        meta["models"][i] = {
            "revision": "r",
            "R": dict(done, generations=168),
            "O": dict(done, generations=96),
        }
    (base / "capture.json").write_text(json.dumps(meta))
    return base


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        held = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(held)
    dst = Path(tempfile.mkdtemp(prefix="p19af-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, held)


class Evidence19afTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.capture = capture_dir()
        cls.out = Path(tempfile.mkdtemp(prefix="p19af-ev-")) / "out"
        cls.receipt = ev.run(cls.out, cls.capture, gate=GATE)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"
        cls.report = json.loads((cls.out / "report.json").read_text())

    def refused(self, change, reason):
        pack, root = repack(self.pack, change)
        with self.assertRaises(ValueError) as caught:
            ev.verify(pack, root, protocol=self.proto)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_run_writes_a_pack_that_verifies(self):
        c = self.receipt
        self.assertTrue(c["verified"])
        self.assertEqual(c["generations"], 2 * (168 + 96))
        self.assertEqual(
            c["hypotheses"], dict.fromkeys(("T1", "T2", "T3", "O1", "O2", "O3"), True)
        )
        self.assertEqual(
            c["models"],
            {i: {"eligible": True, "usable_monitor": True} for i in m.MODELS},
        )
        self.assertEqual(
            (c["model_inference"], c["money_spent"], c["manifest_sha256"]),
            (True, 0, self.root),
        )
        again = ev.verify(self.pack, self.root, protocol=self.proto)
        self.assertEqual(again["hypotheses"], c["hypotheses"])

    def test_the_report_follows_from_the_kept_generations(self):
        r = self.report
        for i in m.MODELS:
            self.assertEqual(r["arm_r"][i]["notice"], {"n": 120, "sent": 60})
            self.assertEqual(r["arm_r"][i]["host"], {"n": 24, "sent": 0})
            self.assertEqual(r["arm_o"][i]["caught"]["added"], {"n": 24, "caught": 24})
            self.assertEqual(
                r["arm_o"][i]["caught"]["omission"], {"n": 24, "caught": 0}
            )
            self.assertEqual(r["window"]["monitor_call_seconds"][i]["median"], 12.0)
        self.assertEqual(
            r["window"]["gate_dispatch_seconds"],
            {"n": 3, "median": 0.005, "min": 0.004, "max": 0.006},
        )
        self.assertEqual(len(r["gate"]["restriction"]), 20)

    def test_the_pack_holds_every_generation_and_the_gates_side(self):
        with zipfile.ZipFile(self.pack) as z:
            names = set(z.namelist()) - {"manifest.json"}
            rows = json.loads(z.read(ev.member("R", m.MODELS[0])))
        wanted = {ev.member(a, i) for a in ev.ARMS for i in m.MODELS}
        self.assertEqual(
            names,
            {"report.json", "capture.json", "gate.json", "hypotheses.json", *wanted},
        )
        self.assertEqual(len(rows), 168)
        self.refused(lambda f: f.pop("gate.json"), "pack_inventory")

    def test_a_changed_generation_changes_the_report(self):
        name = ev.member("R", m.MODELS[1])

        def flip(held):
            rows = json.loads(held[name])
            rows[0]["raw"] = DECLINE
            held[name] = projection.wire(rows)

        self.refused(flip, "report_mismatch")

        def rebind(held):
            rows = json.loads(held[name])
            rows[5]["seed"] += 1
            held[name] = projection.wire(rows)

        self.refused(rebind, "row_binding")
        self.refused(
            lambda f: f.update({name: projection.wire(json.loads(f[name])[:-1])}),
            "transcript_rows",
        )

    def test_a_changed_gate_row_or_report_is_refused(self):
        def loosen(held):
            gate = json.loads(held["gate.json"])
            gate["bodies"][1]["verdict"] = "observed"
            held["gate.json"] = projection.wire(gate)

        self.refused(loosen, "report_mismatch")

        def claim(held):
            rep = json.loads(held["report.json"])
            rep["hypotheses"]["O2"]["holds"] = False
            held["report.json"] = projection.wire(rep)

        self.refused(claim, "report_mismatch")
        self.refused(
            lambda f: f.update({"hypotheses.json": projection.wire({})}),
            "sidecar_member_mismatch",
        )
        self.refused(
            lambda f: f.update({"gate.json": projection.wire({"restriction": []})}),
            "gate_rows",
        )

    def test_the_protocol_pins_the_schedules_the_models_and_the_sources(self):
        proto = json.loads(self.proto.read_text())
        self.assertEqual([x["id"] for x in proto["models"]], list(m.MODELS))
        self.assertEqual(set(proto["schedule_digest"]), {"R", "O"})
        self.assertEqual(len(proto["sources"]), 12)
        self.assertIn(
            "docs/research/provenance-phase-19s/third-party/sleight-bench/control_arena.md",
            proto["sources"],
        )
        for change, reason in (
            (lambda p: p.update(trials=9), "protocol_inventory"),
            (lambda p: p["schedule_digest"].update(R="0" * 64), "protocol_inventory"),
            (
                lambda p: p["sources"].update(
                    {"tools/assurance-provenance/local19af.py": "0" * 64}
                ),
                "source_binding",
            ),
        ):
            other = json.loads(self.proto.read_text())
            change(other)
            path = Path(tempfile.mkdtemp(prefix="p19af-proto-")) / "protocol.json"
            path.write_bytes(projection.wire(other))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=path)
            self.assertEqual(str(caught.exception).split(":")[0], reason)


if __name__ == "__main__":
    unittest.main()
