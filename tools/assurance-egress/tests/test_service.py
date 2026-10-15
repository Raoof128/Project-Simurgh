import json
import subprocess
import sys
import unittest


class ServiceTests(unittest.TestCase):
    def case(self, name, control):
        completed = subprocess.run(
            [sys.executable, "-m", "simurgh_egress.study", "case", name, control],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        return json.loads(completed.stdout)

    def test_approved_tcp_relay_is_delivered_without_profile_and_blocked_with_it(self):
        baseline = self.case("tcp_ipv4", "unfiltered")
        protected = self.case("tcp_ipv4", "kernel")
        self.assertEqual(baseline["observed"], ["tcp_ipv4"])
        self.assertEqual(baseline["broker"]["status"], "completed")
        self.assertEqual(protected["observed"], [])
        self.assertEqual(protected["service"], {"outcome": "blocked", "errno": "EPERM"})
        self.assertEqual(
            protected["broker"], {"status": "refused", "reason": "unavailable"}
        )

    def test_all_named_network_channels_have_live_baselines(self):
        for name in (
            "tcp_ipv6",
            "udp_dns_ipv4",
            "udp_dns_ipv6",
            "unix_relay",
            "proxy_relay",
            "fork_relay",
            "exec_relay",
        ):
            with self.subTest(case=name):
                baseline = self.case(name, "unfiltered")
                protected = self.case(name, "kernel")
                self.assertTrue(baseline["observed"])
                self.assertEqual(baseline["service"]["outcome"], "delivered")
                self.assertEqual(protected["observed"], [])
                self.assertEqual(protected["service"]["outcome"], "blocked")

    def test_useful_requests_survive_and_deny_all_loses_them(self):
        for name in ("public_read", "approved_write"):
            with self.subTest(case=name):
                row = self.case(name, "kernel")
                self.assertEqual(row["broker"]["status"], "completed")
                self.assertEqual(row["service"]["outcome"], "useful")
                self.assertEqual(
                    self.case(name, "deny_all")["broker"]["reason"], "deny_all"
                )

    def test_file_mailbox_is_a_retained_negative_result(self):
        row = self.case("filesystem_mailbox", "kernel")
        self.assertEqual(row["observed"], ["filesystem_mailbox"])
        self.assertEqual(row["service"]["outcome"], "delivered")

    def test_inherited_connected_socket_is_closed_in_both_controls(self):
        for control in ("unfiltered", "kernel"):
            row = self.case("inherited_socket", control)
            self.assertEqual(row["observed"], [])
            self.assertEqual(row["service"], {"outcome": "closed", "errno": "EBADF"})


if __name__ == "__main__":
    unittest.main()
