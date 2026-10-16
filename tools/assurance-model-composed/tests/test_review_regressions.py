"""Regressions for the fresh pre-freeze review findings."""

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import token_check
import trial
from model_inputs import wire
from test_contract import task

import audit


class ReviewRegressions(unittest.TestCase):
    def test_authorized_lost_ack_is_unknown_not_unauthorized(self):
        original = trial.Service

        class DroppingService(original):
            def login(self, *args, **kwargs):
                client = super().login(*args, **kwargs)
                self.drop_next()
                return client

        c = task()
        with (
            tempfile.TemporaryDirectory() as td,
            patch.object(trial, "Service", DroppingService),
        ):
            row, _ = trial.run_branch(
                c,
                0,
                "composed",
                "g1",
                {"status": "call", "arguments": c["expected"]},
                Path(td) / "run",
            )
        output = {
            "status": "generated",
            "raw": json.dumps({"name": "send_report", "parameters": c["expected"]}),
            "truncated": False,
            "seconds": 0.1,
        }
        cap = {
            "generations": [
                {"id": "g1", "task_id": c["id"], "batch": 0, "output": output}
            ],
            "rows": [row],
            "requests": [{"batch": 0}],
        }
        result = audit.summarize(cap, [c])["controls"]["composed"]
        self.assertEqual(row["status"], "unknown")
        self.assertEqual(len(row["new_effects"]), 1)
        self.assertEqual(result["new_unauthorized_effect_branches"], 0)
        self.assertEqual(result["active_completion"], 0)
        row["new_effects"][0]["action"]["content"] = "Unauthorized replacement."
        self.assertEqual(
            audit.summarize(cap, [c])["controls"]["composed"][
                "new_unauthorized_effect_branches"
            ],
            1,
        )

    def test_token_check_rejects_vacuous_invented_or_missing_slots(self):
        for cap in (
            {"generations": []},
            {"generations": [{"output": {"status": "invented"}}]},
        ):
            with self.subTest(cap=cap), self.assertRaises(ValueError):
                token_check.check(cap, [task()], None, {})

    def test_token_receipt_binds_capture_and_counts_checked_and_errors(self):
        c = task()
        raw = '{"name":"decline","parameters":{"reason":"test"}}'

        class Tokenizer:
            def apply_chat_template(self, *a, **kw):
                return "rendered"

            def __call__(self, *a, **kw):
                return {"input_ids": [1]}

            def decode(self, ids, skip_special_tokens):
                return raw if skip_special_tokens else "rendered"

        settings = {
            "date_string": "16 Oct 2026",
            "eos_token_ids": [9],
            "max_input_tokens": 10,
            "max_new_tokens": 10,
        }
        out = {
            "status": "generated",
            "raw": raw,
            "truncated": False,
            "seconds": 0.1,
            "input_token_ids": [1],
            "generated_token_ids": [2, 9],
            "rendered_prompt": "rendered",
        }
        g = {
            "id": "g1",
            "task_id": c["id"],
            "trial": 0,
            "batch": 0,
            "position": 0,
            "seed": 104000,
            "output": out,
        }
        cap = {"generations": [g]}
        receipt = token_check.check(
            cap, [c], Tokenizer(), settings, trials=(0,), heldout=False
        )
        self.assertEqual(
            receipt["capture_sha256"], hashlib.sha256(wire(cap)).hexdigest()
        )
        self.assertEqual(receipt["checked_generations"], 1)
        self.assertEqual(receipt["generation_errors"], 0)
        for change in ("duplicate", "status", "text"):
            bad = copy.deepcopy(cap)
            if change == "duplicate":
                bad["generations"].append(bad["generations"][0])
            if change == "status":
                bad["generations"][0]["output"]["status"] = "invented"
            if change == "text":
                bad["generations"][0]["output"]["raw"] = "invented"
            with self.subTest(change=change), self.assertRaises(ValueError):
                token_check.check(
                    bad, [c], Tokenizer(), settings, trials=(0,), heldout=False
                )
        mixed = copy.deepcopy(cap)
        error_slot = copy.deepcopy(g)
        error_slot.update(id="g2", trial=1, position=1)
        error_slot["output"] = {
            "status": "generation_error",
            "error": "RuntimeError",
            "raw": "",
            "truncated": False,
            "seconds": 0.1,
        }
        mixed["generations"].append(error_slot)
        receipt = token_check.check(
            mixed, [c], Tokenizer(), settings, trials=(0, 1), heldout=False
        )
        self.assertEqual(receipt["checked_generations"], 1)
        self.assertEqual(receipt["generation_errors"], 1)
        g["output"] = {
            "status": "generation_error",
            "error": "RuntimeError",
            "raw": "",
            "truncated": False,
            "seconds": 0.1,
        }
        with self.assertRaises(ValueError):
            token_check.check(
                cap, [c], Tokenizer(), settings, trials=(0,), heldout=False
            )


if __name__ == "__main__":
    unittest.main()
