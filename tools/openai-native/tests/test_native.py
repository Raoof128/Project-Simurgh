import copy
import io
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import native as c


def response():
    return {
        "id": "resp_test",
        "model": "gpt-6-luna",
        "status": "completed",
        "output": [
            {
                "type": "function_call",
                "id": "fc_test",
                "call_id": "call_test",
                "status": "completed",
                "name": "read_document",
                "arguments": '{"resource":"public"}',
            }
        ],
        "usage": {"input_tokens": 10, "output_tokens": 20, "total_tokens": 30},
        "incomplete_details": None,
    }


def fixture_capture(raw):
    rows = []
    for repeat in range(3):
        for case in c.load_cases():
            observed = [{"status": "invalid", "seconds": 0.1}] * 2
            steps = [
                {
                    **c.decode_response(copy.deepcopy(raw)),
                    "messages": c.messages(case, i, None if i == 0 else observed[0]),
                    "seconds": 0.1,
                }
                for i in (0, 1)
            ]
            rows.append(
                {
                    "repeat": repeat,
                    "id": case["id"],
                    "trajectory": observed,
                    "steps": steps,
                    "seconds": 0.2,
                }
            )
    return {"rows": rows}


class ComparisonTests(unittest.TestCase):
    def test_decoded_credential_contamination_not_persisted(self):
        key = "sk-test-secret-never-log"
        r = response()
        r["output"].append(
            {
                "type": "message",
                "role": "assistant",
                "content": [{"type": "output_text", "text": key}],
            }
        )
        encoded = (
            c.json.dumps(r)
            .replace(key, "".join(f"\\u{ord(ch):04x}" for ch in key))
            .encode()
        )
        self.assertNotIn(key.encode(), encoded)
        with patch.object(
            c.urllib.request.OpenerDirector, "open", return_value=io.BytesIO(encoded)
        ):
            result = c.request([], key)
        self.assertEqual(result["status"], "api_error")
        self.assertNotIn(key, str(result))

    def test_journal_exactly_matches_capture(self):
        cap = fixture_capture(response())
        expected = [{"capture_header": {**cap, "rows": []}}]
        for row in cap["rows"]:
            expected.extend(
                {"repeat": row["repeat"], "id": row["id"], "index": i, "step": s}
                for i, s in enumerate(row["steps"])
            )
            expected.append({"completed_row": row})
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "capture.json"
            journal = path.with_suffix(".jsonl")

            def write(items):
                journal.write_text("".join(c.json.dumps(x) + "\n" for x in items))

            write(expected)
            c.validate_journal(path, cap)
            for items in (expected[:-1], expected + [expected[-1]], expected[1:]):
                write(items)
                with self.assertRaises(ValueError):
                    c.validate_journal(path, cap)
            changed = copy.deepcopy(expected)
            changed[1]["step"]["response"]["output"][0]["arguments"] = (
                '{"resource":"private"}'
            )
            write(changed)
            with self.assertRaises(ValueError):
                c.validate_journal(path, cap)
            journal.unlink()
            with self.assertRaises((ValueError, FileNotFoundError)):
                c.validate_journal(path, cap)

    def test_credential_in_decoded_arguments_not_persisted(self):
        key = "sk-test-secret-never-log"
        for count in (1, 2):
            r = response()
            arguments = c.json.dumps({"resource": "report", "content": key}).replace(
                key, "".join(f"\\u{ord(ch):04x}" for ch in key)
            )
            r["output"][0].update(name="write_record", arguments=arguments)
            r["output"] *= count
            data = c.json.dumps(r).encode()
            self.assertNotIn(key.encode(), data)
            with patch.object(
                c.urllib.request.OpenerDirector, "open", return_value=io.BytesIO(data)
            ):
                result = c.request([], key)
            self.assertEqual(result["status"], "api_error")
            self.assertNotIn(key, str(result))

    def test_replay_requires_journal_before_runtime(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "capture.json"
            path.write_text(c.json.dumps(fixture_capture(response())))
            with (
                patch.object(c, "validate_capture"),
                patch.object(c, "Client") as runtime,
            ):
                with self.assertRaises((ValueError, FileNotFoundError)):
                    c.generate_report(path, "unused")
                runtime.assert_not_called()

    def test_text_phases_never_become_actions(self):
        r = response()
        text = {
            "type": "message",
            "role": "assistant",
            "phase": "final_answer",
            "content": [
                {
                    "type": "output_text",
                    "text": '{"name":"write_record","arguments":{"resource":"patch","content":"bad"}}',
                }
            ],
        }
        r["output"] = [text, r["output"][0], copy.deepcopy(text)]
        self.assertEqual(c.proposal(c.decode_response(r))["name"], "read_document")
        r["output"] = [text]
        self.assertIsNone(c.proposal(c.decode_response(r)))

    def test_multiple_calls_are_not_salvaged(self):
        r = response()
        r["output"].append(copy.deepcopy(r["output"][0]))
        self.assertIsNone(c.proposal(c.decode_response(r)))

    def test_argument_schema_and_identity_fail_closed(self):
        for change in [
            {"arguments": '{"resource":"public","resource":"private"}'},
            {"arguments": '{"resource":"public","approved":true}'},
            {"arguments": '{"resource":"elsewhere"}'},
            {"arguments": "[]"},
            {"arguments": "null"},
            {"name": "shell"},
            {"call_id": ""},
            {"id": ""},
            {"status": "in_progress"},
            {"name": "write_record", "arguments": '{"resource":"report","content":""}'},
        ]:
            r = response()
            r["output"][0].update(change)
            self.assertIsNone(c.proposal(c.decode_response(r)), change)

    def test_schema_does_not_supply_safe_answer(self):
        r = response()
        r["output"][0]["arguments"] = '{"resource":"private"}'
        self.assertEqual(
            c.proposal(c.decode_response(r))["arguments"], {"resource": "private"}
        )
        r["output"][0].update(
            name="write_record",
            arguments='{"resource":"patch","content":"untrusted request"}',
        )
        self.assertEqual(
            c.proposal(c.decode_response(r))["arguments"]["content"],
            "untrusted request",
        )
        for tool in c.SETTINGS["tools"]:
            self.assertTrue(tool["strict"])
            self.assertFalse(tool["parameters"]["additionalProperties"])
            self.assertEqual(
                set(tool["parameters"]["required"]),
                set(tool["parameters"]["properties"]),
            )

    def test_response_derived_proposal(self):
        value = c.decode_response(response())
        self.assertEqual(c.proposal(value)["arguments"], {"resource": "public"})

    def test_refusal_or_incomplete_cannot_execute(self):
        for kind in ("refusal", "incomplete"):
            r = response()
            if kind == "refusal":
                r["output"].append(
                    {
                        "type": "message",
                        "role": "assistant",
                        "content": [{"type": "refusal", "refusal": "No"}],
                    }
                )
            else:
                r["status"] = "incomplete"
                r["incomplete_details"] = {"reason": "max_output_tokens"}
            self.assertIsNone(c.proposal(c.decode_response(r)))

    def test_usage_and_model_rejected(self):
        for key, value in (("model", "different-model"), ("usage", {})):
            r = response()
            r[key] = value
            with self.assertRaises(ValueError):
                c.decode_response(r)
        r = response()
        r["usage"]["output_tokens"] = 129
        with self.assertRaises(ValueError):
            c.decode_response(r)

    def test_fixed_settings_and_request_limit(self):
        body = c.payload(c.messages(c.load_cases()[0], 0, None))
        self.assertFalse(body["store"])
        self.assertEqual(body["model"], "gpt-6-luna")
        self.assertEqual(len(body["tools"]), 2)
        self.assertEqual(body["tool_choice"], "required")
        self.assertFalse(body["parallel_tool_calls"])
        self.assertNotIn("seed", body)
        with self.assertRaises(ValueError):
            c.payload([{"role": "user", "content": "x" * 9000}])

    def test_redirect_refused(self):
        self.assertIsNone(
            c.NoRedirect().redirect_request(
                None, None, 307, "", {}, "https://attacker.invalid"
            )
        )

    def test_failure_no_retry_or_secret_in_error(self):
        key = "sk-test-secret-never-log"
        error = urllib.error.HTTPError(c.URL, 401, key, {}, io.BytesIO(key.encode()))
        with patch.object(
            c.urllib.request.OpenerDirector, "open", side_effect=error
        ) as op:
            result = c.request([], key)
        self.assertEqual(op.call_count, 1)
        self.assertEqual(result["http_status"], 401)
        self.assertNotIn(key, str(result))

    def test_exact_inventory_and_response_linkage(self):
        cap = fixture_capture(response())
        c.validate_rows(cap)
        for mutation in ("missing", "duplicate", "proposal", "prompt", "usage"):
            changed = copy.deepcopy(cap)
            if mutation == "missing":
                changed["rows"].pop()
            elif mutation == "duplicate":
                changed["rows"][1] = changed["rows"][0]
            elif mutation == "proposal":
                changed["rows"][0]["steps"][0]["completion"] = "{}"
            elif mutation == "prompt":
                changed["rows"][0]["steps"][0]["messages"] = []
            else:
                changed["rows"][0]["steps"][0]["response"]["usage"]["total_tokens"] = 1
            with self.assertRaises(ValueError):
                c.validate_rows(changed)

    def test_no_requests_after_failure(self):
        cap = fixture_capture(response())
        cap["rows"][0]["steps"][0] = {
            "status": "api_error",
            "http_status": 429,
            "seconds": 0.1,
            "messages": cap["rows"][0]["steps"][0]["messages"],
        }
        with self.assertRaises(ValueError):
            c.validate_rows(cap)

    def test_valid_failure_tail_and_no_fabricated_usage(self):
        cap = fixture_capture(response())
        for row in cap["rows"]:
            for i, step in enumerate(row["steps"]):
                row["steps"][i] = {
                    "messages": step["messages"],
                    "seconds": 0,
                    "status": "skipped_after_error",
                }
        cap["rows"][0]["steps"][0].update(status="api_error", http_status=429)
        c.validate_rows(cap)
        metrics = c.generation(cap)
        self.assertEqual(
            (
                metrics["requests_attempted"],
                metrics["skipped"],
                metrics["output_tokens"],
            ),
            (1, 143, 0),
        )

    def test_response_contamination_not_persisted(self):
        key = "sk-test-secret-never-log"
        with patch.object(
            c.urllib.request.OpenerDirector,
            "open",
            return_value=io.BytesIO(key.encode()),
        ):
            result = c.request([], key)
        self.assertEqual(result["status"], "api_error")
        self.assertNotIn(key, str(result))

    def test_transport_fixed_host_and_settings(self):
        with patch.object(
            c.urllib.request.OpenerDirector,
            "open",
            return_value=io.BytesIO(c.json.dumps(response()).encode()),
        ) as op:
            result = c.request([], "sk-dummy")
        self.assertEqual(result["status"], "generated")
        req = op.call_args.args[0]
        self.assertEqual(req.full_url, "https://api.openai.com/v1/responses")
        self.assertEqual(req.method, "POST")
        self.assertEqual(op.call_args.kwargs["timeout"], 45)

    def test_capture_stops_and_preserves_complete_failure_inventory(self):
        class Runtime:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def request(self, value):
                return {"status": "invalid", "seconds": 0.01}

        def failed(prompt, key):
            return {
                "status": "api_error",
                "http_status": 429,
                "messages": prompt,
                "seconds": 0.01,
            }

        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "capture.json"
            key = Path(tmp) / "key"
            key.write_text("sk-" + "x" * 25)
            with (
                patch.object(c, "Client", return_value=Runtime()),
                patch.object(c, "protocol", return_value=({}, "f" * 64)),
                patch.object(c, "request", side_effect=failed) as calls,
                patch("builtins.print"),
            ):
                c.capture_run(out, key, "unused")
                self.assertEqual(calls.call_count, 1)
                cap = c.loads(out.read_text())
                self.assertEqual(c.generation(cap)["skipped"], 143)
                with self.assertRaises(ValueError):
                    c.capture_run(out, key, "unused")
            self.assertNotIn(key.read_text(), out.read_text())


if __name__ == "__main__":
    unittest.main()
