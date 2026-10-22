import copy
import io
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import comparison as c


def response():
    return {
        "id": "resp_test",
        "model": "gpt-6-luna",
        "status": "completed",
        "output": [
            {
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "output_text",
                        "text": '{"name":"read_document","arguments":{"resource":"public"}}',
                    }
                ],
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
    def test_response_derived_proposal(self):
        value = c.decode_response(response())
        self.assertEqual(c.proposal(value)["arguments"], {"resource": "public"})

    def test_refusal_or_incomplete_cannot_execute(self):
        for kind in ("refusal", "incomplete"):
            r = response()
            if kind == "refusal":
                r["output"][0]["content"].append({"type": "refusal", "refusal": "No"})
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
        self.assertNotIn("tools", body)
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
