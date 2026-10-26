import contextlib
import io
import platform
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import preflight

LINUX_X86 = platform.system() == "Linux" and platform.machine() == "x86_64"


class PlatformTests(unittest.TestCase):
    def test_linux_x86_64_is_the_only_supported_host(self):
        self.assertIsNone(preflight.check_platform("Linux", "x86_64"))
        for host in (("Darwin", "arm64"), ("Darwin", "x86_64"), ("Linux", "aarch64")):
            self.assertIn("requires Linux x86_64", preflight.check_platform(*host))

    def test_macos_refusal_names_the_lock_conflict(self):
        reason = preflight.check_platform("Darwin", "arm64")
        self.assertIn("database is locked", reason)
        self.assertIn("flock", reason)

    def test_python_must_match_the_locked_interpreter(self):
        self.assertIsNone(preflight.check_python((3, 12)))
        self.assertIn("3.12", preflight.check_python((3, 15)))


class ProbeTests(unittest.TestCase):
    def test_sqlite_under_flock_matches_the_host(self):
        reason = preflight.check_sqlite_under_flock()
        if platform.system() == "Darwin":
            self.assertIn("database is locked", reason)
        elif platform.system() == "Linux":
            self.assertIsNone(reason)

    def test_seccomp_probe_reports_the_child_reason(self):
        reason = preflight.check_seccomp()
        if LINUX_X86:
            self.assertIsNone(reason)
        else:
            # The frozen worker discards this text; the preflight must not.
            self.assertIn("worker isolation refused:", reason)
            self.assertNotIn("no diagnostic", reason)

    def test_history_refuses_outside_a_checkout(self):
        self.assertIn("not a Git checkout", preflight.check_history(Path("/")))


class RunTests(unittest.TestCase):
    def run_quietly(self, checks):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            failures = preflight.run(checks)
        return failures, out.getvalue()

    def test_every_failure_is_reported_not_just_the_first(self):
        failures, out = self.run_quietly(
            (("a", lambda: "first"), ("b", lambda: None), ("c", lambda: "second"))
        )
        self.assertEqual(failures, ["a", "c"])
        self.assertIn("FAIL  a: first", out)
        self.assertIn("ok    b", out)
        self.assertIn("FAIL  c: second", out)

    def test_a_crashing_check_fails_closed(self):
        def boom():
            raise RuntimeError("probe crashed")

        failures, out = self.run_quietly((("boom", boom),))
        self.assertEqual(failures, ["boom"])
        self.assertIn("RuntimeError: probe crashed", out)

    def test_main_exit_status_follows_failures(self):
        original = preflight.CHECKS
        try:
            preflight.CHECKS = (("x", lambda: "no"),)
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(preflight.main([]), 1)
            preflight.CHECKS = (("x", lambda: None),)
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(preflight.main([]), 0)
        finally:
            preflight.CHECKS = original


if __name__ == "__main__":
    unittest.main()
