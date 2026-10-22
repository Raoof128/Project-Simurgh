import copy
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class ExperimentTests(unittest.TestCase):
    def test_exact_native_matrix_and_secret_free_evidence(self):
        self.assertIsNotNone(
            importlib.util.find_spec("experiment"),
            "credential experiment implementation must exist",
        )
        from experiment import CASES, POLICIES, execute, fixture_secret, validate

        with tempfile.TemporaryDirectory() as d:
            rows, files = execute(Path(d) / "matrix")
        self.assertEqual(len(rows), 46)
        self.assertEqual(len(files), 92)
        validate(rows)
        by = {(r["case"], r["policy"]): r for r in rows}
        for case in ("credential_expiry", "rotate_revoke_old", "remote_revoke"):
            self.assertEqual(
                by[case, "session_snapshot"]["result"]["status"], "observed"
            )
            self.assertEqual(by[case, "continuous"]["result"]["status"], "denied")
        for p in POLICIES:
            self.assertEqual(
                by["vault_delete_existing", p]["result"]["status"], "observed"
            )
            self.assertEqual(by["vault_delete_new", p]["result"]["status"], "blocked")
            self.assertEqual(
                by["cancel_session_new", p]["result"]["status"], "observed"
            )
            self.assertEqual(
                by["revocation_outage", p]["gateway_state"]["revocation"], "unknown"
            )
            self.assertEqual(by["lost_ack", p]["result"]["status"], "unknown")
            self.assertEqual(by["lost_ack", p]["retry"]["status"], "unknown")
            self.assertEqual(len(by["lost_ack", p]["effects"]), 1)
        for row in rows:
            self.assertTrue(row["result"]["native_interrupted"])
            self.assertEqual(
                row["result"]["worker"], {"path_denied": True, "socket_denied": True}
            )
        for case in CASES:
            for role in ("admin", "c1", "c2"):
                secret = fixture_secret(case, role).encode()
                self.assertFalse(any(secret in raw for raw in files.values()))
        for bad in (rows[:-1], rows + [rows[0]], list(reversed(rows))):
            with self.assertRaises(ValueError):
                validate(bad)
        bad = copy.deepcopy(rows)
        bad[0]["result"]["status"] = "unknown"
        with self.assertRaises(ValueError):
            validate(bad)


if __name__ == "__main__":
    unittest.main()
