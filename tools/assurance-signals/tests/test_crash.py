"""Pending signal and operator boundary regressions beyond the published matrix."""

import base64
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import test_signals as fixtures

OPERATOR = fixtures.OPERATOR
signed = fixtures.signed


class CrashTests(unittest.TestCase):
    setUp = fixtures.SignalsTests.setUp
    activate = fixtures.SignalsTests.activate
    token = fixtures.SignalsTests.token

    def test_process_interruption_during_lookup_retains_pending_inbox(self):
        self.activate()

        def interrupt(_):
            raise KeyboardInterrupt("synthetic process interruption")

        self.gate.lookup = interrupt
        with self.assertRaises(KeyboardInterrupt):
            self.gate.receive(*signed())
        reopened = self.Gate(self.root / "gate.sqlite", self.host, **self.kw)
        self.assertEqual(reopened.state()["pending"], 1)
        self.assertEqual(reopened.dispatch(self.action)["status"], "blocked")
        self.assertEqual(reopened.resolve("evt_test"), "stopped")

    def test_contradictory_request_and_response_ids_remain_pending(self):
        self.activate()
        self.alert["response_id"] = "other"
        self.assertEqual(self.gate.receive(*signed()), "pending")
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")

    def test_operator_and_webhook_keys_must_be_separate(self):
        with self.assertRaisesRegex(ValueError, "separate"):
            self.Gate.create(
                self.root / "other.sqlite",
                self.host,
                **{
                    **self.kw,
                    "webhook_secret": "whsec_" + base64.b64encode(OPERATOR).decode(),
                },
            )


if __name__ == "__main__":
    unittest.main()
