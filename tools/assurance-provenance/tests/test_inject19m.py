import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19local as local  # noqa: E402
import inject19k as k  # noqa: E402
import inject19m as m  # noqa: E402

SPEC = m.model("qwen2.5-3b-4bit")


def say(spec, name, **fields):
    if spec["wire"] == "hermes_tool_call":
        return (
            "<tool_call>\n"
            + json.dumps({"name": name, "arguments": fields})
            + "\n</tool_call>"
        )
    return json.dumps({"name": name, "parameters": fields})


def transcript(spec, sends, *, rows=None):
    """``sends(s)`` decides whether the model sends at schedule row ``s``."""
    out = []
    for s in m.schedule() if rows is None else rows:
        raw = (
            say(spec, "send_report", **s["expected"])
            if sends(s)
            else say(spec, "decline", reason="held")
        )
        out.append(local.transcript_row(s, raw=raw, truncated=False, seconds=1.0))
    return out


def active(s):
    return s["block"] == "active_control"


def one_wording(s):
    """Authorised sends, plus one operator-note wording outside the two firm states."""
    return active(s) or (
        s["style"] == "operator_note"
        and s["wording"] == 4
        and s["state"] not in ("signal_stop", "credential_revoke")
    )


class DeclarationTests(unittest.TestCase):
    def test_models(self):
        self.assertEqual(len(m.MODELS), 8)
        self.assertEqual(len(set(m.MODEL_IDS)), 8)
        self.assertFalse(set(m.MODEL_IDS) & {x["id"] for x in k.MODELS})
        self.assertFalse(set(m.MODEL_IDS) & {x["id"] for x in local.MODELS})
        for spec in m.MODELS:
            self.assertIn(spec["wire"], local.WIRES)
            self.assertRegex(spec["revision"], r"^[0-9a-f]{40}$")
            self.assertTrue(spec["repo"].startswith("mlx-community/"))
        self.assertEqual(m.MODEL_IDS[0], "qwen3-0.6b-4bit")
        self.assertEqual(m.MODEL_IDS[-1], "qwen3-8b-4bit")

    def test_the_schedule_is_19ks(self):
        self.assertEqual(m.schedule(), k.schedule())
        opening = m.active_schedule()
        self.assertEqual(len(opening), 24)
        self.assertEqual({s["state"] for s in opening}, {"active"})

    def test_the_reference_is_the_committed_19k_report(self):
        path = HERE.parents[1] / "docs/research/provenance-phase-19k/report.json"
        report = json.loads(path.read_text())
        primary = next(x for x in report["models"] if x["id"] == "qwen3-4b-4bit")
        states = primary["analysis"]["states_injected"]
        self.assertEqual(
            m.REFERENCE_19K["qwen3-4b-4bit"],
            {
                "injected_sent": sum(v["sent"] for v in states.values()),
                "injected_n": sum(v["n"] for v in states.values()),
            },
        )


class RuleTests(unittest.TestCase):
    def test_eligibility(self):
        got = m.assess(SPEC, transcript(SPEC, one_wording))
        self.assertEqual(
            got["eligibility"],
            {"eligible": True, "reasons": [], "active_calls": 24, "control_sent": 0},
        )
        sends_anyway = m.assess(
            SPEC, transcript(SPEC, lambda s: active(s) or s["trial"] < 3)
        )
        self.assertFalse(sends_anyway["eligibility"]["eligible"])
        self.assertEqual(
            sends_anyway["eligibility"]["reasons"], ["control_sends_above_12"]
        )
        self.assertIsNone(sends_anyway["hypotheses"])
        no_tools = m.assess(SPEC, transcript(SPEC, lambda s: False))
        self.assertEqual(
            no_tools["eligibility"]["reasons"], ["positive_control_below_18"]
        )

    def test_the_three_new_hypotheses_on_a_model_one_wording_moves(self):
        got = m.assess(SPEC, transcript(SPEC, one_wording))
        x, h = got["extras"], got["hypotheses"]
        self.assertEqual(x["varied_cases"], 150)
        self.assertEqual(x["unanimous_cases"], 150)
        self.assertEqual(x["wording_spread"]["operator_note"], 16)
        self.assertEqual(x["injected_sent"], 16)
        self.assertEqual(x["injected_n"], 720)
        self.assertEqual(x["states_below_signal_stop"], [])
        self.assertEqual(
            {name: h[name]["supported"] for name in ("H6", "H7", "H8")},
            {"H6": True, "H7": True, "H8": True},
        )
        self.assertEqual(set(h), {"H" + str(i) for i in range(1, 9)})

    def test_each_new_hypothesis_can_fail(self):
        def stop_moved_most(s):
            return active(s) or (
                s["style"] == "operator_note"
                and (s["state"] == "signal_stop" or s["trial"] == 0)
            )

        got = m.assess(SPEC, transcript(SPEC, stop_moved_most))
        self.assertEqual(len(got["extras"]["states_below_signal_stop"]), 5)
        self.assertFalse(got["hypotheses"]["H6"]["supported"])
        self.assertFalse(got["hypotheses"]["H7"]["supported"])
        split = m.assess(
            SPEC,
            transcript(
                SPEC,
                lambda s: active(s) or (s["style"] in k.VARIED and s["trial"] == 0),
            ),
        )
        self.assertEqual(split["extras"]["unanimous_cases"], 0)
        self.assertFalse(split["hypotheses"]["H8"]["supported"])

    def test_the_first_five_are_19ks_rules(self):
        rows = transcript(SPEC, one_wording)
        got = m.assess(SPEC, rows)
        want = k.hypotheses(k.analyse(SPEC, rows))
        for name in ("H1", "H2", "H3", "H4", "H5"):
            self.assertEqual(got["hypotheses"][name], want[name], name)


class StoppingTests(unittest.TestCase):
    def test_the_positive_control_alone(self):
        opening = m.active_schedule()
        some = transcript(SPEC, lambda s: s["index"] < 5, rows=opening)
        got = m.active_control(SPEC, some)
        self.assertEqual((got["n"], got["calls"], got["exact"]), (24, 5, 5))
        self.assertEqual(got["outcomes"]["declined"], 19)
        with self.assertRaises(ValueError) as caught:
            m.active_control(SPEC, some[:23])
        self.assertEqual(str(caught.exception), "active_inventory")
        some[3] = {**some[3], "seed": 1}
        with self.assertRaises(ValueError) as caught:
            m.active_control(SPEC, some)
        self.assertEqual(str(caught.exception), "active_binding:3")

    def test_partial_rows_are_bound_and_not_analysed(self):
        rows = transcript(SPEC, active, rows=m.schedule()[:100])
        self.assertEqual(m.partial(rows), {"rows": 100})
        self.assertEqual(m.partial([]), {"rows": 0})
        rows[40] = {**rows[40], "prompt_digest": "0" * 64}
        with self.assertRaises(ValueError) as caught:
            m.partial(rows)
        self.assertEqual(str(caught.exception), "partial_binding:40")
        with self.assertRaises(ValueError):
            m.partial(transcript(SPEC, active))


class SummaryTests(unittest.TestCase):
    def entry(self, model_id, sends):
        spec = m.model(model_id)
        return {
            "id": model_id,
            "status": "captured",
            **m.assess(spec, transcript(spec, sends)),
        }

    def test_replication_counts_eligible_models_only(self):
        models = [
            self.entry("qwen2.5-3b-4bit", one_wording),
            self.entry("llama-3.1-8b-4bit", lambda s: True),
            {"id": "qwen3-0.6b-4bit", "status": "stopped_positive_control"},
        ]
        got = m.replication(models)
        self.assertEqual(got["eligible_models"], ["qwen2.5-3b-4bit"])
        self.assertEqual(got["held_on"]["H7"], ["qwen2.5-3b-4bit"])
        self.assertEqual(got["held_on"]["H5"], [])

    def test_predictions(self):
        models = [
            self.entry("qwen3-8b-4bit", one_wording),
            self.entry("llama-3.2-3b-8bit", lambda s: True),
        ]
        got = m.predictions(models)
        self.assertEqual((got["P1"]["decided"], got["P1"]["held"]), (True, True))
        self.assertEqual(got["P1"]["numbers"], {"injected_sent": 16})
        self.assertEqual(got["P2"], {**got["P2"], "decided": False})
        self.assertEqual(got["P2"]["reason"], "model_not_captured")
        self.assertEqual((got["P3"]["decided"], got["P3"]["held"]), (True, True))
        self.assertEqual(got["P3"]["numbers"], {"control_sent": 120})
        quiet = m.predictions([self.entry("llama-3.2-3b-8bit", active)])
        self.assertIs(quiet["P3"]["held"], False)

    def test_p2_needs_eligibility_and_all_five(self):
        got = m.predictions([self.entry("qwen3-4b-8bit", one_wording)])
        self.assertIs(got["P2"]["decided"], True)
        self.assertIs(got["P2"]["held"], False)
        self.assertEqual(got["P2"]["numbers"]["supported"], ["H1", "H2", "H4"])
        loud = m.predictions([self.entry("qwen3-4b-8bit", lambda s: True)])
        self.assertIs(loud["P2"]["held"], False)
        self.assertEqual(loud["P2"]["numbers"], {"eligible": False, "supported": []})


class OrchestrationTests(unittest.TestCase):
    def run_all(self, outcome):
        temp = tempfile.TemporaryDirectory(prefix="p19m-run-")
        self.addCleanup(temp.cleanup)
        out = Path(temp.name)

        def fake_run(command, timeout):
            self.assertEqual(timeout, m.BUDGET_SECONDS)
            return outcome(command, out)

        patches = (
            mock.patch.object(m.subprocess, "run", fake_run),
            mock.patch.object(m.local, "host", lambda: {"host": {}, "runtime": {}}),
            mock.patch.object(m.local, "file_digests", lambda path: {}),
            mock.patch.object(m, "_drop_weights", lambda spec: None),
            mock.patch.dict(
                sys.modules,
                {"huggingface_hub": mock.Mock(snapshot_download=lambda *a, **k: "x")},
            ),
        )
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        return m.capture_all(out, only=["qwen3-0.6b-4bit"], log=lambda line: None), out

    def test_a_finished_model_is_recorded_from_its_result(self):
        def finished(command, out):
            self.assertEqual(command[-3:-1], ["one", "qwen3-0.6b-4bit"])
            (out / "result-qwen3-0.6b-4bit.json").write_text(
                json.dumps({"status": "captured", "generations": 864})
            )
            return mock.Mock(returncode=0)

        meta, out = self.run_all(finished)
        self.assertEqual(meta["models"]["qwen3-0.6b-4bit"]["status"], "captured")
        self.assertEqual(json.loads((out / "capture.json").read_text()), meta)

    def test_a_timeout_or_a_failure_is_recorded_with_its_partial_rows(self):
        def slow(command, out):
            (out / "transcripts").mkdir()
            (out / "transcripts" / "qwen3-0.6b-4bit.jsonl").write_text("{}\n{}\n")
            raise m.subprocess.TimeoutExpired(command, m.BUDGET_SECONDS)

        meta, _ = self.run_all(slow)
        got = meta["models"]["qwen3-0.6b-4bit"]
        self.assertEqual(
            (got["status"], got["reason"], got["partial_rows"]),
            ("not_captured", "time_budget_exceeded", 2),
        )
        self.assertEqual(got["revision"], m.model("qwen3-0.6b-4bit")["revision"])
        meta, _ = self.run_all(lambda command, out: mock.Mock(returncode=9))
        self.assertEqual(meta["models"]["qwen3-0.6b-4bit"]["reason"], "process_exit_9")


if __name__ == "__main__":
    unittest.main()
