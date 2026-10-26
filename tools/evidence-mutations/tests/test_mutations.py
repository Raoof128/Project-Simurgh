import platform
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import mutations

REPLAY_HOST = platform.system() == "Linux" and platform.machine() == "x86_64"


class LoadedEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transfer = mutations.load_transfer()
        cls.roles = mutations.load_roles()

    def assert_rejected(self, name, expected, check):
        reason = mutations.rejection(check)
        self.assertIsNotNone(
            reason, f"{name!r} was accepted; the verifier must refuse it"
        )
        self.assertIn(
            expected, reason, f"{name!r} refused for {reason!r}, expected {expected!r}"
        )


def _make_test(name, target, mutate, expected):
    def test(self):
        self.assert_rejected(
            name,
            expected,
            mutations.structural_check(name, target, mutate, self.transfer, self.roles),
        )

    test.__doc__ = f"{name} is rejected with {expected}"
    return test


class LoggedMutations(LoadedEvidence):
    """One test per mutation in the logged mutations.log, with its recorded reason code."""


for _name, _target, _mutate, _expected in mutations.STRUCTURAL:
    setattr(
        LoggedMutations,
        "test_" + _name.replace(" ", "_").replace("-", "_"),
        _make_test(_name, _target, _mutate, _expected),
    )


class InventoryTests(unittest.TestCase):
    def test_ten_logged_mutations_with_distinct_names(self):
        names = [m[0] for m in mutations.STRUCTURAL]
        self.assertEqual(len(names), 10)
        self.assertEqual(len(set(names)), 10)

    def test_control_archives_are_accepted_by_read_pack(self):
        self.assertIn("report.json", mutations.load_roles())
        files, cap, raw = mutations.load_transfer()
        self.assertEqual(len(cap["rows"]), 144)
        self.assertTrue(raw)


class ResignedArchive(unittest.TestCase):
    """F3 from the 26 Oct 2026 review: a consistent re-sign defeats the hash layer by design."""

    def test_resigned_archive_passes_the_hash_layer(self):
        with tempfile.TemporaryDirectory() as td:
            path, root = mutations.resigned_role_archive(td)
            self.assertNotEqual(root, mutations.expected_root(mutations.ROLES))
            files = mutations.read_pack(path, root)
        original = mutations.loads(mutations.load_roles()["report.json"])
        flipped = mutations.loads(files["report.json"])
        self.assertNotEqual(
            original["rows"][1]["new_effects"], flipped["rows"][1]["new_effects"]
        )

    @unittest.skipUnless(
        REPLAY_HOST, "the fresh replay needs Linux x86_64 (worker seccomp)"
    )
    def test_replay_rejects_the_resigned_archive(self):
        with tempfile.TemporaryDirectory() as td:
            path, root = mutations.resigned_role_archive(td)
            files = mutations.read_pack(path, root)
            reason = mutations.rejection(lambda: mutations.role_verify(files))
        self.assertIsNotNone(reason, "the replay accepted a flipped effect count")
        self.assertIn("role_report_mismatch", reason)


if __name__ == "__main__":
    unittest.main()
