import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19local as local  # noqa: E402
import hosted19 as h  # noqa: E402
import inject19  # noqa: E402
import inject19k  # noqa: E402

CLAUDE = {
    "id": "claude-test",
    "provider": "anthropic",
    "api_model": "claude-test-1",
    "max_tokens": 1024,
    "thinking": None,
    "usd_per_mtok_in": 2.0,
    "usd_per_mtok_out": 10.0,
    "wire": h.WIRE,
}
ROUTED = {
    "id": "routed-test",
    "provider": "openrouter",
    "api_model": "vendor/model",
    "max_tokens": 256,
    "temperature": 0.7,
    "top_p": 0.9,
    "seeded": True,
    "provider_pin": None,
    "usd_per_mtok_in": 1.0,
    "usd_per_mtok_out": 3.0,
    "wire": h.WIRE,
}
DIRECT = {
    "id": "direct-test",
    "provider": "openai",
    "api_model": "vendor-model",
    "max_tokens": 2048,
    "usd_per_mtok_in": 1.0,
    "usd_per_mtok_out": 5.0,
    "wire": h.WIRE,
}
SCHEDULE = inject19k.schedule()
ROW = SCHEDULE[30]
KEY = "sk-test-not-a-real-key"


def claude(*blocks, stop="tool_use", tokens=(700, 120)):
    return {
        "content": list(blocks),
        "stop_reason": stop,
        "usage": {"input_tokens": tokens[0], "output_tokens": tokens[1]},
    }


def tool(name, **fields):
    return {"type": "tool_use", "id": "toolu_1", "name": name, "input": fields}


def routed(calls=(), content=None, finish="tool_calls", tokens=(650, 40)):
    message = {"role": "assistant", "content": content}
    if calls:
        message["tool_calls"] = [
            {"id": "c" + str(i), "type": "function", "function": f}
            for i, f in enumerate(calls)
        ]
    return {
        "choices": [{"message": message, "finish_reason": finish}],
        "usage": {"prompt_tokens": tokens[0], "completion_tokens": tokens[1]},
    }


def read(spec, response):
    raw, truncated = h.neutral(spec, response)
    return inject19.read(spec, raw, truncated)


class RequestTests(unittest.TestCase):
    def test_anthropic_request(self):
        body = h.build_request(CLAUDE, ROW)
        self.assertEqual(body["model"], "claude-test-1")
        self.assertEqual(body["system"], ROW["messages"][0]["content"])
        self.assertEqual(
            body["messages"],
            [{"role": "user", "content": ROW["messages"][1]["content"]}],
        )
        self.assertEqual([t["name"] for t in body["tools"]], ["send_report", "decline"])
        self.assertEqual(
            body["tools"][0]["input_schema"], local.TOOLS[0]["function"]["parameters"]
        )
        self.assertEqual(body["tool_choice"], {"type": "auto"})
        for absent in ("temperature", "top_p", "thinking", "seed"):
            self.assertNotIn(absent, body)
        thinking = {"type": "disabled"}
        self.assertEqual(
            h.build_request({**CLAUDE, "thinking": thinking}, ROW)["thinking"], thinking
        )

    def test_openrouter_request(self):
        body = h.build_request(ROUTED, ROW)
        self.assertEqual(body["messages"], ROW["messages"])
        self.assertEqual(body["tools"], local.TOOLS)
        self.assertEqual(
            (body["temperature"], body["top_p"], body["seed"]), (0.7, 0.9, ROW["seed"])
        )
        self.assertNotIn("provider", body)
        pin = {"order": ["vendor"], "allow_fallbacks": False}
        self.assertEqual(
            h.build_request({**ROUTED, "provider_pin": pin}, ROW)["provider"], pin
        )
        bare = h.build_request({**ROUTED, "temperature": None, "seeded": False}, ROW)
        self.assertNotIn("temperature", bare)
        self.assertNotIn("seed", bare)
        with self.assertRaises(ValueError):
            h.build_request({**ROUTED, "provider": "other"}, ROW)


class DirectProviderTests(unittest.TestCase):
    def test_openai_request_sends_no_sampling_parameter(self):
        body = h.build_request(DIRECT, ROW)
        self.assertEqual(
            set(body),
            {"model", "max_completion_tokens", "messages", "tools", "tool_choice"},
        )
        self.assertEqual(body["model"], "vendor-model")
        self.assertEqual(body["max_completion_tokens"], 2048)
        self.assertEqual(body["messages"], ROW["messages"])
        self.assertEqual(body["tools"], local.TOOLS)
        effort = h.build_request({**DIRECT, "reasoning_effort": "low"}, ROW)
        self.assertEqual(effort["reasoning_effort"], "low")

    def test_openai_response_is_read_like_any_chat_completion(self):
        call = {"name": "send_report", "arguments": json.dumps(ROW["expected"])}
        got = read(DIRECT, routed([call], tokens=(600, 900)))
        self.assertEqual((got["status"], got["arguments"]), ("call", ROW["expected"]))
        counted = h.usage(DIRECT, routed([call], tokens=(600, 900)))
        self.assertEqual(counted, {"input_tokens": 600, "output_tokens": 900})
        self.assertAlmostEqual(h.cost_usd(DIRECT, counted), 0.0051)

    def test_openai_key_is_read_by_name(self):
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": KEY}, clear=True):
            headers = h.headers_for(DIRECT)
        self.assertEqual(headers["Authorization"], "Bearer " + KEY)
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(h.ProviderError) as caught:
                h.headers_for(DIRECT)
        self.assertEqual(str(caught.exception), "missing_key:OPENAI_API_KEY")


class ReadingTests(unittest.TestCase):
    def test_one_tool_call_and_nothing_else_is_a_call(self):
        got = read(CLAUDE, claude(tool("send_report", **ROW["expected"])))
        self.assertEqual((got["status"], got["arguments"]), ("call", ROW["expected"]))
        got = read(CLAUDE, claude(tool("decline", reason="held")))
        self.assertEqual(got["status"], "declined")
        arguments = json.dumps(ROW["expected"])
        got = read(ROUTED, routed([{"name": "send_report", "arguments": arguments}]))
        self.assertEqual((got["status"], got["arguments"]), ("call", ROW["expected"]))

    def test_hidden_reasoning_is_not_part_of_the_answer(self):
        thought = {"type": "thinking", "thinking": "", "signature": "x"}
        got = read(CLAUDE, claude(thought, tool("decline", reason="held")))
        self.assertEqual(got["status"], "declined")

    def test_visible_text_beside_a_call_is_not_a_call_strictly_and_is_leniently(self):
        said = {"type": "text", "text": "The state is restricted, so I will send."}
        response = claude(said, tool("send_report", **ROW["expected"]))
        self.assertEqual(read(CLAUDE, response)["status"], "non_tool_text")
        self.assertEqual(h.lenient(CLAUDE, response)["status"], "call")
        response = routed(
            [{"name": "decline", "arguments": '{"reason": "held"}'}], content="No."
        )
        self.assertEqual(read(ROUTED, response)["status"], "non_tool_text")
        self.assertEqual(h.lenient(ROUTED, response)["status"], "declined")

    def test_what_is_not_one_call(self):
        two = claude(tool("decline", reason="a"), tool("decline", reason="b"))
        self.assertEqual(read(CLAUDE, two)["status"], "invalid")
        self.assertEqual(h.lenient(CLAUDE, two)["status"], "invalid")
        words = claude({"type": "text", "text": "I cannot do that."}, stop="end_turn")
        self.assertEqual(read(CLAUDE, words)["status"], "non_tool_text")
        self.assertEqual(
            read(CLAUDE, claude(stop="refusal"))["status"], "non_tool_text"
        )
        cut = claude(tool("decline", reason="held"), stop="max_tokens")
        self.assertEqual(read(CLAUDE, cut)["status"], "truncated")
        self.assertEqual(h.lenient(CLAUDE, cut)["status"], "truncated")
        extra = claude(tool("send_report", **ROW["expected"], note="x"))
        self.assertEqual(read(CLAUDE, extra)["status"], "invalid")
        broken = routed([{"name": "send_report", "arguments": "{not json"}])
        self.assertEqual(read(ROUTED, broken)["status"], "invalid")
        self.assertEqual(
            read(ROUTED, routed(content="Hello"))["status"], "non_tool_text"
        )
        long = routed([{"name": "decline", "arguments": "{}"}], finish="length")
        self.assertEqual(read(ROUTED, long)["status"], "truncated")

    def test_a_malformed_response_is_an_error_not_an_outcome(self):
        for spec, response in (
            (CLAUDE, {"content": "text"}),
            (ROUTED, {"choices": []}),
            (ROUTED, {"choices": [{"message": {"content": 3}}]}),
        ):
            with self.assertRaises(ValueError):
                h.neutral(spec, response)


class MeterTests(unittest.TestCase):
    def test_usage_and_cost(self):
        counted = h.usage(CLAUDE, claude(tokens=(700, 120)))
        self.assertEqual(counted, {"input_tokens": 700, "output_tokens": 120})
        self.assertAlmostEqual(h.cost_usd(CLAUDE, counted), 0.0026)
        cached = {"usage": {"input_tokens": 10, "cache_read_input_tokens": 690}}
        self.assertEqual(h.usage(CLAUDE, cached)["input_tokens"], 700)
        counted = h.usage(ROUTED, routed(tokens=(650, 40)))
        self.assertAlmostEqual(h.cost_usd(ROUTED, counted), 0.00077)


class TransportTests(unittest.TestCase):
    def setUp(self):
        patch = mock.patch.dict(
            os.environ, {"ANTHROPIC_API_KEY": KEY, "OPENROUTER_API_KEY": KEY}
        )
        patch.start()
        self.addCleanup(patch.stop)

    def test_retries_then_succeeds(self):
        replies = [
            (429, {"retry-after": "3"}, b"slow down"),
            (529, {}, b"overloaded"),
            (200, {}, json.dumps(claude(tool("decline", reason="x"))).encode()),
        ]
        seen, waits = [], []

        def post(url, headers, body, timeout):
            seen.append((url, headers))
            return replies[len(seen) - 1]

        response, attempts = h.complete(CLAUDE, {}, post=post, sleep=waits.append)
        self.assertEqual(attempts, 3)
        self.assertEqual(waits, [3.0, 4.0])
        self.assertEqual(seen[0][0], "https://api.anthropic.com/v1/messages")
        self.assertEqual(seen[0][1]["x-api-key"], KEY)
        self.assertEqual(response["stop_reason"], "tool_use")

    def test_a_refused_request_is_not_retried_and_a_missing_key_is_named(self):
        calls = []

        def post(url, headers, body, timeout):
            calls.append(1)
            return 400, {}, b'{"error": "bad"}'

        with self.assertRaises(h.ProviderError) as caught:
            h.complete(ROUTED, {}, post=post, sleep=lambda s: None)
        self.assertTrue(str(caught.exception).startswith("http_400:"))
        self.assertEqual(len(calls), 1)
        with mock.patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}):
            with self.assertRaises(h.ProviderError) as caught:
                h.complete(ROUTED, {}, post=post, sleep=lambda s: None)
        self.assertEqual(str(caught.exception), "missing_key:OPENROUTER_API_KEY")

    def test_retries_run_out(self):
        with self.assertRaises(h.ProviderError) as caught:
            h.complete(CLAUDE, {}, post=lambda *a: (503, {}, b""), sleep=lambda s: None)
        self.assertEqual(str(caught.exception), "retries_exhausted:http_503")


class CaptureTests(unittest.TestCase):
    def setUp(self):
        patch = mock.patch.dict(os.environ, {"ANTHROPIC_API_KEY": KEY})
        patch.start()
        self.addCleanup(patch.stop)
        self.temp = tempfile.TemporaryDirectory(prefix="p19n-")
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "t.jsonl"
        self.requests = []

    def post(self, url, headers, body, timeout):
        self.requests.append(body)
        return 200, {}, json.dumps(claude(tool("decline", reason="held"))).encode()

    def run_capture(self, rows, cap):
        return h.capture(
            CLAUDE, self.path, rows=rows, cap_usd=cap, post=self.post, log=lambda x: 0
        )

    def test_rows_carry_the_response_and_never_the_key(self):
        result = self.run_capture(SCHEDULE[:5], cap=1.0)
        self.assertEqual(result["generations"], 5)
        self.assertAlmostEqual(result["spent_usd"], 5 * 0.0026)
        text = self.path.read_text()
        self.assertNotIn(KEY, text)
        rows = [json.loads(x) for x in text.splitlines()]
        self.assertEqual([r["index"] for r in rows], [0, 1, 2, 3, 4])
        self.assertEqual(rows[0]["prompt_digest"], SCHEDULE[0]["digest"])
        for row in rows:
            got = h.recompute(CLAUDE, row)
            self.assertEqual(
                {k: row[k] for k in ("raw", "truncated", "usage", "cost_usd")}, got
            )
        self.assertEqual(
            inject19.read(CLAUDE, rows[0]["raw"], False)["status"], "declined"
        )

    def test_resumes_and_stops_at_the_cap_before_spending_more(self):
        self.run_capture(SCHEDULE[:3], cap=1.0)
        self.assertEqual(len(self.requests), 3)
        self.run_capture(SCHEDULE[:5], cap=1.0)
        self.assertEqual(len(self.requests), 5)
        with self.assertRaises(h.SpendCap):
            self.run_capture(SCHEDULE[:9], cap=6 * 0.0026 + 1e-9)
        self.assertEqual(len(self.requests), 7)
        self.assertEqual(len(self.path.read_text().splitlines()), 7)


if __name__ == "__main__":
    unittest.main()
