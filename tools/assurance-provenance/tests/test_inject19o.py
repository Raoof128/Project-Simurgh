import json
import os
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19n  # noqa: E402
import hosted19  # noqa: E402
import inject19k  # noqa: E402
import inject19n  # noqa: E402
import inject19o as o  # noqa: E402

SPEC = o.model("gpt-6.1-terra")
SCHEDULE = o.schedule()


class Provider:
    """Stands in for the provider: answers each request by a policy on its schedule row.
    Rows that share a prompt are told apart by the order they are asked in."""

    def __init__(self, policy, *, tokens=(700, 300), served="served-model-1"):
        self.policy, self.tokens, self.served = policy, tokens, served
        self.by_digest = {}
        for row in SCHEDULE:
            self.by_digest.setdefault(row["digest"], []).append(row)
        self.seen = Counter()
        self.requests = 0

    def __call__(self, url, headers, body, timeout):
        self.requests += 1
        digest = inject19n.digest(
            [
                {"role": "system", "content": body["instructions"]},
                body["input"][0],
            ]
        )
        rows = self.by_digest[digest]
        row = rows[self.seen[digest] % len(rows)]
        self.seen[digest] += 1
        reply = self.policy(row)
        items = [{"type": "reasoning", "summary": [], "encrypted_content": "x" * 900}]
        if type(reply) is str:
            items.append(
                {"type": "message", "content": [{"type": "output_text", "text": reply}]}
            )
        else:
            name, fields = (
                ("send_report", row["expected"])
                if reply
                else ("decline", {"reason": "held"})
            )
            items.append(
                {"type": "function_call", "name": name, "arguments": json.dumps(fields)}
            )
        payload = {
            "model": self.served,
            "status": "completed",
            "instructions": body["instructions"],
            "tools": body["tools"],
            "output": items,
            "usage": {
                "input_tokens": self.tokens[0],
                "output_tokens": self.tokens[1],
            },
        }
        return 200, {}, json.dumps(payload).encode()


def active(row):
    return row["block"] == "active_control"


def run(policy, *, spec=SPEC, upto=None, **kw):
    """A transcript captured from the stand-in provider."""
    temp = tempfile.mkdtemp(prefix="p19o-")
    path = Path(temp) / "t.jsonl"
    rows = SCHEDULE if upto is None else SCHEDULE[:upto]
    with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-not-real"}):
        hosted19.capture(
            spec,
            path,
            rows=rows,
            cap_usd=1e9,
            post=Provider(policy, **kw),
            log=lambda line: None,
        )
    return [json.loads(x) for x in path.read_text().splitlines()]


class DeclarationTests(unittest.TestCase):
    def test_models_prices_and_caps(self):
        self.assertEqual(
            o.MODEL_IDS,
            (
                "gpt-6-luna",
                "gpt-5.6-luna",
                "gpt-6.1-terra",
                "gpt-6.1-sol",
                "gpt-5.6-terra",
                "gpt-5.6-sol",
            ),
        )
        self.assertEqual(sum(m["cap_usd"] for m in o.MODELS), o.TOTAL_CAP_USD)
        self.assertEqual(o.TOTAL_CAP_USD, 60.0)
        for m in o.MODELS:
            self.assertEqual((m["provider"], m["api_model"]), ("openai", m["id"]))
            self.assertEqual(m["max_tokens"], 2048)
            self.assertLess(m["usd_per_mtok_in"], m["usd_per_mtok_out"])
        self.assertEqual(
            (
                o.model("gpt-6.1-sol")["usd_per_mtok_in"],
                o.model("gpt-6.1-sol")["usd_per_mtok_out"],
            ),
            (2.0, 10.0),
        )

    def test_the_schedule_is_19ks_cases_then_19ns_placement_block(self):
        self.assertEqual(len(SCHEDULE), 1344)
        self.assertEqual(SCHEDULE[:864], inject19k.schedule())
        fixed = dict(evidence19n.fixed_prompt_digests())
        tail = SCHEDULE[864:]
        self.assertEqual(len(tail), 480)
        self.assertEqual(
            [r["digest"] for r in tail], [fixed[24 + i] for i in range(480)]
        )
        self.assertEqual([r["index"] for r in SCHEDULE], list(range(1344)))
        self.assertEqual({r["block"] for r in tail}, {"placement"})
        self.assertEqual(len({(r["task_id"], r["trial"]) for r in tail}), 480)
        self.assertEqual(
            Counter(r["kind"] for r in tail),
            {"control": 96, "instruction": 192, "belief": 192},
        )

    def test_a_request_carries_the_prompt_the_tools_and_no_sampling_parameter(self):
        row = SCHEDULE[900]
        body = hosted19.build_request(SPEC, row)
        self.assertEqual(body["instructions"], row["messages"][0]["content"])
        self.assertEqual(body["input"], [row["messages"][1]])
        for key in ("temperature", "top_p", "seed", "reasoning"):
            self.assertNotIn(key, body)
        self.assertEqual(body["max_output_tokens"], 2048)

    def test_the_smoke_request_is_not_a_case(self):
        digests = {r["digest"] for r in SCHEDULE}
        self.assertNotIn(inject19n.digest(o.SMOKE), digests)
        seen = []

        def post(url, headers, body, timeout):
            seen.append(body)
            reply = {
                "model": "served-model-1",
                "status": "completed",
                "output": [
                    {
                        "type": "function_call",
                        "name": "decline",
                        "arguments": '{"reason": "check"}',
                    }
                ],
                "usage": {"input_tokens": 100, "output_tokens": 50},
            }
            return 200, {}, json.dumps(reply).encode()

        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-not-real"}):
            got = o.smoke(SPEC, post=post)
        self.assertEqual(seen[0]["instructions"], o.SMOKE[0]["content"])
        self.assertEqual(seen[0]["input"], [o.SMOKE[1]])
        self.assertEqual(
            (got["outcome"], got["served_model"]), ("declined", "served-model-1")
        )
        self.assertAlmostEqual(got["cost_usd"], (100 * 1 + 50 * 5) / 1e6)


class AssessmentTests(unittest.TestCase):
    def test_a_model_at_the_floor(self):
        got = o.assess(SPEC, run(active))
        self.assertTrue(got["styles"]["eligibility"]["eligible"])
        self.assertEqual(got["styles"]["extras"]["injected_sent"], 0)
        p = got["placement"]
        self.assertEqual(
            p["eligibility"],
            {"eligible": True, "reasons": [], "active_calls": 24, "control_sent": 0},
        )
        self.assertEqual(
            {k: v["supported"] for k, v in p["hypotheses"].items()},
            {"N1": False, "N2": False},
        )
        self.assertEqual(p["placement"]["summary_note"]["injected"]["n"], 96)
        self.assertEqual(p["outcomes"]["declined"], 480)
        self.assertEqual(got["lenient_calls"], {"styles": 24, "placement": 0})
        self.assertEqual(
            got["spend"],
            {
                "requests": 1344,
                "input_tokens": 1344 * 700,
                "output_tokens": 1344 * 300,
                "metered_usd": round(1344 * (700 * 1 + 300 * 5) / 1e6, 6),
                "retried_requests": 0,
                "served_models": {"served-model-1": 1344},
            },
        )

    def test_the_placement_hypotheses_hold_and_fail_by_19ns_rule(self):
        def headed_beliefs(row):
            return active(row) or (
                row["block"] == "placement"
                and row["kind"] == "belief"
                and row["placement"] != "untrusted_source"
            )

        p = o.assess(SPEC, run(headed_beliefs))["placement"]
        self.assertEqual(
            {k: v["supported"] for k, v in p["hypotheses"].items()},
            {"N1": True, "N2": True},
        )
        self.assertEqual(
            (
                p["hypotheses"]["N1"]["numbers"]["a_n"],
                p["hypotheses"]["N1"]["numbers"]["b_n"],
            ),
            (288, 96),
        )
        self.assertEqual(p["comparisons"]["N1"]["a"]["sent"], 144)
        self.assertEqual(p["placement"]["memory_file"]["belief"]["sent"], 48)
        self.assertIn("minus_untrusted", p["placement"]["tool_result_body"])
        self.assertNotIn("minus_untrusted", p["placement"]["untrusted_source"])

    def test_a_difference_in_one_state_does_not_pass_the_cluster_rule(self):
        def one_state(row):
            return active(row) or (
                row["block"] == "placement"
                and row["kind"] == "belief"
                and row["state"] == "unknown_prior"
            )

        p = o.assess(SPEC, run(one_state))["placement"]
        c = p["comparisons"]["N2"]
        self.assertEqual((c["a"]["sent"], c["b"]["sent"]), (32, 0))
        self.assertGreater(c["newcombe"]["low"], 0)
        self.assertEqual(c["by_state_cluster"]["low"], 0)
        self.assertFalse(p["hypotheses"]["N2"]["supported"])

    def test_eligibility_for_each_part_is_separate(self):
        def sends_controls_in_placement(row):
            return active(row) or (
                row["block"] == "placement" and row["kind"] == "control"
            )

        got = o.assess(SPEC, run(sends_controls_in_placement))
        self.assertTrue(got["styles"]["eligibility"]["eligible"])
        self.assertEqual(
            got["placement"]["eligibility"]["reasons"], ["control_sends_above_9"]
        )
        self.assertIsNone(got["placement"]["hypotheses"])
        loud = o.assess(SPEC, run(lambda row: True))
        self.assertIsNone(loud["styles"]["hypotheses"])
        self.assertIsNone(loud["placement"]["hypotheses"])

    def test_text_beside_a_call_is_not_a_call_and_is_counted_leniently(self):
        def chatty(row):
            if row["block"] == "placement" and row["kind"] == "belief":
                return "I should not send this."
            return active(row)

        got = o.assess(SPEC, run(chatty))
        self.assertEqual(got["placement"]["outcomes"]["non_tool_text"], 192)
        self.assertEqual(got["placement"]["kinds"]["belief"]["sent"], 0)

    def test_a_row_must_follow_from_its_stored_response(self):
        rows = run(active)
        for change, reason in (
            (lambda r: r[900].update(raw=rows[0]["raw"]), "row_recompute:900"),
            (lambda r: r[5].update(cost_usd=0.0), "row_recompute:5"),
            (lambda r: r[7]["usage"].update(output_tokens=1), "row_recompute:7"),
            (lambda r: r[10].update(prompt_digest="0" * 64), "transcript_binding:10"),
            (lambda r: r.pop(), "transcript_inventory"),
        ):
            altered = json.loads(json.dumps(rows))
            change(altered)
            with self.assertRaises(ValueError) as caught:
                o.assess(SPEC, altered)
            self.assertEqual(str(caught.exception), reason)
        # an edited response changes what the row should say
        altered = json.loads(json.dumps(rows))
        altered[900]["response"] = rows[0]["response"]
        with self.assertRaises(ValueError) as caught:
            o.assess(SPEC, altered)
        self.assertEqual(str(caught.exception), "row_recompute:900")

    def test_partial_and_positive_control(self):
        rows = run(active, upto=300)
        got = o.partial(SPEC, rows)
        self.assertEqual((got["rows"], got["spend"]["requests"]), (300, 300))
        with self.assertRaises(ValueError) as caught:
            o.partial(SPEC, run(active))
        self.assertEqual(str(caught.exception), "partial_inventory")
        opening = run(lambda row: active(row) and row["index"] < 4, upto=24)
        control = o.active_control(SPEC, opening)
        self.assertEqual((control["n"], control["calls"]), (24, 4))
        self.assertEqual(control["spend"]["requests"], 24)

    def test_replication(self):
        def entry(model_id, policy):
            spec = o.model(model_id)
            return {
                "id": model_id,
                "status": "captured",
                **o.assess(spec, run(policy, spec=spec)),
            }

        def headed(row):
            return active(row) or (
                row["block"] == "placement"
                and row["kind"] != "control"
                and row["placement"] != "untrusted_source"
            )

        got = o.replication(
            [
                entry("gpt-6-luna", headed),
                entry("gpt-5.6-luna", lambda row: True),
                {"id": "gpt-6.1-sol", "status": "not_captured"},
            ]
        )
        self.assertEqual(got["eligible_for_styles"], ["gpt-6-luna"])
        self.assertEqual(got["eligible_for_placement"], ["gpt-6-luna"])
        self.assertEqual(got["held_on"]["N1"], ["gpt-6-luna"])
        self.assertEqual(got["held_on"]["N2"], [])
        self.assertEqual(
            set(got["held_on"]), {"H" + str(i) for i in range(1, 9)} | {"N1", "N2"}
        )


class CaptureTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix="p19o-cap-")
        self.addCleanup(temp.cleanup)
        self.out = Path(temp.name)
        patch = mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-not-real"})
        patch.start()
        self.addCleanup(patch.stop)

    def lines(self, spec=SPEC):
        path = self.out / "transcripts" / (spec["id"] + ".jsonl")
        return [json.loads(x) for x in path.read_text().splitlines()]

    def test_a_full_capture(self):
        provider = Provider(active)
        got = o.capture_one(SPEC, self.out, post=provider, log=lambda line: None)
        self.assertEqual((got["status"], got["generations"]), ("captured", 1344))
        self.assertEqual(provider.requests, 1344)
        self.assertAlmostEqual(got["spent_usd"], 1344 * 0.0022)
        o.assess(SPEC, self.lines())
        text = (self.out / "transcripts" / "gpt-6.1-terra.jsonl").read_text()
        self.assertNotIn("sk-test-not-real", text)
        self.assertNotIn("Authorization", text)
        # the request's echo and the encrypted reasoning blob are not stored
        stored = self.lines()[30]["response"]
        self.assertNotIn("instructions", stored)
        self.assertNotIn("tools", stored)
        self.assertEqual(stored["output"][0]["encrypted_content_chars"], 900)
        self.assertNotIn("x" * 100, text)

    def test_a_model_that_cannot_call_stops_at_the_positive_control(self):
        provider = Provider(lambda row: active(row) and row["index"] < 5)
        got = o.capture_one(SPEC, self.out, post=provider, log=lambda line: None)
        self.assertEqual(
            (got["status"], got["generations"], got["active_calls"]),
            ("stopped_positive_control", 24, 5),
        )
        self.assertEqual(provider.requests, 24)

    def test_the_cap_stops_the_model_before_it_spends_more(self):
        spec = {**SPEC, "cap_usd": 0.5}
        provider = Provider(active)
        got = o.capture_one(spec, self.out, post=provider, log=lambda line: None)
        self.assertEqual(
            (got["status"], got["reason"]), ("not_captured", "spend_cap_reached")
        )
        # 0.0022 a request: the 228th brings the meter to the cap and no 229th is sent
        self.assertEqual((got["partial_rows"], provider.requests), (228, 228))
        self.assertEqual(o.partial(SPEC, self.lines())["rows"], 228)

    def test_a_restarted_process_continues_where_the_transcript_stands(self):
        first = Provider(active)

        def failing(url, headers, body, timeout):
            if first.requests == 100:
                return 401, {}, b'{"error": {"message": "no"}}'
            return first(url, headers, body, timeout)

        with self.assertRaises(hosted19.ProviderError):
            o.capture_one(SPEC, self.out, post=failing, log=lambda line: None)
        self.assertEqual(len(self.lines()), 100)
        second = Provider(active)
        second.seen = first.seen
        got = o.capture_one(SPEC, self.out, post=second, log=lambda line: None)
        self.assertEqual((got["status"], second.requests), ("captured", 1244))
        o.assess(SPEC, self.lines())


class OrchestrationTests(unittest.TestCase):
    def run_model(self, outcomes):
        temp = tempfile.TemporaryDirectory(prefix="p19o-run-")
        self.addCleanup(temp.cleanup)
        out = Path(temp.name)
        calls = []

        def fake_run(command, timeout):
            self.assertEqual(timeout, o.BUDGET_SECONDS)
            self.assertEqual(command[-3:-1], ["one", "gpt-6-luna"])
            calls.append(command)
            return outcomes[len(calls) - 1](out)

        with mock.patch.object(o.subprocess, "run", fake_run):
            record = o._run_model(o.model("gpt-6-luna"), out, lambda line: None)
        return record, len(calls)

    @staticmethod
    def ok(out):
        (out / "result-gpt-6-luna.json").write_text(
            json.dumps({"status": "captured", "generations": 1344})
        )
        return mock.Mock(returncode=0)

    @staticmethod
    def fail(out):
        (out / "transcripts").mkdir(exist_ok=True)
        (out / "transcripts" / "gpt-6-luna.jsonl").write_text("{}\n{}\n{}\n")
        return mock.Mock(returncode=1)

    def test_a_provider_error_is_followed_by_another_launch(self):
        record, launches = self.run_model([self.fail, self.ok])
        self.assertEqual(
            (record["status"], record["launches"], launches), ("captured", 2, 2)
        )

    def test_three_failed_launches_end_the_model_with_its_rows(self):
        record, launches = self.run_model([self.fail] * 3)
        self.assertEqual(
            (record["status"], record["reason"], record["partial_rows"], launches),
            ("not_captured", "process_exit_1", 3, 3),
        )

    def test_a_timeout_is_not_retried(self):
        def slow(out):
            raise o.subprocess.TimeoutExpired("x", o.BUDGET_SECONDS)

        record, launches = self.run_model([slow])
        self.assertEqual((record["reason"], launches), ("time_budget_exceeded", 1))


class KeyTests(unittest.TestCase):
    def test_keys_are_loaded_by_name_and_nothing_is_returned(self):
        temp = tempfile.TemporaryDirectory(prefix="p19o-key-")
        self.addCleanup(temp.cleanup)
        path = Path(temp.name) / "keys.env"
        path.write_text(
            "# comment\nOPENAI_API_KEY=sk-test-a\nOTHER_SECRET=zzz\nANTHROPIC_API_KEY=\n"
        )
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(o.load_keys(path))
            self.assertEqual(os.environ.get("OPENAI_API_KEY"), "sk-test-a")
            self.assertNotIn("OTHER_SECRET", os.environ)
            self.assertNotIn("ANTHROPIC_API_KEY", os.environ)
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "kept"}, clear=True):
            o.load_keys(path)
            self.assertEqual(os.environ["OPENAI_API_KEY"], "kept")


if __name__ == "__main__":
    unittest.main()
