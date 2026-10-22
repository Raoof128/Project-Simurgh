import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DEMO = ROOT / "tools/assurance-hardening/demo.py"


class DemoTests(unittest.TestCase):
    def invoke(self, *args):
        self.assertTrue(DEMO.exists(), "reproducible hardening demo must exist")
        return subprocess.run(
            [sys.executable, str(DEMO), *map(str, args)],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )

    def test_report_replays_and_refuses_tampering_and_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            report = Path(d) / "report.json"
            result = self.invoke("--out", report)
            self.assertEqual(result.returncode, 0, result.stderr)
            value = json.loads(report.read_text())
            self.assertGreaterEqual(len(value["checks"]), 10)
            self.assertTrue(all(row["passed"] for row in value["checks"]))
            self.assertEqual(self.invoke("--verify", report).returncode, 0)
            original = report.read_bytes()
            self.assertNotEqual(self.invoke("--out", report).returncode, 0)
            self.assertEqual(report.read_bytes(), original)
            value["checks"] = []
            report.write_text(json.dumps(value))
            self.assertNotEqual(self.invoke("--verify", report).returncode, 0)
