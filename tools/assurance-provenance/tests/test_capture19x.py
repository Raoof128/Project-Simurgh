import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19x as cap  # noqa: E402
import control19x as c  # noqa: E402
from test_control19w import log_bytes, sample  # noqa: E402

HAIKU = "claude-haiku-5-5"
SOL = "gpt-6.2-sol"
ASTRA = "gpt-6.2-astra"
OLD = "claude-sonnet-4-5-20250929"
ONE_EACH = {"devops": 1, "marketplace": 1, "productivity": 1}


def usage_for(model, *, input=1000, output=2000, judge_input=0):
    out = {
        c.model_id(model): {
            "input_tokens": input,
            "output_tokens": output,
            "input_tokens_cache_write": 0,
            "input_tokens_cache_read": 0,
        }
    }
    if judge_input:
        out["anthropic/" + c.JUDGE] = {"input_tokens": judge_input, "output_tokens": 0}
    return out


def put(out, model, environment, repeat, name, samples, **usage):
    folder = cap.log_dir(out, model, environment, repeat)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(
        log_bytes(samples, usage=usage_for(model, **usage), model=c.model_id(model))
    )


def pass_smoke(out, *models):
    cap.record_smoke(
        out,
        [
            {
                "model": m,
                "role": "agent",
                "ok": True,
                "error": None,
                "usage": {},
                "at": "t",
            }
            for m in models
        ]
        + [
            {
                "model": c.JUDGE,
                "role": "judge",
                "ok": True,
                "error": None,
                "usage": {},
                "at": "t",
            }
        ],
    )


class FakeRunner:
    """Stands in for the benchmark's run_eval: writes one finished log per call."""

    def __init__(self, out, error=None, write=True, **usage):
        self.out, self.usage, self.calls = out, usage, []
        self.error, self.write = error, write

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        if not self.write:
            return
        model = kwargs["model"].split("/")[-1]
        repeat = int(kwargs["output_suffix"].rsplit("r", 1)[1])
        put(
            self.out,
            model,
            kwargs["env"],
            repeat,
            f"{'bad' if self.error else 'ok'}-run{len(self.calls)}.eval",
            [sample("A1", attack=False, task=not self.error, error=self.error)],
            **self.usage,
        )


class Layout(unittest.TestCase):
    def test_logs_are_looked_for_where_the_runner_writes_them(self):
        self.assertEqual(
            cap.log_dir("/o", SOL, "devops", 2),
            Path("/o/attack_evaluation/evals/gpt-6_2-sol/devops_plain_r2"),
        )
        self.assertEqual(
            cap.log_dir("/o", HAIKU, "devops", 1),
            Path("/o/attack_evaluation/evals/claude-haiku-5-5/devops_plain_r1"),
        )


class Collect(unittest.TestCase):
    def test_records_usage_by_unit_and_unfinished_logs(self):
        with tempfile.TemporaryDirectory() as d:
            put(d, SOL, "devops", 1, "a.eval", [sample("A1", attack=False, task=True)])
            put(
                d,
                SOL,
                "productivity",
                1,
                "b.eval",
                [sample("EX2", attack=True, task=False)],
            )
            put(d, SOL, "devops", 2, "c.eval", [sample("A1", attack=False, task=True)])
            half = cap.log_dir(d, SOL, "devops", 2) / "half.eval"
            with zipfile.ZipFile(half, "w") as z:
                z.writestr("_journal/start.json", "{}")
            got = cap.collect(d, SOL)
        self.assertEqual(
            [(r["environment"], r["case"], r["repeat"]) for r in got["rows"]],
            [("devops", "A1", 1), ("devops", "A1", 2), ("productivity", "EX2", 1)],
        )
        self.assertEqual({r["model"] for r in got["rows"]}, {SOL})
        self.assertEqual(got["usage"][SOL]["output"], 6000)
        self.assertEqual(
            sorted(got["by_unit"]), [(1, "devops"), (1, "productivity"), (2, "devops")]
        )
        self.assertEqual(got["unfinished"], 1)
        self.assertEqual(got["superseded"], 0)

    def test_a_retried_case_keeps_the_scored_record_and_counts_both_logs(self):
        with tempfile.TemporaryDirectory() as d:
            put(
                d,
                SOL,
                "devops",
                1,
                "1.eval",
                [sample("A1", attack=False, task=False, error="x")],
            )
            put(d, SOL, "devops", 1, "2.eval", [sample("A1", attack=True, task=True)])
            got = cap.collect(d, SOL)
        self.assertEqual(len(got["rows"]), 1)
        self.assertTrue(got["rows"][0]["scored"] and got["rows"][0]["attack_success"])
        self.assertEqual(got["superseded"], 1)
        self.assertEqual(got["usage"][SOL]["input"], 2000)

    def test_a_unit_is_complete_when_every_case_of_its_environment_has_a_record(self):
        with tempfile.TemporaryDirectory() as d:
            put(d, SOL, "devops", 1, "a.eval", [sample("A1", attack=False, task=True)])
            rows = cap.collect(d, SOL)["rows"]
        with mock.patch.dict(c.ENVIRONMENT_CASES, ONE_EACH):
            self.assertTrue(cap.unit_complete(rows, 1, "devops"))
            self.assertFalse(cap.unit_complete(rows, 1, "marketplace"))
            self.assertFalse(cap.unit_complete(rows, 2, "devops"))
        self.assertFalse(cap.unit_complete(rows, 1, "devops"))


class LaneMeter(unittest.TestCase):
    def test_every_models_logs_and_the_connection_check_are_metered(self):
        with tempfile.TemporaryDirectory() as d:
            put(
                d,
                HAIKU,
                "devops",
                1,
                "a.eval",
                [sample("A1", attack=False, task=True)],
                input=1_000_000,
                output=0,
            )
            put(
                d,
                ASTRA,
                "devops",
                1,
                "b.eval",
                [sample("A1", attack=False, task=True)],
                input=1_000_000,
                output=0,
                judge_input=1_000_000,
            )
            cap.record_smoke(
                d,
                [
                    {
                        "model": SOL,
                        "ok": True,
                        "error": None,
                        "usage": {
                            SOL: {
                                "input": 1_000_000,
                                "output": 0,
                                "cache_write": 0,
                                "cache_read": 0,
                            }
                        },
                        "at": "t",
                    }
                ],
            )
            usage, unfinished = cap.lane_usage(d)
        spent = c.meter(usage)
        self.assertAlmostEqual(spent["anthropic"], 0.10 + 2.00)
        self.assertAlmostEqual(spent["openai"], 8.00 + 2.00)
        self.assertEqual(unfinished, 0)


class Smoke(unittest.TestCase):
    def test_a_model_runs_only_after_it_and_the_judge_passed_the_check(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertFalse(cap.smoke_passed(d, SOL))
            cap.record_smoke(
                d,
                [
                    {
                        "model": SOL,
                        "role": "agent",
                        "ok": True,
                        "error": None,
                        "usage": {},
                        "at": "t",
                    }
                ],
            )
            self.assertFalse(cap.smoke_passed(d, SOL))  # the judge has not passed
            pass_smoke(d, SOL)
            self.assertTrue(cap.smoke_passed(d, SOL))
            self.assertFalse(cap.smoke_passed(d, ASTRA))
            # the judge's own check does not stand in for the same model as an agent
            self.assertFalse(cap.smoke_passed(d, c.JUDGE))

    def test_the_latest_check_of_a_model_decides(self):
        with tempfile.TemporaryDirectory() as d:
            pass_smoke(d, SOL)
            cap.record_smoke(
                d,
                [
                    {
                        "model": SOL,
                        "role": "agent",
                        "ok": False,
                        "error": "BadRequestError",
                        "usage": {},
                        "at": "t2",
                    }
                ],
            )
            self.assertFalse(cap.smoke_passed(d, SOL))
            self.assertEqual(len(json.loads((Path(d) / "smoke.json").read_text())), 3)


class Endpoint(unittest.TestCase):
    def test_only_an_openai_model_is_sent_to_the_responses_endpoint(self):
        seen = []

        def original(model=None, **kwargs):
            seen.append((model, kwargs))
            return "model-object"

        wrapped = cap.wrap_get_model(original)
        self.assertEqual(wrapped("openai/gpt-6.2-sol", config="cfg"), "model-object")
        wrapped("anthropic/claude-opus-5-5", config="cfg")
        wrapped("openai/gpt-6.2-sol", responses_api=False)
        self.assertEqual(
            seen,
            [
                ("openai/gpt-6.2-sol", {"config": "cfg", "responses_api": True}),
                ("anthropic/claude-opus-5-5", {"config": "cfg"}),
                ("openai/gpt-6.2-sol", {"responses_api": False}),
            ],
        )


class Execute(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(c.ENVIRONMENT_CASES, ONE_EACH)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_every_unit_runs_once_with_the_declared_settings(self):
        with tempfile.TemporaryDirectory() as d:
            runner = FakeRunner(d)
            code = cap.execute(d, OLD, runner, data_sha256="0" * 64)
            again = cap.execute(d, OLD, runner, data_sha256="0" * 64)
            record = json.loads((Path(d) / "captures" / (OLD + ".json")).read_text())
            lines = (
                (Path(d) / "transcripts" / (OLD + ".jsonl")).read_text().splitlines()
            )
        self.assertEqual((code, again), (0, 0))
        self.assertEqual([k["env"] for k in runner.calls], list(c.ENVIRONMENTS))
        first = runner.calls[0]
        self.assertEqual(first["model"], "anthropic/" + OLD)
        self.assertEqual(first["temperature"], 0.0)
        self.assertEqual(first["output_suffix"], "plain_r1")
        self.assertTrue(first["no_injection"] and first["resume"])
        self.assertEqual((first["max_connections"], first["max_tasks"]), (4, 4))
        self.assertEqual(first["retry_on_error"], 3)
        self.assertFalse(first["fail_on_error"])
        self.assertEqual(len(lines), 3)
        self.assertEqual(
            [(r["repeat"], r["status"], r["runs"]) for r in record["repeats"]],
            [(1, "run", 3)],
        )
        self.assertIn("started", record["repeats"][0])
        self.assertIn("finished", record["repeats"][0])

    def test_a_55_model_and_an_openai_model_are_sent_no_temperature(self):
        with tempfile.TemporaryDirectory() as d:
            runner = FakeRunner(d)
            cap.execute(d, SOL, runner, data_sha256="0" * 64)
        self.assertEqual(len(runner.calls), 9)
        self.assertEqual({k["model"] for k in runner.calls}, {"openai/gpt-6.2-sol"})
        self.assertEqual({k["temperature"] for k in runner.calls}, {None})
        self.assertEqual(
            [k["output_suffix"] for k in runner.calls][::3],
            ["plain_r1", "plain_r2", "plain_r3"],
        )

    def test_the_cap_stops_the_chain_before_a_unit_that_does_not_fit(self):
        with tempfile.TemporaryDirectory() as d:
            # each unit costs 30 USD at OpenAI: 750,000 output tokens at 40 USD a million
            runner = FakeRunner(d, input=0, output=750_000)
            code = cap.execute(d, ASTRA, runner, data_sha256="0" * 64)
            record = json.loads((Path(d) / "captures" / (ASTRA + ".json")).read_text())
            status = cap.status(d)
        self.assertEqual(code, cap.STOPPED)
        self.assertEqual([k["env"] for k in runner.calls], ["devops", "marketplace"])
        first = record["repeats"][0]
        self.assertEqual((first["status"], first["runs"]), ("stopped", 2))
        self.assertEqual(first["stopped"]["environment"], "productivity")
        self.assertEqual(first["stopped"]["vendors"], ["openai"])
        self.assertAlmostEqual(first["metered_usd"]["openai"], 60.0)
        self.assertEqual(
            [r["status"] for r in record["repeats"][1:]], ["not_run", "not_run"]
        )
        self.assertAlmostEqual(status["meter_usd"]["openai"], 60.0)
        self.assertEqual(status["caps_usd"], c.CAPS)

    def test_the_judges_tokens_for_an_openai_run_count_at_anthropic(self):
        with tempfile.TemporaryDirectory() as d:
            # Anthropic already holds 79 USD of Opus output: 3,950,000 tokens at 20 a million
            put(
                d,
                "claude-opus-5-5",
                "devops",
                1,
                "a.eval",
                [sample("A1", attack=False, task=True)],
                input=0,
                output=3_950_000,
            )
            runner = FakeRunner(d, input=0, output=0, judge_input=400_000)
            code = cap.execute(d, "gpt-6-luna", runner, data_sha256="0" * 64)
            record = json.loads((Path(d) / "captures" / "gpt-6-luna.json").read_text())
        # 79.00 + 0.15 fits; then 79.80 + 0.80 does not
        self.assertEqual(code, cap.STOPPED)
        self.assertEqual([k["env"] for k in runner.calls], ["devops"])
        self.assertEqual(record["repeats"][0]["stopped"]["vendors"], ["anthropic"])

    def test_a_finished_unit_is_not_run_again_and_not_held_to_the_cap(self):
        with tempfile.TemporaryDirectory() as d:
            for environment in c.ENVIRONMENTS:
                put(
                    d,
                    HAIKU,
                    environment,
                    1,
                    "stage-one.eval",
                    [sample("A1", attack=False, task=True)],
                )
            (Path(d) / "timeline.json").write_text(
                json.dumps({"1": {"started": "t0", "finished": "t1"}})
            )
            runner = FakeRunner(d)
            code = cap.execute(d, HAIKU, runner, data_sha256="0" * 64)
            record = json.loads((Path(d) / "captures" / (HAIKU + ".json")).read_text())
        self.assertEqual(code, 0)
        self.assertEqual(
            [k["output_suffix"] for k in runner.calls],
            ["plain_r2"] * 3 + ["plain_r3"] * 3,
        )
        self.assertEqual(record["repeats"][0]["started"], "t0")
        self.assertEqual([r["status"] for r in record["repeats"]], ["run"] * 3)


class Halt(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(c.ENVIRONMENT_CASES, ONE_EACH)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_a_unit_whose_runs_mostly_fail_to_score_halts_the_chain(self):
        with tempfile.TemporaryDirectory() as d:
            runner = FakeRunner(d, error="AuthenticationError")
            code = cap.execute(d, SOL, runner, data_sha256="0" * 64)
            again = cap.execute(d, SOL, runner, data_sha256="0" * 64)
            record = json.loads((Path(d) / "captures" / (SOL + ".json")).read_text())
        self.assertEqual((code, again), (cap.HALTED, cap.HALTED))
        self.assertEqual([k["env"] for k in runner.calls], ["devops"])
        first = record["repeats"][0]
        self.assertEqual((first["status"], first["runs"]), ("halted", 1))
        self.assertEqual(first["halted"]["environment"], "devops")
        self.assertEqual(first["halted"]["not_scored"], 1)
        self.assertEqual(first["halted"]["missing"], 0)

    def test_a_unit_the_runner_left_without_records_halts_the_chain(self):
        with tempfile.TemporaryDirectory() as d:
            runner = FakeRunner(d, write=False)
            code = cap.execute(d, SOL, runner, data_sha256="0" * 64)
            record = json.loads((Path(d) / "captures" / (SOL + ".json")).read_text())
        self.assertEqual(code, cap.HALTED)
        self.assertEqual(len(runner.calls), 1)
        self.assertEqual(record["repeats"][0]["halted"]["missing"], 1)

    def test_a_halted_unit_runs_once_more_only_when_told(self):
        with tempfile.TemporaryDirectory() as d:
            cap.execute(d, OLD, FakeRunner(d, error="x"), data_sha256="0" * 64)
            runner = FakeRunner(d)
            code = cap.execute(d, OLD, runner, data_sha256="0" * 64, rerun_halted=True)
            record = json.loads((Path(d) / "captures" / (OLD + ".json")).read_text())
            rows = cap.collect(d, OLD)
        self.assertEqual(code, 0)
        self.assertEqual([k["env"] for k in runner.calls], list(c.ENVIRONMENTS))
        first = record["repeats"][0]
        self.assertEqual((first["status"], first["runs"]), ("run", 3))
        self.assertNotIn("halted", first)
        self.assertEqual(len(first["halted_before"]), 1)
        self.assertEqual(first["halted_before"][0]["environment"], "devops")
        self.assertTrue(all(r["scored"] for r in rows["rows"]))
        self.assertEqual(rows["superseded"], 1)
        self.assertEqual(record["superseded_logs"], 1)


class Record(unittest.TestCase):
    def test_the_capture_record_names_what_ran_and_holds_no_path(self):
        with tempfile.TemporaryDirectory() as d:
            put(d, SOL, "devops", 1, "a.eval", [sample("A1", attack=False, task=True)])
            record = cap.rebuild(d, SOL, data_sha256="0" * 64)
            saved = json.loads((Path(d) / "captures" / (SOL + ".json")).read_text())
            lines = (
                (Path(d) / "transcripts" / (SOL + ".jsonl")).read_text().splitlines()
            )
            self.assertNotIn(str(d), json.dumps(saved) + "".join(lines))
        self.assertEqual(record, saved)
        self.assertEqual(saved["schema"], "simurgh-phase19x-capture-v1")
        self.assertEqual((saved["model"], saved["provider"]), (SOL, "openai"))
        self.assertEqual((saved["judge"], saved["judge_votes"]), (c.JUDGE, 3))
        self.assertEqual(saved["benchmark"]["commit"], c.BENCHMARK_COMMIT)
        self.assertEqual(saved["declared_repeats"], 3)
        self.assertEqual(
            [(r["repeat"], r["status"], r["runs"]) for r in saved["repeats"]],
            [(1, "partial", 1), (2, "not_run", 0), (3, "not_run", 0)],
        )
        self.assertIsNone(saved["settings"]["temperature"])
        self.assertEqual(saved["settings"]["endpoint"], "responses")
        self.assertEqual(saved["unfinished_logs"], 0)
        self.assertEqual(len(lines), 1)

    def test_the_old_sonnet_is_recorded_at_temperature_zero_on_the_messages_endpoint(
        self,
    ):
        with tempfile.TemporaryDirectory() as d:
            put(d, OLD, "devops", 1, "a.eval", [sample("A1", attack=False, task=True)])
            saved = cap.rebuild(d, OLD, data_sha256="0" * 64)
        self.assertEqual(saved["settings"]["temperature"], 0.0)
        self.assertEqual(saved["settings"]["endpoint"], "messages")
        self.assertEqual(saved["declared_repeats"], 1)


class Refusals(unittest.TestCase):
    def test_an_undeclared_model_and_a_missing_key_are_refused(self):
        with self.assertRaises(SystemExit) as caught:
            cap.run("/nonexistent", "/nonexistent-out", "gpt-x")
        self.assertIn("undeclared", str(caught.exception))
        with mock.patch.dict("os.environ", {}, clear=True):
            with mock.patch.object(c, "benchmark_commit", lambda _: c.BENCHMARK_COMMIT):
                with self.assertRaises(SystemExit) as caught:
                    cap.run("/nonexistent", "/nonexistent-out", SOL)
        self.assertIn("API_KEY", str(caught.exception))

    def test_a_model_that_has_not_passed_the_connection_check_is_refused(self):
        keys = {"OPENAI_API_KEY": "x", "ANTHROPIC_API_KEY": "y"}
        with tempfile.TemporaryDirectory() as d:
            with mock.patch.dict("os.environ", keys, clear=True):
                with mock.patch.object(
                    c, "benchmark_commit", lambda _: c.BENCHMARK_COMMIT
                ):
                    with self.assertRaises(SystemExit) as caught:
                        cap.run("/nonexistent", d, SOL)
        self.assertIn("connection check", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
