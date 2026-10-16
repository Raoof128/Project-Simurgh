import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from transfer import (
    Budget,
    decode,
    request,
    summary,
    check_inventory,
    transition,
    WORKFLOWS,
)
from transfer_deps import composed


def response(name="send_report", args=None):
    return {
        "status": "completed",
        "output": [
            {
                "type": "function_call",
                "name": name,
                "arguments": json.dumps(
                    args or {"resource": "inbox", "content": "Report."}
                ),
                "call_id": "call-test",
            }
        ],
    }


class ContractTests(unittest.TestCase):
    def test_decode_exact_and_decline(self):
        self.assertEqual(decode(response())["status"], "call")
        self.assertEqual(
            decode(response("decline", {"reason": "stopped"}))["status"], "declined"
        )

    def test_duplicate_arguments_refused(self):
        r = response()
        r["output"][0]["arguments"] = (
            '{"resource":"inbox","resource":"elsewhere","content":"x"}'
        )
        self.assertEqual(decode(r)["status"], "invalid")

    def test_multiple_calls_and_incomplete_refused(self):
        r = response()
        r["output"] *= 2
        self.assertEqual(decode(r)["status"], "invalid")
        r = response()
        r["status"] = "incomplete"
        self.assertEqual(decode(r)["status"], "truncated")

    def test_message_and_unknown_tool_never_dispatch(self):
        self.assertEqual(
            decode({"status": "completed", "output": [{"type": "message"}]})["status"],
            "non_tool_text",
        )
        self.assertEqual(decode(response("unknown"))["status"], "invalid")

    def test_budget_reserves_failed_attempts_and_rejects_reopen(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "ledger.jsonl"
            b = Budget(p)
            for i in range(64):
                b.reserve(str(i))
            with self.assertRaises(ValueError):
                b.reserve("overflow")
            b.close()
            with self.assertRaises(FileExistsError):
                Budget(p)
            self.assertEqual(len(p.read_text().splitlines()), 64)

    def test_duplicate_attempt_identity(self):
        with tempfile.TemporaryDirectory() as td:
            b = Budget(Path(td) / "ledger")
            b.reserve("a")
            with self.assertRaises(ValueError):
                b.reserve("a")
            b.close()

    def test_request_fixed_safety_bounds(self):
        r = request([{"role": "user", "content": "x"}])
        self.assertFalse(r["store"])
        self.assertFalse(r["parallel_tool_calls"])
        self.assertEqual(r["max_output_tokens"], 256)
        self.assertTrue(all(t["strict"] for t in r["tools"]))

    def test_inventory_rejects_empty_duplicate_and_missing(self):
        slots = [("a", 0), ("b", 0)]
        check_inventory([{"task_id": a, "trial": b} for a, b in slots], slots)
        for rows in [
            [],
            [{"task_id": "a", "trial": 0}] * 2,
            [{"task_id": "a", "trial": 0}],
        ]:
            with self.assertRaises(ValueError):
                check_inventory(rows, slots)

    def test_summary_keeps_missing_output_in_denominator(self):
        tasks = [
            {
                "id": "a",
                "state": "active",
                "expected": {"resource": "inbox", "content": "x"},
            }
        ]
        gs = [
            {"id": "g1", "task_id": "a", "trial": 0, "proposal": {"status": "invalid"}}
        ]
        cap = {
            "generations": gs,
            "rows": [
                {
                    "generation": "g1",
                    "task_id": "a",
                    "trial": 0,
                    "control": c,
                    "status": "invalid",
                    "new_effects": [],
                    "before_effects": [],
                }
                for c in ["credential_only", "composed", "deny_all"]
            ],
        }
        s = summary(cap, tasks)
        self.assertEqual(s["controls"]["composed"]["active_slots"], 1)
        self.assertEqual(s["controls"]["composed"]["active_completions"], 0)
        self.assertIsNone(
            s["controls"]["composed"]["stopped_task_wilson95_descriptive"]
        )

    def test_actual_reopen_and_interrupted_hold(self):
        with tempfile.TemporaryDirectory() as td:
            for case, expected in [
                ("authorized_reopen", "observed"),
                ("interrupted_update", "blocked"),
                ("operator_restart", "observed"),
            ]:
                f = composed.Fixture("test-" + case, "composed", Path(td) / case)
                try:
                    transition(f, case)
                    self.assertEqual(f.deliver()["status"], expected)
                finally:
                    f.service.close()


if __name__ == "__main__":
    unittest.main()


class EvidenceTests(unittest.TestCase):
    def test_every_lifecycle_has_real_expected_effects(self):
        from transfer import workflow_replay, ACTIVE

        for case in WORKFLOWS:
            with self.subTest(case=case), tempfile.TemporaryDirectory() as td:
                route = "b" if case == "unknown_prior" else "a"
                expected = {
                    k: composed.actions_for("transfer-" + case)[route][k]
                    for k in ("resource", "content")
                }
                row, files = workflow_replay(
                    case,
                    {"status": "call", "name": "send_report", "arguments": expected},
                    Path(td) / "run",
                )
                self.assertEqual(len(row["new_effects"]), int(case in ACTIVE))
                self.assertEqual(
                    len(row["before_effects"]), int(case == "unknown_prior")
                )
                self.assertEqual(len(files), 10)

    def test_raw_storage_rejects_rewritten_effects(self):
        from transfer import workflow_replay
        from transfer_study import check_raw

        with tempfile.TemporaryDirectory() as td:
            row, files = workflow_replay(
                "active",
                {
                    "status": "declined",
                    "name": "decline",
                    "arguments": {"reason": "test"},
                },
                Path(td) / "run",
            )
            check_raw(row, files, "snapshots/active-", Path(td) / "raw")
            row["new_effects"] = [{"invented": "effect"}]
            with self.assertRaisesRegex(ValueError, "raw_snapshot"):
                check_raw(row, files, "snapshots/active-", Path(td) / "raw")

    def test_request_binding_detects_prompt_and_call_identity_change(self):
        from transfer_study import check_call

        b = request([{"role": "user", "content": "test"}])
        c = {
            "id": "a",
            "request": b,
            "attempt": {"id": "a"},
            "seconds": 1.0,
            "status": "http_error",
        }
        check_call(c, b, "a")
        with self.assertRaises(ValueError):
            check_call(c, b, "b")
        altered = copy.deepcopy(b)
        altered["input"][0]["content"] = "changed"
        with self.assertRaises(ValueError):
            check_call(c, altered, "a")

    def test_roundtrip_preserves_reasoning_and_call_id(self):
        from transfer import workflow_second

        r = response("read_work_item")
        r["output"][0]["arguments"] = "{}"
        r["output"].insert(0, {"type": "reasoning", "id": "reason-test", "summary": []})
        second = workflow_second("active", r)
        self.assertIn(r["output"][0], second)
        outputs = [x for x in second if x.get("type") == "function_call_output"]
        self.assertEqual(outputs[0]["call_id"], "call-test")

    def test_archive_duplicate_and_wrong_root_reject(self):
        import zipfile
        from transfer_study import read_pack

        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "pack.zip"
            with zipfile.ZipFile(p, "w") as z:
                for n in ["manifest.json", "a", "b", "c"]:
                    z.writestr(n, b"{}")
            with self.assertRaisesRegex(ValueError, "manifest_root"):
                read_pack(p, "0" * 64)
