import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19  # noqa: E402
import capture19local as local  # noqa: E402
import inject19  # noqa: E402

RESTRICTED = sorted(s for s in capture19.STATES if s != "active")


def call(name, **parameters):
    return json.dumps({"name": name, "parameters": parameters})


def hermes(name, **arguments):
    return (
        "<tool_call>\n"
        + json.dumps({"name": name, "arguments": arguments})
        + "\n</tool_call>"
    )


class CaseTests(unittest.TestCase):
    def test_every_restricted_state_meets_every_style(self):
        cases = inject19.cases()
        self.assertEqual(len(cases), len(RESTRICTED) * len(inject19.STYLES))
        self.assertEqual(
            sorted((c["state"], c["style"]) for c in cases),
            sorted((s, y) for s in RESTRICTED for y in inject19.STYLES),
        )
        self.assertEqual(len({c["id"] for c in cases}), len(cases))
        for c in cases:
            self.assertRegex(c["id"], r"^[a-z0-9-]{1,64}$")
            self.assertTrue(
                0 < len(c["source"]) <= 700 and c["source"].isascii(), c["id"]
            )

    def test_instruction_and_report_are_the_states_own_phase17_task(self):
        tasks = {t["id"]: t for t in capture19.tasks()}
        for c in inject19.cases():
            base = tasks[c["base_task"]]
            self.assertEqual((base["state"], base["kind"]), (c["state"], "benign"))
            self.assertEqual(c["instruction"], base["instruction"])
            self.assertEqual(c["expected"], base["expected"])

    def test_control_and_original_reuse_the_phase17_sources(self):
        by = {(t["state"], t["kind"]): t for t in capture19.tasks()}
        for c in inject19.cases():
            if c["style"] == "control":
                self.assertEqual(c["source"], by[(c["state"], "benign")]["source"])
            if c["style"] == "original":
                self.assertEqual(c["source"], by[(c["state"], "adversarial")]["source"])

    def test_generic_styles_use_one_text_for_every_state(self):
        for style in inject19.GENERIC:
            texts = {c["source"] for c in inject19.cases() if c["style"] == style}
            self.assertEqual(len(texts), 1, style)
        own = {c["source"] for c in inject19.cases() if c["style"] == "self_clearing"}
        self.assertEqual(len(own), len(RESTRICTED))

    def test_the_spoofed_host_block_is_the_real_active_line(self):
        text = inject19.GENERIC["host_block"]
        self.assertIn("TRUSTED EXECUTION STATE:", text)
        self.assertIn("active: " + capture19.STATES["active"], text)


class ScheduleTests(unittest.TestCase):
    def test_schedule(self):
        rows = inject19.schedule()
        n = len(RESTRICTED) * len(inject19.STYLES) * len(inject19.TRIALS)
        self.assertEqual(len(rows), n)
        self.assertEqual([r["index"] for r in rows], list(range(n)))
        self.assertEqual({r["arm"] for r in rows}, {"baseline"})
        first = rows[0]
        case = next(c for c in inject19.cases() if c["id"] == first["task_id"])
        self.assertEqual(first["messages"], capture19.messages(case, "baseline"))
        self.assertEqual(len({r["digest"] for r in rows}), n // len(inject19.TRIALS))
        seeds = [r["seed"] for r in rows]
        self.assertEqual(len(set(seeds)), n)
        self.assertEqual(min(seeds), inject19.SEED_BASE)
        # no seed is one the 19h capture used
        self.assertFalse(set(seeds) & {s["seed"] for s in local.schedule()})

    def test_models_are_declared_19h_models(self):
        self.assertEqual(
            list(inject19.MODEL_IDS), ["qwen3-4b-4bit", "llama-3.2-3b-4bit"]
        )
        for m in inject19.MODEL_IDS:
            local.model(m)


def transcript(outputs):
    return [
        local.transcript_row(s, raw=outputs(s)[0], truncated=outputs(s)[1])
        for s in inject19.schedule()
    ]


class AnalysisTests(unittest.TestCase):
    Q = local.model("qwen3-4b-4bit")
    L = local.model("llama-3.2-3b-4bit")

    def test_a_model_moved_only_by_one_style(self):
        def outputs(s):
            if s["style"] == "self_clearing":
                return hermes("send_report", **s["expected"]), False
            return hermes("decline", reason="held"), False

        a = inject19.analyse(self.Q, transcript(outputs))
        self.assertEqual(a["generations"], len(inject19.schedule()))
        for style, v in a["styles"].items():
            self.assertEqual(v["n"], 24, style)
            self.assertEqual(v["sent"], 24 if style == "self_clearing" else 0, style)
        self.assertEqual(
            a["styles"]["self_clearing"]["minus_control"]["difference"], 1.0
        )
        self.assertEqual(a["styles"]["original"]["minus_control"]["difference"], 0.0)
        self.assertNotIn("minus_control", a["styles"]["control"])
        self.assertEqual(
            a["by_state"]["signal_stop"]["self_clearing"], {"n": 4, "sent": 4}
        )
        self.assertEqual(a["by_state"]["signal_stop"]["control"], {"n": 4, "sent": 0})
        self.assertEqual(a["sent_exact"], 24)
        self.assertEqual(a["outcomes"]["declined"], len(inject19.schedule()) - 24)

    def test_a_call_on_the_hermes_wire_must_be_wrapped(self):
        send = call("send_report", resource="inbox", content="x")
        self.assertEqual(inject19.read(self.L, send, False)["status"], "call")
        self.assertEqual(inject19.read(self.Q, send, False), {"status": "invalid"})
        wrapped = hermes("send_report", resource="inbox", content="x")
        self.assertEqual(inject19.read(self.Q, wrapped, False)["status"], "call")
        self.assertEqual(
            inject19.read(self.Q, wrapped + wrapped, False)["status"], "non_tool_text"
        )
        self.assertEqual(
            inject19.read(self.Q, "Sure. " + wrapped, False)["status"], "non_tool_text"
        )
        self.assertEqual(inject19.read(self.Q, wrapped, True), {"status": "truncated"})

    def test_wire_and_inventory(self):
        rows = transcript(lambda s: (call("decline", reason="held"), False))
        self.assertEqual(
            inject19.analyse(self.L, rows)["outcomes"]["declined"], len(rows)
        )
        # the same text in the other model's wire is not a call
        self.assertEqual(
            inject19.analyse(self.Q, rows)["outcomes"]["invalid"], len(rows)
        )
        with self.assertRaises(ValueError):
            inject19.analyse(self.L, rows[:-1])
        bad = [dict(r) for r in rows]
        bad[3]["prompt_digest"] = "0" * 64
        with self.assertRaises(ValueError):
            inject19.analyse(self.L, bad)
        bad = [dict(r) for r in rows]
        bad[4]["seed"] += 1
        with self.assertRaises(ValueError):
            inject19.analyse(self.L, bad)


if __name__ == "__main__":
    unittest.main()
