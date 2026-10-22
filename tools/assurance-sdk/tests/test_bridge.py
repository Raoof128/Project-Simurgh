# SPDX-License-Identifier: AGPL-3.0-or-later
import fcntl
import os
import signal
import socket
import threading
import unittest
from pathlib import Path

from simurgh_sdk.bridge import Bridge, load_scenarios
from simurgh_sdk.network import deny_network


class BridgeTests(unittest.TestCase):
    def test_persistent_policy_and_cleanup_under_network_denial(self):
        scenario = next(s for s in load_scenarios() if s["id"] == "duplicate-action")
        with deny_network(), Bridge("duplicate-action", "exact-policy") as bridge:
            directory = Path(bridge.directory)
            self.assertEqual(bridge.snapshot()["effects"], [])
            self.assertEqual(
                bridge.execute(scenario["proposals"][0])["status"], "executed"
            )
            self.assertEqual(
                bridge.execute(scenario["proposals"][1])["status"], "denied"
            )
            self.assertEqual(len(bridge.snapshot()["effects"]), 1)
            self.assertEqual(bridge.finish()["verdict"]["forbiddenEffects"], 0)
        self.assertFalse(directory.exists())

    def test_unknown_fault_and_reinitialization_refusal(self):
        with Bridge("sink-failure", "exact-policy") as bridge:
            self.assertFalse(bridge.snapshot()["available"])
            with self.assertRaisesRegex(RuntimeError, "already_initialized"):
                bridge.request("initialize", scenarioId="benign-patch", mode="bypass")
            self.assertEqual(bridge.finish()["verdict"]["reconciled"], "unknown")

    def test_dead_bridge_is_error_and_cleanup_still_runs(self):
        bridge = Bridge("benign-patch", "exact-policy")
        directory = Path(bridge.directory)
        try:
            os.kill(bridge.process.pid, 9)
            bridge.process.wait(timeout=5)
            with self.assertRaisesRegex(RuntimeError, "bridge_closed"):
                bridge.snapshot()
        finally:
            bridge.close()
        self.assertFalse(directory.exists())

    def test_invalid_scenario_raises(self):
        with self.assertRaisesRegex(RuntimeError, "unknown_scenario"):
            Bridge("missing", "exact-policy")

    def test_network_guard_rejects_connection_and_dns(self):
        with deny_network():
            with (
                socket.socket() as sock,
                self.assertRaisesRegex(OSError, "network_disabled"),
            ):
                sock.connect(("127.0.0.1", 1))
            with self.assertRaisesRegex(OSError, "network_disabled"):
                socket.getaddrinfo("example.com", 443)

    def test_write_backpressure_obeys_the_request_deadline(self):
        bridge = Bridge("benign-patch", "exact-policy")
        bridge.timeout = 0.05
        fcntl.fcntl(bridge.process.stdin.fileno(), fcntl.F_SETPIPE_SZ, 4096)
        os.kill(bridge.process.pid, signal.SIGSTOP)

        def resume():
            try:
                os.kill(bridge.process.pid, signal.SIGCONT)
            except ProcessLookupError:
                pass

        timer = threading.Timer(0.3, resume)
        timer.start()
        try:
            with self.assertRaisesRegex(TimeoutError, "bridge_timeout"):
                bridge.request("snapshot", padding="x" * 60000)
        finally:
            timer.join()
            bridge.close()


if __name__ == "__main__":
    unittest.main()
