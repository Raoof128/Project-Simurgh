import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import egress19  # noqa: E402
import lanes19d  # noqa: E402


class OffHostTests(unittest.TestCase):
    @unittest.skipIf(
        egress19.can_namespace(),
        "this host can namespace; the refusal test is for others",
    )
    def test_run_all_refuses_without_namespace(self):
        with self.assertRaises(RuntimeError) as ctx:
            lanes19d.run_all(Path(tempfile.mkdtemp()) / "x")
        self.assertEqual(str(ctx.exception), "host_cannot_namespace")


@unittest.skipUnless(
    egress19.can_namespace(), "Linux user+net namespace not available on this host"
)
class Lanes19dTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r = lanes19d.run_all(Path(tempfile.mkdtemp()) / "lanes")

    def test_every_case_holds(self):
        by = {row["case"]: row for row in self.r["rows"]}
        self.assertEqual(
            len(by), 11
        )  # nine cases plus self_declared_role and method_not_allowed
        self.assertEqual(by["self_declared_role"]["decision"], "malformed")
        self.assertEqual(by["method_not_allowed"]["decision"], "method_not_allowed")
        for name, row in by.items():
            self.assertTrue(
                row["holds"],
                (name, row["decision"], row.get("errno"), row["counter_delta"]),
            )
        self.assertTrue(self.r["all_hold"])

    def test_positive_control_landed_once(self):
        self.assertEqual(self.r["receiver_effects"], 1)
        self.assertEqual(
            sum(1 for e in self.r["proxy_log"] if e["decision"] == "forwarded"), 1
        )

    def test_namespace_has_no_routes_and_live_reader_moves(self):
        self.assertEqual(self.r["namespace"]["routes_in_fresh_namespace"], [])
        self.assertTrue(self.r["live_reader_control"]["connected"])
        self.assertGreaterEqual(
            self.r["live_reader_control"]["counter_delta"]["Tcp.OutSegs"], 1
        )

    def test_covert_probe_reported_not_closed(self):
        c = self.r["covert_probe"]
        self.assertIs(c["eliminated"], False)
        self.assertGreater(c["bytes_delivered"], 0)


if __name__ == "__main__":
    unittest.main()
