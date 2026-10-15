import importlib.util
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class CaptureTests(unittest.TestCase):
    def test_failed_generation_retained_without_retry(self):
        spec = importlib.util.spec_from_file_location(
            "capture_study", HERE / "capture.py"
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        attempts = []

        def fail():
            attempts.append(1)
            raise ValueError("synthetic generation failure")

        row = module.attempt([{"role": "user", "content": "task"}], 42, fail)
        self.assertEqual(len(attempts), 1)
        self.assertEqual(row["status"], "generation_error")
        self.assertEqual(row["error_type"], "ValueError")
        self.assertEqual(row["sampling_seed"], 42)
        self.assertEqual(row["messages"], [{"role": "user", "content": "task"}])


if __name__ == "__main__":
    unittest.main()
