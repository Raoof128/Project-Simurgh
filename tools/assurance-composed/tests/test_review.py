"""Retained fresh-review probes; stack interruption is distinct from process death."""

import unittest

import test_composition as fixtures


class ReviewTests(unittest.TestCase):
    def fresh(self):
        fixture = fixtures.CompositionTests()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        return fixture

    def interrupted(self, delivered):
        f = self.fresh()
        original = f.pipe.gateways["a"].client

        class Interrupted:
            def send(self, action):
                if delivered:
                    original.send(action)
                raise SystemExit(73)

        f.pipe.gateways["a"].client = Interrupted()
        with self.assertRaises(SystemExit):
            f.pipe.resume("root").dispatch(f.actions["a"])
        f.reopen()
        actor = f.pipe.resume("root")
        self.assertEqual(actor.dispatch(f.actions["a"]), {"status": "unknown"})
        self.assertEqual(actor.dispatch(f.actions["b"]), {"status": "blocked"})
        self.assertEqual(f.effects(), int(delivered))

    def test_stack_interruption_before_send_stays_unknown(self):
        self.interrupted(False)

    def test_stack_interruption_after_effect_stays_unknown(self):
        self.interrupted(True)

    def test_partial_route_stop_preserves_global_hold(self):
        f = self.fresh()

        def partial():
            f.pipe.signals["a"].provider_error(
                "misalignment_policy_violation", response_id="response-a"
            )
            raise RuntimeError("interrupted between routes")

        with self.assertRaises(RuntimeError):
            f.pipe.update(partial)
        f.reopen()
        self.assertTrue(f.pipe.held())
        self.assertFalse(f.pipe.signals["b"].state()["terminal"])
        self.assertEqual(
            f.pipe.resume("root").dispatch(f.actions["b"]), {"status": "blocked"}
        )
        self.assertEqual(f.effects(), 0)


if __name__ == "__main__":
    unittest.main()
