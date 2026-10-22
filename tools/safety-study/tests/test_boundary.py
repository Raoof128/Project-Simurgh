# SPDX-License-Identifier: AGPL-3.0-or-later
import copy
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from boundary import (
    CASES,
    FIXTURE,
    MODES,
    WRITE,
    AuditError,
    HostState,
    Session,
    run_case,
    run_report,
    semantic,
    summarize,
    validate_artifacts,
    validate_inventory,
    validate_timings,
    verify_report,
)


class BoundaryTests(unittest.TestCase):
    def setup_host(self, mode="enforced", case_id="test"):
        temporary = tempfile.TemporaryDirectory(prefix="boundary-test-")
        self.addCleanup(temporary.cleanup)
        session = Session(copy.deepcopy(FIXTURE), mode)
        self.addCleanup(session.close)
        path = Path(temporary.name) / "audit.sqlite"
        return session, HostState(session, path, case_id, create=True)

    def test_exact_inventory_and_invalid_is_not_prevention(self):
        self.assertEqual(len(CASES), 14)
        rows = [
            {"case_id": case_id, "mode": mode} for case_id in CASES for mode in MODES
        ]
        validate_inventory(rows)
        for bad in (rows[:-1], rows + rows[:1], rows[:-1] + [dict(rows[0])]):
            with self.assertRaises(ValueError):
                validate_inventory(bad)
        for case_id in ("malformed", "forged_approval_input"):
            with tempfile.TemporaryDirectory() as directory:
                results = [
                    run_case(case_id, mode, Path(directory) / mode) for mode in MODES
                ]
                self.assertTrue(
                    all(row["attempts"][0]["status"] == "invalid" for row in results)
                )
                self.assertTrue(all(not row["unsafe_effect"] for row in results))
                summary = summarize(results, require_complete=False)
                self.assertEqual(summary["policy_prevented"], [])

    def test_real_private_read_and_native_unsafe_write_have_bypass_witnesses(self):
        for case_id in ("private_read", "wrong_content", "benign_write"):
            with tempfile.TemporaryDirectory() as directory:
                rows = [
                    run_case(case_id, mode, Path(directory) / mode) for mode in MODES
                ]
                self.assertEqual(
                    [row["attempts"][0]["status"] for row in rows],
                    ["executed", "executed", "blocked"]
                    if case_id == "benign_write"
                    else ["blocked", "executed", "blocked"],
                )
                if case_id != "benign_write":
                    self.assertTrue(rows[1]["unsafe_effect"])
                    self.assertFalse(rows[0]["unsafe_effect"])
                self.assertTrue(all(row["audit"]["ok"] for row in rows))

    def test_revocation_stop_survive_reopen_without_mutating_grant(self):
        for transition in ("revoke", "stop"):
            session, host = self.setup_host(case_id=transition)
            getattr(host, transition)()
            reopened = HostState(session, host.path, transition)
            self.assertEqual(reopened.dispatch("write", WRITE)["status"], "blocked")
            self.assertEqual(session._observation()["key_count"], 0)
            # Direct unchanged grant is executable; revocation is an overlay.
            self.assertEqual(session.write(WRITE)["status"], "executed")
            self.assertFalse(reopened.audit()["ok"])
            with self.assertRaises(FileExistsError):
                HostState(session, host.path, transition, create=True)
            with self.assertRaises(AuditError):
                HostState(session, host.path, "other-case").validate()

    def test_journal_commits_intent_before_dispatch_and_detects_rechained_omission(
        self,
    ):
        session, host = self.setup_host()
        original = session.write

        def observed(proposal):
            with sqlite3.connect(host.path) as connection:
                bodies = [
                    json.loads(row[0])
                    for row in connection.execute(
                        "SELECT body FROM events ORDER BY seq"
                    )
                ]
            self.assertEqual(bodies[-1]["kind"], "intent")
            return original(proposal)

        session.write = observed
        result = host.dispatch("write", WRITE)
        self.assertEqual(result["key_count"], 1)
        self.assertTrue(host.audit()["ok"])
        host.inject_omission()
        audit = host.audit()
        self.assertFalse(audit["ok"])
        self.assertIn("completion_missing", audit["errors"])
        self.assertIn("effect_unaccounted", audit["errors"])
        blocked = host.dispatch("write", WRITE)
        self.assertEqual(blocked["status"], "blocked")
        self.assertEqual(blocked["key_count"], 1)

    def test_tamper_and_unavailable_fail_before_native_dispatch(self):
        for attack in ("tamper", "unavailable"):
            session, host = self.setup_host(case_id=attack)
            getattr(host, "inject_" + attack)()
            session.write = lambda _: self.fail("audit failure reached native dispatch")
            self.assertEqual(host.dispatch("write", WRITE)["status"], "blocked")
            self.assertEqual(session._observation()["key_count"], 0)

    def test_retry_retains_one_effect_and_actual_callback_counts(self):
        _session, host = self.setup_host()
        first = host.dispatch("write", WRITE)
        second = host.dispatch("write", WRITE)
        self.assertTrue(first["effect_created"])
        self.assertFalse(second["effect_created"])
        self.assertEqual(second["key_count"], 1)
        self.assertEqual(
            first["native"]["callbacks"] + second["native"]["callbacks"], 2
        )
        self.assertTrue(host.audit()["ok"])

    def test_semantic_excludes_only_timing_and_artifact_bytes(self):
        self.assertEqual(
            semantic({"seconds": 1.0, "status": "executed"}),
            semantic({"seconds": 2.0, "status": "executed"}),
        )
        self.assertNotEqual(
            semantic({"status": "executed"}), semantic({"status": "blocked"})
        )
        for invalid in (-1, float("nan"), float("inf"), "0", True):
            with self.assertRaisesRegex(ValueError, "invalid_timing"):
                validate_timings({"nested": [{"seconds": invalid}]})

    @patch(
        "boundary.protocol_binding",
        return_value={"commit": "a" * 40, "sha256": "test-precommit"},
    )
    def test_complete_report_replays_and_refuses_tamper_or_overwrite(self, binding):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "report.json"
            report = run_report(path, commit="a" * 40)
            self.assertEqual(report["summary"]["rows"], 42)
            self.assertEqual(report["summary"]["errors"], [])
            self.assertEqual(len(report["summary"]["policy_prevented"]), 8)
            self.assertEqual(
                report["summary"]["utility"],
                {
                    "enforced": ["benign_read", "benign_write"],
                    "bypass": ["benign_read", "benign_write"],
                    "deny_all": [],
                },
            )
            self.assertEqual(
                [row["result"]["killed_exits"] for row in report["recovery"]],
                [[-9], [-9, -9]],
            )
            verify_report(path)
            with self.assertRaises(FileExistsError):
                run_report(path, commit="a" * 40)
            changed = copy.deepcopy(report)
            changed["rows"] = changed["rows"][:-1]
            path.write_text(json.dumps(changed))
            with self.assertRaisesRegex(ValueError, "inventory"):
                verify_report(path)
            changed = copy.deepcopy(report)
            changed["summary"]["rows"] = 99
            path.write_text(json.dumps(changed))
            with self.assertRaisesRegex(ValueError, "semantic"):
                verify_report(path)
            # Rehashing corrupt persisted bytes must not launder them through
            # unchanged logical snapshots in the report.
            artifacts = path.with_name(path.name + ".artifacts")
            database = artifacts / "benign_write" / "enforced" / "audit.sqlite"
            with sqlite3.connect(database) as connection:
                connection.execute("UPDATE state SET stopped=1")
            from boundary import artifact_manifest

            report["artifacts"] = artifact_manifest(artifacts)
            with self.assertRaisesRegex(ValueError, "persisted_journal"):
                validate_artifacts(report, artifacts)

    def test_provenance_failure_precedes_any_runtime_or_report_creation(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "report.json"
            with (
                patch(
                    "boundary.protocol_binding",
                    side_effect=ValueError("source digest mismatch"),
                ),
                patch("boundary.run_suite") as run,
            ):
                with self.assertRaisesRegex(ValueError, "source digest mismatch"):
                    run_report(path, commit="b" * 40)
                run.assert_not_called()
                self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
