"""Control-flow tests in disposable fixtures; not a proof or historical evidence run."""

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "scripts/reproduce-llm-shield-stage5l-strict.sh"


class WrapperTests(unittest.TestCase):
    def run_wrapper(self, failure="", lean=True, acknowledged=True):
        self.assertTrue(SCRIPT.exists(), "strict successor wrapper must exist")
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "scripts").mkdir()
            script = root / "scripts" / SCRIPT.name
            shutil.copyfile(SCRIPT, script)
            evidence = root / "docs/research/llm-shield/evidence/stage-5l"
            evidence.mkdir(parents=True)
            (evidence / "example").write_text("unchanged")
            (root / "proofs/stage5l").mkdir(parents=True)
            commands = root / "bin"
            commands.mkdir()
            for name in ["dirname", "mktemp", "cp", "rm", "tail"]:
                (commands / name).symlink_to(shutil.which(name))
            fake = {
                "node": "#!/bin/sh\nexit 0\n",
                "python3": '#!/bin/sh\n[ "$WRAPPER_FAILURE" != parity ]\n',
                "diff": '#!/bin/sh\n[ "$WRAPPER_FAILURE" != diff ]\n',
            }
            if lean:
                fake["lean"] = '#!/bin/sh\n[ "$WRAPPER_FAILURE" != lean ]\n'
            for name, text in fake.items():
                p = commands / name
                p.write_text(text)
                p.chmod(0o700)
            result = subprocess.run(
                ["/bin/bash", str(script)]
                + (["--disposable-checkout"] if acknowledged else []),
                check=False,
                env={"PATH": str(commands), "WRAPPER_FAILURE": failure},
                text=True,
                capture_output=True,
                timeout=10,
            )
            self.assertEqual((evidence / "example").read_text(), "unchanged")
            return result

    def test_each_required_failure_is_nonzero_without_success(self):
        for failure in ["diff", "parity", "lean"]:
            with self.subTest(failure=failure):
                result = self.run_wrapper(failure)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn("ALL PASS", result.stdout)

    def test_missing_lean_is_incomplete_not_success(self):
        result = self.run_wrapper(lean=False)
        self.assertEqual(result.returncode, 77)
        self.assertNotIn("ALL PASS", result.stdout)

    def test_disposable_checkout_acknowledgement_is_required(self):
        result = self.run_wrapper(acknowledged=False)
        self.assertEqual(result.returncode, 64)
        self.assertNotIn("ALL PASS", result.stdout)

    def test_success_message_requires_all_commands_to_succeed(self):
        result = self.run_wrapper()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ALL PASS", result.stdout)
