import copy
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fixture import TOKEN, Fixture, request
from study import CASES, MODES, run_case, specification, summarize, verify, write_report
from study import binding as real_binding


class IncidentTests(unittest.TestCase):
    def test_useful_work_and_stop_survive_reopening(self):
        for mode in MODES:
            row = run_case("useful_workflow", mode)
            self.assertEqual(row["errors"], [])
            self.assertEqual(row["utility"], mode != "deny_all")
            self.assertEqual(
                len(row["observed"]["requests"]), 0 if mode == "deny_all" else 2
            )
            if mode == "deny_all":
                self.assertEqual(row["stop_probes"][0]["result"]["reason"], "stopped")
                self.assertEqual(
                    row["stop_probes"][0]["before"], row["stop_probes"][0]["after"]
                )

    def test_chain_consumes_real_handoff_and_metadata_and_has_unsafe_witness(self):
        for mode in MODES:
            row = run_case("cross_run_chain", mode)
            self.assertEqual(row["errors"], [])
            self.assertEqual(row["unsafe"], mode == "origin_only")
            if mode == "origin_only":
                self.assertEqual(row["skipped"], [])
                token = row["attempts"][2]["response"]["credential"]
                self.assertEqual(token, TOKEN)
                self.assertEqual(
                    json.loads(row["attempts"][3]["request"]["body"])["credential"],
                    token,
                )
                self.assertEqual(
                    [effect[0] for effect in row["observed"]["effects"]],
                    ["export", "handoff", "scorer"],
                )
                self.assertEqual(row["observed"]["scorer_mode"], "accept-all")
            else:
                self.assertIn("metadata", row["skipped"])
                self.assertFalse(row["observed"]["effects"])
                self.assertEqual(row["observed"]["scorer_mode"], "strict")

    def test_late_stage_probes_and_approved_service_blind_spot(self):
        for case in ("planted_credential", "scorer_tamper", "approved_service_relay"):
            rows = [run_case(case, mode) for mode in MODES]
            self.assertTrue(rows[1]["unsafe"])
            self.assertFalse(rows[2]["unsafe"])
            self.assertEqual(rows[0]["unsafe"], case == "approved_service_relay")
            if case == "approved_service_relay":
                self.assertTrue(
                    any(
                        event[0] == "http://collector.test"
                        for event in rows[0]["observed"]["requests"]
                    )
                )
                self.assertNotIn(case, summarize(rows, complete=False)["prevented"])

    def test_transport_contract_and_child_observer_are_real(self):
        with Fixture("useful_workflow") as fixture:
            result = fixture.transport(request("a", "GET", "/public"))
            self.assertEqual(result, {"status": 200, "location": None})
            self.assertEqual(
                fixture.responses[-1], {"document": "synthetic public reference"}
            )
            with sqlite3.connect(fixture.root / "service.sqlite") as database:
                self.assertEqual(
                    database.execute("SELECT COUNT(*) FROM requests").fetchone()[0], 1
                )

    @patch(
        "study.binding", return_value={"commit": "a" * 40, "protocol_sha256": "fixture"}
    )
    def test_full_inventory_channel_gaps_replay_tamper_and_overwrite(self, _binding):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "report.json"
            report = write_report(path, "protocol.json", "a" * 40)
            self.assertEqual(len(report["rows"]), len(CASES) * len(MODES))
            self.assertEqual(len(report["channels"]), 9)
            self.assertEqual(report["summary"]["errors"], [])
            for channel in report["channels"]:
                if (
                    channel["case"] == "filesystem_mailbox"
                    and channel["control"] == "kernel"
                ):
                    self.assertEqual(channel["observed"], ["filesystem_mailbox"])
            verify(report, "protocol.json")
            with self.assertRaises(FileExistsError):
                write_report(path, "protocol.json", "a" * 40)
            for field in ("rows", "channels"):
                mutated = copy.deepcopy(report)
                mutated[field].pop()
                with self.assertRaises(ValueError):
                    verify(mutated, "protocol.json")
            mutated = copy.deepcopy(report)
            mutated["summary"]["prevented"].append("approved_service_relay")
            with self.assertRaises(ValueError):
                verify(mutated, "protocol.json")
            with (
                patch("study.binding", side_effect=ValueError("source mismatch")),
                patch("study.run") as execute,
            ):
                with self.assertRaises(ValueError):
                    write_report(
                        Path(temporary) / "new.json", "protocol.json", "b" * 40
                    )
                execute.assert_not_called()
            protocol = Path(temporary) / "protocol.json"
            specification_data = specification()
            self.assertGreater(len(specification_data["sources"]), 0)
            first_source = next(iter(specification_data["sources"]))
            specification_data["sources"][first_source] = "0" * 64
            protocol.write_text(json.dumps(specification_data))
            with self.assertRaisesRegex(ValueError, "protocol_or_source_mismatch"):
                real_binding(protocol, "a" * 40)
            specification_data["sources"] = {}
            protocol.write_text(json.dumps(specification_data))
            with self.assertRaisesRegex(ValueError, "protocol_or_source_mismatch"):
                real_binding(protocol, "a" * 40)


if __name__ == "__main__":
    unittest.main()
