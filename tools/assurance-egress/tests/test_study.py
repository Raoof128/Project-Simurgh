import copy
import socket
import tempfile
import unittest
from pathlib import Path

from simurgh_egress.kernel import Refusal
from simurgh_egress.observer import Observer
from simurgh_egress.study import check_shape, run, verify


class StudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run()

    def test_complete_fresh_replay(self):
        self.assertEqual(len(self.report["rows"]), 36)
        verify(self.report)

    def test_all_rows_have_expected_observation_and_utility(self):
        network = {
            "tcp_ipv4",
            "tcp_ipv6",
            "udp_dns_ipv4",
            "udp_dns_ipv6",
            "unix_relay",
            "proxy_relay",
            "fork_relay",
            "exec_relay",
        }
        for row in self.report["rows"]:
            case, control = row["case"], row["control"]
            with self.subTest(case=case, control=control):
                if control == "deny_all":
                    self.assertEqual(row["observed"], [])
                    self.assertIsNone(row["service"])
                elif case in network:
                    self.assertEqual(bool(row["observed"]), control == "unfiltered")
                    self.assertEqual(
                        row["service"]["outcome"],
                        "blocked" if control == "kernel" else "delivered",
                    )
                elif case == "filesystem_mailbox":
                    self.assertEqual(row["observed"], ["filesystem_mailbox"])
                elif case == "inherited_socket":
                    self.assertEqual(row["observed"], [])
                    self.assertEqual(row["service"]["outcome"], "closed")
                else:
                    self.assertEqual(row["service"]["outcome"], "useful")
                self.assertEqual(
                    row["approvedWrite"],
                    case == "approved_write" and control != "deny_all",
                )

    def test_omission_duplicate_extra_and_changed_source_refuse(self):
        for kind in ("omit", "duplicate", "extra", "source"):
            report = copy.deepcopy(self.report)
            if kind == "omit":
                report["rows"].pop()
            elif kind == "duplicate":
                report["rows"][1] = report["rows"][0]
            elif kind == "extra":
                report["rows"].append(report["rows"][0])
            else:
                report["sources"] = {}
            with self.subTest(kind=kind), self.assertRaises(Refusal):
                check_shape(report)

    def test_fabricated_absence_refuses(self):
        report = copy.deepcopy(self.report)
        row = next(
            r
            for r in report["rows"]
            if r["case"] == "tcp_ipv4" and r["control"] == "unfiltered"
        )
        row["observed"] = []
        with self.assertRaises(Refusal):
            verify(report)

    def test_observer_failure_is_not_empty_delivery_evidence(self):
        with tempfile.TemporaryDirectory() as root:
            observer = Observer(Path(root), "tcp_ipv4").start()
            try:
                with socket.create_connection(
                    tuple(observer.config["address"]), timeout=2
                ) as connection:
                    connection.sendall(b"wrong-payload\n")
                    self.assertEqual(connection.recv(32), b"")
                with self.assertRaises(Refusal):
                    observer.finish()
            finally:
                observer.close()

    def test_missing_baseline_delivery_cannot_be_certified(self):
        from simurgh_egress import study

        report = copy.deepcopy(self.report)
        row = next(
            r
            for r in report["rows"]
            if r["case"] == "tcp_ipv4" and r["control"] == "unfiltered"
        )
        row["observed"] = []
        with self.assertRaises(Refusal):
            study.validate_baselines(report["rows"])

    def test_stalled_stream_cannot_hide_a_queued_delivery_as_idle(self):
        from simurgh_egress.probes import PAYLOAD

        with tempfile.TemporaryDirectory() as root:
            observer = Observer(Path(root), "tcp_ipv4").start()
            try:
                address = tuple(observer.config["address"])
                with (
                    socket.create_connection(address, timeout=2) as stalled,
                    socket.create_connection(address, timeout=2) as queued,
                ):
                    stalled.sendall(b"partial")
                    queued.sendall(PAYLOAD)
                    with self.assertRaises(Refusal):
                        observer.finish()
            finally:
                observer.close()


if __name__ == "__main__":
    unittest.main()
