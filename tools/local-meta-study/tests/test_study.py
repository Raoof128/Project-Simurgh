import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class StudyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("study", HERE / "study.py")
        cls.m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.m)

    def test_exact_case_inventory_and_balanced_families(self):
        cases = self.m.load_cases()
        self.assertEqual(len(cases), 24)
        for mutation in ("empty", "duplicate", "expected", "family", "all_attack"):
            rows = copy.deepcopy(cases)
            if mutation == "empty":
                rows.clear()
            elif mutation == "duplicate":
                rows[-1] = rows[0]
            elif mutation == "expected":
                rows[0]["expected"]["resource"] = "/tmp/private"
            elif mutation == "all_attack":
                for i, row in enumerate(rows):
                    row["kind"] = "attack"
                    row["family"] = str(i // 2)
            else:
                rows[0]["kind"] = "other"
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                self.m.validate_cases(rows)

    def test_prompt_preserves_untrusted_text_and_real_feedback(self):
        case = self.m.load_cases()[0]
        first = self.m.messages(case, 0, None)
        second = self.m.messages(case, 1, {"status": "blocked", "data": None})
        self.assertEqual(first[0]["role"], "system")
        self.assertIn(json.dumps(case["reference"]), first[1]["content"])
        self.assertIn("blocked", second[1]["content"])
        self.assertIn(case["task"], second[1]["content"])
        self.assertNotIn("blocked", first[1]["content"])

    def test_strict_proposal_parser(self):
        good = {"name": "read_document", "arguments": {"resource": "public"}}
        self.assertEqual(self.m.parse(json.dumps(good)), good)
        for text in (
            "[]",
            '{"name":"x","name":"y"}',
            '{"x":NaN}',
            '{"x":1e999}',
            "```json\n{}\n```",
            "x" * 16385,
        ):
            with self.subTest(text=text[:30]), self.assertRaises(ValueError):
                self.m.parse(text)

    def test_cluster_interval_uses_cases_not_repeated_rows(self):
        # Repeated identical seed outcomes must not shrink case-level uncertainty.
        single = {"a": [1.0], "b": [0.0], "c": [0.0], "d": [1.0]}
        repeated = {k: v * 30 for k, v in single.items()}
        self.assertEqual(
            self.m.cluster_interval(single), self.m.cluster_interval(repeated)
        )
        self.assertEqual(self.m.cluster_interval({"a": [1.0]})["low"], 1.0)
        with self.assertRaises(ValueError):
            self.m.cluster_interval({})

    def test_denial_or_failed_baseline_cannot_manufacture_prevention(self):
        case = self.m.load_cases()[0]
        bad = [
            {"status": "invalid", "data": None},
            {"status": "invalid", "effects": []},
        ]
        denied = [
            {"status": "blocked", "data": None},
            {"status": "blocked", "effects": []},
        ]
        result = self.m.score(
            case, {"enforced": denied, "bypass": bad, "deny_all": denied}
        )
        self.assertFalse(result["unsafe_bypass"])
        self.assertFalse(result["prevented"])
        self.assertFalse(result["benign_completed"])
        unsafe = [
            {"status": "executed", "resource": "private", "data": "synthetic-private"},
            bad[1],
        ]
        result = self.m.score(
            case, {"enforced": denied, "bypass": unsafe, "deny_all": denied}
        )
        self.assertTrue(result["unsafe_bypass"])
        self.assertTrue(result["prevented"])
        failed = copy.deepcopy(denied)
        failed[0]["status"] = "error"
        result = self.m.score(
            case, {"enforced": failed, "bypass": unsafe, "deny_all": denied}
        )
        self.assertFalse(result["prevented"])
        result = self.m.score(
            case, {"enforced": bad, "bypass": unsafe, "deny_all": denied}
        )
        self.assertFalse(result["prevented"])

    def test_utility_requires_both_steps_and_exact_effect(self):
        case = self.m.load_cases()[0]
        case = dict(case, kind="benign")
        good = [
            {
                "status": "executed",
                "resource": "public",
                "data": case["public_document"],
            },
            {"status": "executed", "effects": [{"action": case["expected"]}]},
        ]
        modes = {key: copy.deepcopy(good) for key in ("enforced", "bypass", "deny_all")}
        self.assertTrue(self.m.score(case, modes)["benign_completed"])
        modes["enforced"][0]["status"] = "blocked"
        self.assertFalse(self.m.score(case, modes)["benign_completed"])
        modes["enforced"] = copy.deepcopy(good)
        modes["enforced"][1]["effects"][0]["action"]["content"] = "wrong"
        self.assertTrue(self.m.score(case, modes)["unsafe_enforced"])

    def test_capture_requires_complete_bound_inventory(self):
        cases = self.m.load_cases()
        protocol = {
            "settings": self.m.SETTINGS,
            "vocab_size": 128256,
            "generation_config": {"eos_token_id": [1]},
        }
        capture = {
            "schema": "simurgh-meta-study-capture-v1",
            "protocol_sha256": "abc",
            "rows": [],
            "runtime": {"peak_rss_mib": 100.0, "load_seconds": 1.0},
        }
        for seed in (0, 1, 2):
            for case_index, case in enumerate(cases):
                read = {"status": "blocked", "data": None, "seconds": 0.01}
                steps = []
                for step in (0, 1):
                    steps.append(
                        {
                            "status": "generated",
                            "finish_reason": "stop",
                            "completion": "{}",
                            "generated_token_ids": [1],
                            "output_tokens": 1,
                            "input_tokens": 10,
                            "messages": self.m.messages(
                                case, step, None if step == 0 else read
                            ),
                            "seconds": 0.1,
                            "sampling_seed": seed * 1000 + case_index * 2 + step,
                            "input_token_ids": [1] * 10,
                            "rendered_prompt": "test prompt",
                        }
                    )
                capture["rows"].append(
                    {
                        "id": case["id"],
                        "seed": seed,
                        "seconds": 0.2,
                        "steps": steps,
                        "trajectory": [
                            read,
                            {"status": "blocked", "effects": [], "seconds": 0.01},
                        ],
                    }
                )
        self.m.validate_capture(capture, protocol, "abc", cases)
        for kind in (
            "missing",
            "duplicate",
            "prompt",
            "digest",
            "empty_tokens",
            "sampling_seed",
            "negative_time",
            "negative_rss",
            "impossible_token",
        ):
            changed = copy.deepcopy(capture)
            if kind == "missing":
                changed["rows"].pop()
            elif kind == "duplicate":
                changed["rows"][-1] = changed["rows"][0]
            elif kind == "prompt":
                changed["rows"][0]["steps"][1]["messages"][1]["content"] = "forged"
            elif kind == "digest":
                changed["protocol_sha256"] = "other"
            elif kind == "negative_time":
                changed["rows"][0]["seconds"] = -1
            elif kind == "negative_rss":
                changed["runtime"]["peak_rss_mib"] = -1
            elif kind == "impossible_token":
                changed["rows"][0]["steps"][0]["generated_token_ids"] = [2**60]
            elif kind == "sampling_seed":
                changed["rows"][0]["steps"][0]["sampling_seed"] = 999
            else:
                changed["rows"][0]["steps"][0]["generated_token_ids"] = []
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                self.m.validate_capture(changed, protocol, "abc", cases)


if __name__ == "__main__":
    unittest.main()
