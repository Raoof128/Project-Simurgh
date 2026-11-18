import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import control19w as w  # noqa: E402
import control19x as c  # noqa: E402
from test_control19w import log_bytes, sample  # noqa: E402


def tokens(input=0, output=0, cache_write=0, cache_read=0):
    return {
        "input": input,
        "output": output,
        "cache_write": cache_write,
        "cache_read": cache_read,
    }


class Declared(unittest.TestCase):
    def test_the_eight_models_in_run_order_with_their_vendors_and_repeats(self):
        self.assertEqual(
            [
                (m, s["provider"], s["repeats"], s["temperature"])
                for m, s in c.MODELS.items()
            ],
            [
                ("claude-haiku-5-5", "anthropic", 3, None),
                ("claude-sonnet-5-5", "anthropic", 3, None),
                ("claude-sonnet-4-5-20250929", "anthropic", 1, 0.0),
                ("claude-opus-5-5", "anthropic", 3, None),
                ("gpt-6-luna", "openai", 3, None),
                ("gpt-6.1-terra", "openai", 3, None),
                ("gpt-6.2-sol", "openai", 3, None),
                ("gpt-6.2-astra", "openai", 3, None),
            ],
        )
        self.assertEqual(
            c.chain("anthropic"),
            [
                "claude-haiku-5-5",
                "claude-sonnet-5-5",
                "claude-sonnet-4-5-20250929",
                "claude-opus-5-5",
            ],
        )
        self.assertEqual(
            c.chain("openai"),
            ["gpt-6-luna", "gpt-6.1-terra", "gpt-6.2-sol", "gpt-6.2-astra"],
        )

    def test_the_declared_prices_caps_and_reserves(self):
        self.assertEqual(
            {m: s["prices"] for m, s in c.MODELS.items()},
            {
                "claude-haiku-5-5": (0.10, 0.50, 0.125, 0.01),
                "claude-sonnet-5-5": (2.00, 10.00, 2.50, 0.10),
                "claude-sonnet-4-5-20250929": (3.00, 15.00, 3.75, 0.30),
                "claude-opus-5-5": (4.00, 20.00, 5.00, 0.20),
                "gpt-6-luna": (0.10, 0.50, 0.125, 0.01),
                "gpt-6.1-terra": (1.00, 5.00, 1.25, 0.05),
                "gpt-6.2-sol": (2.00, 10.00, 2.50, 0.10),
                "gpt-6.2-astra": (8.00, 40.00, 10.00, 0.40),
            },
        )
        self.assertEqual(c.CAPS, {"anthropic": 80.00, "openai": 80.00})
        self.assertEqual(
            {m: s["first_repeat_reserve"] for m, s in c.MODELS.items()},
            {
                "claude-haiku-5-5": 0.40,
                "claude-sonnet-5-5": 6.50,
                "claude-sonnet-4-5-20250929": 10.00,
                "claude-opus-5-5": 12.50,
                "gpt-6-luna": 0.60,
                "gpt-6.1-terra": 4.50,
                "gpt-6.2-sol": 9.00,
                "gpt-6.2-astra": 35.00,
            },
        )
        self.assertEqual(c.JUDGE_REPEAT_RESERVE, 0.45)

    def test_what_19w_fixed_is_not_redeclared(self):
        self.assertIs(c.count, w.count)
        self.assertIs(c.read_log, w.read_log)
        self.assertIs(c.audit, w.audit)
        self.assertEqual(c.JUDGE, "claude-sonnet-5-5")
        self.assertEqual(c.JUDGE_VOTES, 3)
        self.assertEqual(c.BENCHMARK_COMMIT, w.BENCHMARK_COMMIT)
        self.assertEqual(c.STAGE_ONE_ROOT[:8], "dd77de3e")
        self.assertEqual(
            c.ENVIRONMENT_CASES, {"devops": 31, "marketplace": 31, "productivity": 28}
        )
        self.assertEqual(sum(c.ENVIRONMENT_CASES.values()), w.CASES)

    def test_the_runner_writes_a_model_with_a_dot_under_an_underscore(self):
        self.assertEqual(c.dir_name("gpt-6.2-sol"), "gpt-6_2-sol")
        self.assertEqual(c.dir_name("claude-haiku-5-5"), "claude-haiku-5-5")
        self.assertEqual(c.model_id("gpt-6.2-sol"), "openai/gpt-6.2-sol")
        self.assertEqual(c.model_id("claude-opus-5-5"), "anthropic/claude-opus-5-5")
        with self.assertRaises(ValueError):
            c.model_id("gpt-x")


class Money(unittest.TestCase):
    def test_an_anthropic_model_counts_cache_tokens_beside_the_input(self):
        usd = c.cost(
            "claude-opus-5-5",
            tokens(
                input=1_000_000,
                output=1_000_000,
                cache_write=1_000_000,
                cache_read=1_000_000,
            ),
        )
        self.assertAlmostEqual(usd, 4.00 + 20.00 + 5.00 + 0.20)

    def test_an_openai_input_count_includes_the_cached_tokens(self):
        usd = c.cost(
            "gpt-6.2-astra",
            tokens(input=1_000_000, output=100_000, cache_read=600_000),
        )
        self.assertAlmostEqual(usd, 0.4 * 8.00 + 0.6 * 0.40 + 0.1 * 40.00)

    def test_more_cached_tokens_than_input_is_refused_for_openai(self):
        with self.assertRaises(ValueError) as caught:
            c.cost("gpt-6-luna", tokens(input=10, cache_read=11))
        self.assertIn("cached_exceeds_input", str(caught.exception))

    def test_an_unpriced_model_is_refused(self):
        with self.assertRaises(ValueError) as caught:
            c.meter({"gpt-7": tokens(input=1)})
        self.assertIn("unpriced_model", str(caught.exception))

    def test_the_meter_is_split_by_vendor_and_the_judge_bills_anthropic(self):
        usage = {
            "gpt-6.2-sol": tokens(input=1_000_000, output=100_000),
            "claude-sonnet-5-5": tokens(input=200_000, output=1_000),
        }
        spent = c.meter(usage)
        self.assertEqual(set(spent), {"anthropic", "openai"})
        self.assertAlmostEqual(spent["openai"], 2.00 + 1.00)
        self.assertAlmostEqual(spent["anthropic"], 0.40 + 0.01)
        self.assertEqual(c.meter({}), {"anthropic": 0.0, "openai": 0.0})

    def test_stage_one_meters_as_it_did_in_19w(self):
        usage = {
            "claude-haiku-5-5": tokens(
                input=1246, output=324456, cache_write=844877, cache_read=4383739
            ),
            "claude-sonnet-5-5": tokens(input=222729, output=860),
        }
        self.assertAlmostEqual(c.meter(usage)["anthropic"], 0.765858, places=6)
        self.assertAlmostEqual(w.meter(usage), 0.765858, places=6)


class Reserve(unittest.TestCase):
    def test_a_models_first_environment_reserves_a_third_of_the_declared_figure(self):
        self.assertEqual(
            c.reserve("gpt-6.2-astra", {}, 1, "devops"),
            {"openai": 35.00 / 3, "anthropic": 0.45 / 3},
        )
        self.assertEqual(
            c.reserve("claude-opus-5-5", {}, 1, "devops"),
            {"anthropic": 12.50 / 3 + 0.45 / 3, "openai": 0.0},
        )

    def test_later_in_the_first_repeat_it_is_the_environment_just_before(self):
        by_unit = {
            (1, "devops"): {
                "gpt-6.2-sol": tokens(input=1_000_000, output=100_000),
                "claude-sonnet-5-5": tokens(input=50_000),
            }
        }
        got = c.reserve("gpt-6.2-sol", by_unit, 1, "marketplace")
        self.assertAlmostEqual(got["openai"], 3.00)
        self.assertAlmostEqual(got["anthropic"], 0.10)

    def test_in_a_later_repeat_it_is_the_same_environment_of_the_repeat_before(self):
        by_unit = {
            (1, "devops"): {"gpt-6-luna": tokens(input=1_000_000)},
            (1, "marketplace"): {"gpt-6-luna": tokens(input=3_000_000)},
            (1, "productivity"): {"gpt-6-luna": tokens(input=5_000_000)},
            (2, "devops"): {"gpt-6-luna": tokens(input=7_000_000)},
        }
        self.assertAlmostEqual(
            c.reserve("gpt-6-luna", by_unit, 2, "marketplace")["openai"], 0.30
        )
        self.assertAlmostEqual(
            c.reserve("gpt-6-luna", by_unit, 3, "devops")["openai"], 0.70
        )

    def test_a_unit_starts_only_if_both_vendors_stay_inside_their_caps(self):
        fits = {"anthropic": 70.0, "openai": 10.0}
        self.assertTrue(c.may_start(fits, {"anthropic": 10.0, "openai": 70.0}))
        self.assertFalse(c.may_start(fits, {"anthropic": 10.01, "openai": 0.0}))
        self.assertFalse(c.may_start(fits, {"anthropic": 0.0, "openai": 70.01}))
        self.assertEqual(
            c.refused_by(fits, {"anthropic": 10.01, "openai": 70.01}),
            ["anthropic", "openai"],
        )


class LogUsage(unittest.TestCase):
    def test_usage_is_read_from_a_finished_log_by_model_name(self):
        usage = {
            "openai/gpt-6.2-sol": {
                "input_tokens": 900,
                "output_tokens": 50,
                "input_tokens_cache_read": 600,
                "reasoning_tokens": 40,
            },
            "anthropic/claude-sonnet-5-5": {"input_tokens": 30, "output_tokens": 2},
        }
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "a.eval"
            path.write_bytes(
                log_bytes(
                    [sample("A1", attack=False, task=True)],
                    usage=usage,
                    model="openai/gpt-6.2-sol",
                )
            )
            got = c.log_usage(path)
            rows = c.read_log(path, environment="devops", repeat=1)
        self.assertEqual(
            got,
            {
                "gpt-6.2-sol": tokens(input=900, output=50, cache_read=600),
                "claude-sonnet-5-5": tokens(input=30, output=2),
            },
        )
        self.assertEqual(rows[0]["model"], "gpt-6.2-sol")
        self.assertEqual(rows[0]["usage"], got)

    def test_a_log_the_runner_did_not_finish_has_no_usage(self):
        import zipfile

        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "half.eval"
            with zipfile.ZipFile(path, "w") as z:
                z.writestr("_journal/start.json", "{}")
            self.assertIsNone(c.log_usage(path))
            broken = Path(d) / "broken.eval"
            broken.write_bytes(b"not a zip")
            self.assertIsNone(c.log_usage(broken))


if __name__ == "__main__":
    unittest.main()
