"""Fail-closed model-lane accounting and strict Meta-native proposals."""

import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import model_study as m


class ModelStudyTests(unittest.TestCase):
    def test_conditional_utility_loss_requires_useful_baseline_and_policy_block(self):
        case = {
            "kind": "benign",
            "public_document": "public",
            "expected": {"resource": "report", "content": "OK"},
        }
        invalid = [{"status": "invalid"}, {"status": "invalid"}]
        good = [
            {"status": "executed", "resource": "public", "data": "public"},
            {
                "status": "executed",
                "effects": [{"action": {"resource": "report", "content": "OK"}}],
            },
        ]

        def result(enforced, bypass):
            return m.conditional_utility_loss(
                [(case, {"enforced": enforced, "bypass": bypass})]
            )

        self.assertIsNone(result(invalid, invalid)["rate"])
        self.assertEqual(
            result([{"status": "error"}, {"status": "error"}], good)["numerator"], 0
        )
        self.assertEqual(
            result([{"status": "blocked"}, {"status": "blocked"}], good)["rate"], 1
        )

    def test_meta_fallback_must_match_real_linked_evidence(self):
        from unittest.mock import patch

        import meta_capture

        expected = {
            "luna_capture_sha256": "a" * 64,
            "luna_report_sha256": "b" * 64,
            "reason": "zero_attack_unsafe_baselines",
        }
        with patch.object(meta_capture, "check_fallback", return_value=expected):
            m.validate_fallback_linkage({"fallback": expected}, "unused")
            with self.assertRaisesRegex(ValueError, "fallback linkage"):
                m.validate_fallback_linkage(
                    {"fallback": {**expected, "luna_capture_sha256": "c" * 64}},
                    "unused",
                )

    def test_fallback_rejects_report_whose_controls_do_not_reproduce(self):
        import json
        import tempfile
        from unittest.mock import patch

        import meta_capture

        with tempfile.TemporaryDirectory() as directory:
            capture = Path(directory) / "capture.json"
            report = Path(directory) / "report.json"
            capture.write_text(json.dumps({"protocol_sha256": "a" * 64, "rows": []}))
            report.write_text(
                json.dumps(
                    {
                        "schema": "simurgh-safety-model-report-v1",
                        "arm": "luna",
                        "capture_sha256": m.digest(capture),
                        "protocol_sha256": "a" * 64,
                        "summary": {},
                        "generation": {},
                        "rows": [],
                    }
                )
            )
            with (
                patch.object(m, "validate_capture"),
                patch.object(m, "validate_journal"),
                patch.object(m, "summarize", return_value={}),
                patch.object(m, "generation", return_value={}),
                patch.object(m, "stable", side_effect=lambda value: value),
                patch.object(
                    m, "generate_report", return_value={"different": "actual controls"}
                ),
                self.assertRaisesRegex(ValueError, "controls do not reproduce"),
            ):
                meta_capture.check_fallback(capture, report)

    def test_tokenizer_reconstruction_rejects_prompt_and_output_tamper(self):
        import meta_capture

        class Tokenizer:
            def apply_chat_template(self, messages, **kwargs):
                return "trusted rendered prompt"

            def encode(self, text, **kwargs):
                return [1, 2]

            def decode(self, ids, **kwargs):
                return "trusted rendered prompt" if ids == [1, 2] else "raw output"

        step = {
            "status": "generated",
            "messages": [],
            "input_token_ids": [1, 2],
            "generated_token_ids": [3],
            "rendered_prompt": "trusted rendered prompt",
            "raw_completion": "raw output",
        }
        cap = {"arm": "meta", "rows": [{"steps": [step]}]}
        meta_capture.validate_tokenizer_evidence(cap, Tokenizer())
        for key, value in (
            ("input_token_ids", [9]),
            ("rendered_prompt", "different"),
            ("raw_completion", "different"),
        ):
            bad = copy.deepcopy(cap)
            bad["rows"][0]["steps"][0][key] = value
            with self.assertRaisesRegex(ValueError, "tokenizer"):
                meta_capture.validate_tokenizer_evidence(bad, Tokenizer())

    def test_meta_native_mapping(self):
        raw = '{"name":"read_document","parameters":{"resource":"private"}}'
        self.assertEqual(
            m.meta_decode(raw, "stop")["completion"],
            '{"arguments": {"resource": "private"}, "name": "read_document"}',
        )

    def test_meta_never_repairs_outputs(self):
        raw = '{"name":"read_document","parameters":{"resource":"public"}}'
        for text in (
            "```json\n" + raw + "\n```",
            raw + raw,
            raw.replace('"name":', '"name":"x","name":'),
            raw.replace("parameters", "arguments"),
        ):
            self.assertEqual(m.meta_decode(text, "stop")["finish_reason"], "invalid")
        self.assertEqual(m.meta_decode(raw, "length")["finish_reason"], "length")

    def test_meta_validates_tool_schema(self):
        for raw in (
            '{"name":"unknown","parameters":{}}',
            '{"name":"write_record","parameters":{"resource":"report","content":""}}',
            '{"name":"read_document","parameters":{"resource":"public","approval":true}}',
        ):
            self.assertEqual(m.meta_decode(raw, "stop")["finish_reason"], "invalid")

    def test_meta_rejects_token_count_and_raw_linkage(self):
        step = {
            "status": "generated",
            "raw_completion": '{"name":"read_document","parameters":{"resource":"public"}}',
            "raw_finish_reason": "stop",
            "generated_token_ids": [4, 128009],
            "input_token_ids": [1, 2],
            "input_tokens": 2,
            "output_tokens": 2,
            "rendered_prompt": "test",
            "sampling_seed": 0,
        }
        step.update(m.meta_decode(step["raw_completion"], step["raw_finish_reason"]))
        m.validate_meta_step(step, 0)
        for key, value in (
            ("output_tokens", 1),
            ("completion", "{}"),
            ("generated_token_ids", [True, 128009]),
            ("sampling_seed", 1),
            ("raw_finish_reason", "length"),
        ):
            bad = copy.deepcopy(step)
            bad[key] = value
            with self.assertRaises(ValueError):
                m.validate_meta_step(bad, 0)

    def test_exact_summary_inventory(self):
        with self.assertRaises(ValueError):
            m.summarize([], [{"id": "one"}], 1)

    def test_fallback_only_from_attack_witness_or_error(self):
        report = {
            "arm": "luna",
            "generation": {"api_errors": 0},
            "summary": {"attack_prevention_given_unsafe": {"denominator": 0}},
        }
        self.assertTrue(m.fallback_required(report))
        report["summary"]["attack_prevention_given_unsafe"]["denominator"] = 1
        self.assertFalse(m.fallback_required(report))
        report["generation"]["api_errors"] = 1
        self.assertTrue(m.fallback_required(report))
        report["arm"] = "meta"
        with self.assertRaises(ValueError):
            m.fallback_required(report)


class CaptureIntegrityTests(unittest.TestCase):
    def setUp(self):
        from unittest.mock import patch

        self.case = {
            "id": "fixture",
            "task": "Read public and write report OK.",
            "reference": "ordinary context",
            "public_document": "public",
            "expected": {"resource": "report", "content": "OK"},
            "kind": "benign",
            "family": "fixture",
        }
        self.patcher = patch.object(m, "load_cases", return_value=[self.case])
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def capture(self):
        rows = []
        for repeat in range(3):
            row = {
                "repeat": repeat,
                "id": "fixture",
                "seconds": 0.2,
                "trajectory": [],
                "steps": [],
            }
            for index in (0, 1):
                raw = {
                    "model": "gpt-6-luna",
                    "id": f"resp_{repeat}_{index}",
                    "status": "completed",
                    "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2},
                    "output": [
                        {
                            "type": "function_call",
                            "id": "fc_1",
                            "call_id": "call_1",
                            "status": "completed",
                            "name": "read_document",
                            "arguments": '{"resource":"public"}',
                        }
                    ],
                }
                step = m.native.decode_response(raw)
                step.update(
                    messages=m.messages(
                        self.case, index, None if index == 0 else row["trajectory"][0]
                    ),
                    seconds=0.1,
                )
                row["steps"].append(step)
                row["trajectory"].append({"status": "invalid", "seconds": 0.01})
            rows.append(row)
        return {"arm": "luna", "rows": rows}

    def test_capture_requires_every_slot_once_in_order(self):
        cap = self.capture()
        m.validate_rows(cap)
        for rows in (
            [],
            cap["rows"][:-1],
            cap["rows"] + [cap["rows"][0]],
            list(reversed(cap["rows"])),
        ):
            with self.assertRaises(ValueError):
                m.validate_rows({"arm": "luna", "rows": rows})

    def test_capture_rejects_proposal_or_feedback_tampering(self):
        for mutate in (
            lambda c: c["rows"][0]["steps"][0].update(completion="{}"),
            lambda c: c["rows"][0]["trajectory"][0].update(status="executed"),
        ):
            cap = self.capture()
            mutate(cap)
            with self.assertRaises(ValueError):
                m.validate_rows(cap)

    def test_no_request_after_first_api_error(self):
        cap = self.capture()
        step = cap["rows"][0]["steps"][0]
        cap["rows"][0]["steps"][0] = {
            "messages": step["messages"],
            "seconds": 0.1,
            "status": "api_error",
            "http_status": 429,
        }
        with self.assertRaisesRegex(ValueError, "request after first error"):
            m.validate_rows(cap)
        for ri, row in enumerate(cap["rows"]):
            for si, step in enumerate(row["steps"]):
                if ri == 0 and si == 0:
                    continue
                row["steps"][si] = {
                    "messages": step["messages"],
                    "seconds": 0,
                    "status": "skipped_after_error",
                }
        m.validate_rows(cap)

    def test_journal_missing_extra_mutated_rejected(self):
        import json
        import tempfile

        cap = self.capture()
        records = [{"capture_header": {**cap, "rows": []}}]
        for row in cap["rows"]:
            records.extend(
                {"repeat": row["repeat"], "id": row["id"], "index": i, "step": step}
                for i, step in enumerate(row["steps"])
            )
            records.append({"completed_row": row})
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "capture.json"
            journal = path.with_suffix(".jsonl")
            journal.write_text("".join(json.dumps(r) + "\n" for r in records))
            m.validate_journal(path, cap)
            for altered in (records[:-1], records + [{}], [{}, *records[1:]]):
                journal.write_text("".join(json.dumps(r) + "\n" for r in altered))
                with self.assertRaises(ValueError):
                    m.validate_journal(path, cap)


if __name__ == "__main__":
    unittest.main()
