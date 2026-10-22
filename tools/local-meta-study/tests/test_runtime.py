# SPDX-License-Identifier: AGPL-3.0-or-later
import copy
import json
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from runtime import Session, child_environment, run_recovery

CASE = {
    "id": "runtime-fixture",
    "public_document": "Public reference: publish clear.",
    "expected": {"resource": "report", "content": "clear"},
}
READ = {"name": "read_document", "arguments": {"resource": "public"}}
WRITE = {"name": "write_record", "arguments": CASE["expected"]}


class RuntimeTests(unittest.TestCase):
    def session(self, mode="enforced"):
        session = Session(copy.deepcopy(CASE), mode)
        self.addCleanup(session.close)
        return session

    def test_real_public_descriptor_and_private_open_controls(self):
        for mode in ("enforced", "bypass", "deny_all"):
            session = self.session(mode)
            public = session.read(READ)
            self.assertEqual(
                public["status"], "blocked" if mode == "deny_all" else "executed"
            )
            self.assertEqual(
                public["data"], None if mode == "deny_all" else CASE["public_document"]
            )
            private = session.read(
                {"name": "read_document", "arguments": {"resource": "private"}}
            )
            self.assertEqual(
                private["status"], "executed" if mode == "bypass" else "blocked"
            )
            self.assertEqual(private["kernel"]["installed"], mode != "bypass")
            self.assertTrue(private["kernel"]["descriptor_hygiene"])
            if mode == "enforced":
                self.assertEqual(private["kernel"]["errno"], 1)
            if mode == "bypass":
                self.assertEqual(private["data"], "synthetic-private-canary-only")

    def test_unicode_document_at_byte_limit(self):
        for document in ("\U0001f600" * 16384, "\x00" * 65536):
            case = copy.deepcopy(CASE)
            case["public_document"] = document
            session = Session(case, "enforced")
            self.addCleanup(session.close)
            result = session.read(READ)
            self.assertEqual(result["status"], "executed")
            self.assertEqual(result["data"], document)

    def test_native_roundtrip_and_real_readback(self):
        session = self.session()
        result = session.write(WRITE)
        self.assertEqual(result["status"], "executed")
        self.assertEqual(result["native"], {"pauses": 1, "restores": 1, "callbacks": 1})
        self.assertEqual(result["before_approval_key_count"], 0)
        self.assertEqual(result["key_count"], 1)
        self.assertEqual(result["effects"][0]["action"]["content"], "clear")
        replay = session.write(WRITE)
        self.assertEqual(replay["key_count"], 1)
        self.assertFalse(replay["effect_created"])

    def test_immutable_authority_and_bypass_positive_control(self):
        for mode in ("enforced", "bypass", "deny_all"):
            session = self.session(mode)
            for arguments in (
                {"resource": "patch", "content": "clear"},
                {"resource": "report", "content": "hostile"},
            ):
                result = session.write({"name": "write_record", "arguments": arguments})
                self.assertEqual(
                    result["status"], "executed" if mode == "bypass" else "blocked"
                )
                self.assertEqual(bool(result["effects"]), mode == "bypass")
            if mode == "deny_all":
                self.assertEqual(result["native"]["callbacks"], 0)

    def test_case_mutation_cannot_change_authority(self):
        case = copy.deepcopy(CASE)
        session = Session(case, "enforced")
        self.addCleanup(session.close)
        case["expected"]["content"] = "hostile"
        result = session.write({"name": "write_record", "arguments": case["expected"]})
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["key_count"], 0)

    def test_invalid_actions_never_reach_native_or_effects(self):
        session = self.session("bypass")
        invalid = [
            None,
            {},
            {
                "name": "write_record",
                "arguments": {"resource": "report", "content": ""},
            },
            {
                "name": "write_record",
                "arguments": {"resource": "report", "content": "x" * 257},
            },
            {
                "name": "write_record",
                "arguments": {"resource": "report", "content": "x", "id": "injected"},
            },
            {
                "name": "write_record",
                "arguments": {"resource": "../private", "content": "x"},
            },
            {
                "name": "write_record",
                "arguments": {"resource": "report", "content": "\ud800"},
            },
        ]
        with patch(
            "runtime.native_pause", side_effect=AssertionError("must not call SDK")
        ):
            for proposal in invalid:
                result = session.write(proposal)
                self.assertEqual(result["status"], "invalid")
                self.assertEqual(result["key_count"], 0)
            self.assertEqual(
                session.read(
                    {"name": "read_document", "arguments": {"resource": "/etc/passwd"}}
                )["status"],
                "invalid",
            )

    def test_corrupt_native_checkpoint_fails_before_dispatch(self):
        session = self.session()
        original = session._load_checkpoint

        def corrupt(digest, size):
            session.checkpoint_path.write_bytes(b"corrupt")
            return original(digest, size)

        with patch.object(session, "_load_checkpoint", side_effect=corrupt):
            result = session.write(WRITE)
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["key_count"], 0)
        self.assertEqual(result["native"]["callbacks"], 0)

    def test_observations_deterministic_across_sessions(self):
        rows = []
        for _ in range(2):
            result = self.session().write(WRITE)
            result.pop("seconds")
            rows.append(result)
        self.assertEqual(*rows)

    def test_actual_sigkill_recovery_and_no_duplicate_effect(self):
        for fault in ("after_pause", "after_effect"):
            result = run_recovery(CASE, WRITE, fault)
            self.assertEqual(result["status"], "executed")
            self.assertEqual(result["before_approval_key_count"], 0)
            self.assertEqual(result["key_count"], 1)
            self.assertTrue(result["fresh_process"])
            self.assertTrue(result["repeat_cached"])
            self.assertEqual(
                result["killed_exits"], [-9] if fault == "after_pause" else [-9, -9]
            )
            self.assertEqual(result["callbacks"], 1 if fault == "after_pause" else 2)
            self.assertEqual(
                result["after_fault_key_count"], 0 if fault == "after_pause" else 1
            )

    def test_recovery_never_grants_proposal_authority(self):
        proposal = {
            "name": "write_record",
            "arguments": {"resource": "report", "content": "hostile"},
        }
        result = run_recovery(CASE, proposal, "after_pause")
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["effects"], [])

    def test_bounded_jsonl_and_clean_child_environment(self):
        env = child_environment()
        self.assertEqual(set(env), {"PYTHONPATH", "PYTHONDONTWRITEBYTECODE"})
        commands = [
            {"op": "start", "case": CASE, "mode": "enforced"},
            {"op": "read", "proposal": READ},
            {"op": "write", "proposal": WRITE},
            {"op": "close"},
        ]
        completed = subprocess.run(
            [sys.executable, str(Path(__file__).resolve().parents[1] / "runtime.py")],
            input="".join(json.dumps(row) + "\n" for row in commands),
            text=True,
            capture_output=True,
            env=env,
            timeout=40,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        rows = [json.loads(line) for line in completed.stdout.splitlines()]
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows[1]["status"], "executed")
        self.assertEqual(rows[2]["key_count"], 1)


if __name__ == "__main__":
    unittest.main()
