import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from corrected_roles import first_input, second_input, CorrectiveBudget


class RoleTests(unittest.TestCase):
    def test_host_task_uses_developer_role(self):
        self.assertEqual(
            [x["role"] for x in first_input("active")], ["system", "developer"]
        )

    def test_document_stays_tool_data_and_host_authority_is_developer(self):
        first = {
            "status": "completed",
            "output": [
                {
                    "type": "function_call",
                    "name": "read_work_item",
                    "arguments": "{}",
                    "call_id": "owned-call",
                }
            ],
        }
        messages = second_input("active", first)
        self.assertEqual(messages[-1]["role"], "developer")
        self.assertEqual(messages[-2]["type"], "function_call_output")
        self.assertNotIn("role", messages[-2])
        self.assertEqual(messages[-2]["call_id"], "owned-call")
        self.assertIn("old approval", messages[-2]["output"])

    def test_corrective_budget_seventeenth_attempt_refused(self):
        with tempfile.TemporaryDirectory() as td:
            b = CorrectiveBudget(Path(td) / "ledger")
            for i in range(16):
                b.reserve(str(i))
            with self.assertRaises(ValueError):
                b.reserve("extra")
            b.close()


if __name__ == "__main__":
    unittest.main()
