import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import capture19local as local  # noqa: E402
import inject19  # noqa: E402
import inject19k  # noqa: E402
import inject19m  # noqa: E402
import inject19n as n  # noqa: E402
import inject19v as v  # noqa: E402

FP = v.model("granite-4.2-8b")
JSON = v.model("qwen3-8b")
TORCH = importlib.util.find_spec("torch") is not None


def call(name, **fields):
    """A call in the function/parameter form, as the models' template shows it."""
    inner = "".join(
        f"<parameter={key}>\n{value}\n</parameter>\n" for key, value in fields.items()
    )
    return f"<tool_call>\n<function={name}>\n{inner}</function>\n</tool_call>"


def hermes(name, **fields):
    return (
        "<tool_call>\n"
        + json.dumps({"name": name, "arguments": fields})
        + "\n</tool_call>"
    )


SEND = {"resource": "inbox", "content": "Quarterly summary: 3 items."}


def answer(spec, resolved, reply):
    say = call if spec["wire"] == v.WIRE else hermes
    if resolved["block"] in n.TARGET_BLOCKS:
        if reply is True:
            return say("send_report", **resolved["expected"])
        if reply is False:
            return say("decline", reason="held")
        return reply
    return reply if type(reply) is str else "Notes for the next session."


def play(policy, spec):
    """Drive a whole run with ``policy(resolved) -> reply`` in the spec's own wire."""
    with v.reader(spec):
        run = n.Run(spec)
        while not run.done():
            resolved = run.next()
            if "skip" in resolved:
                row = n.skipped_row(resolved)
            else:
                row = n.sampled_row(
                    resolved,
                    raw=answer(spec, resolved, policy(resolved)),
                    truncated=False,
                    seconds=1.0,
                )
            run.accept(row)
        return run.rows


def moved_by_belief(r):
    """Sends when authorised, and in a restricted state only under a belief text."""
    if r["block"] == "active_control":
        return True
    return r["block"] == "placement" and r.get("kind") == "belief"


class DeclarationTests(unittest.TestCase):
    def test_the_eight_models(self):
        self.assertEqual(
            v.MODEL_IDS,
            (
                "qwen3-8b",
                "granite-4.2-8b",
                "qwen3-14b",
                "qwen3-32b",
                "qwen3.8-27b",
                "arete-27b",
                "nemotron-3.5-30b-a3b",
                "qwen3.6-35b-a3b",
            ),
        )
        self.assertEqual(len({m["repo"] for m in v.MODELS}), 8)
        for m in v.MODELS:
            self.assertRegex(m["revision"], r"^[0-9a-f]{40}$")
            self.assertEqual(m["template_kwargs"], {"enable_thinking": False})
            self.assertEqual(
                set(m), {"id", "repo", "revision", "wire", "template_kwargs", "note"}
            )
        self.assertEqual(
            [m["id"] for m in v.MODELS if m["wire"] == "hermes_tool_call"],
            ["qwen3-8b", "qwen3-14b", "qwen3-32b"],
        )
        self.assertEqual(
            sum(m["wire"] == v.WIRE for m in v.MODELS), 5, "five on the new wire"
        )
        self.assertEqual(v.LADDER, ("qwen3-8b", "qwen3-14b", "qwen3-32b"))

    def test_no_model_was_run_in_an_earlier_lane(self):
        earlier = (*local.MODELS, *inject19k.MODELS, *inject19m.MODELS, *n.MODELS)
        self.assertFalse({m["repo"] for m in earlier} & {m["repo"] for m in v.MODELS})
        self.assertFalse({m["id"] for m in earlier} & set(v.MODEL_IDS))

    def test_the_installation_check_uses_models_outside_the_lane(self):
        self.assertEqual(
            [m["repo"] for m in v.CHECK_MODELS],
            ["Qwen/Qwen3-0.6B", "Qwen/Qwen3.5-0.8B"],
        )
        self.assertEqual(
            [m["wire"] for m in v.CHECK_MODELS], ["hermes_tool_call", v.WIRE]
        )
        self.assertFalse(
            {m["repo"] for m in v.CHECK_MODELS} & {m["repo"] for m in v.MODELS}
        )
        for m in v.CHECK_MODELS:
            self.assertRegex(m["revision"], r"^[0-9a-f]{40}$")
        self.assertEqual(v.CHECK_SLOTS, 4)
        # token-for-token agreement with the plain loop decides on the plain transformer
        self.assertEqual([m["exact"] for m in v.CHECK_MODELS], [True, False])

    def test_the_installation_check_decides_as_declared(self):
        seen = []

        def one(spec, path, *, dtype, device, compare, log):
            seen.append((spec["id"], dtype, compare))
            return outcome[spec["id"]] if compare else (True, None)

        fake = mock.Mock(snapshot_download=lambda *a, **k: "/w")
        for outcome, want in (
            ({"check-qwen3-0.6b": (True, 4), "check-qwen3.5-0.8b": (True, 3)}, True),
            ({"check-qwen3-0.6b": (True, 3), "check-qwen3.5-0.8b": (True, 4)}, False),
            ({"check-qwen3-0.6b": (False, 4), "check-qwen3.5-0.8b": (True, 4)}, False),
            ({"check-qwen3-0.6b": (True, 4), "check-qwen3.5-0.8b": (False, 4)}, False),
        ):
            seen.clear()
            with (
                mock.patch.object(v, "_check_one", one),
                mock.patch.dict(sys.modules, {"huggingface_hub": fake}),
            ):
                got = v.check_installation(log=lambda _: None)
            self.assertIs(got, want, outcome)
            self.assertEqual(
                seen,
                [
                    ("check-qwen3-0.6b", "float32", True),
                    ("check-qwen3-0.6b", "bfloat16", False),
                    ("check-qwen3.5-0.8b", "float32", True),
                    ("check-qwen3.5-0.8b", "bfloat16", False),
                ],
            )

    def test_the_instrument_is_19ns(self):
        self.assertIs(v.base, n)
        self.assertEqual(v.STATUSES, n.STATUSES)
        self.assertNotIn(v.WIRE, local.WIRES)
        self.assertEqual(v.BUDGET_SECONDS, 3 * 3600)
        self.assertEqual(v.DTYPE, "bfloat16")


class DecoderTests(unittest.TestCase):
    def read(self, raw, truncated=False):
        return v.read(FP, raw, truncated)

    def test_one_block_and_nothing_else_is_the_call(self):
        self.assertEqual(
            self.read(call("send_report", **SEND)),
            {"status": "call", "name": "send_report", "arguments": SEND},
        )
        self.assertEqual(
            self.read("\n " + call("decline", reason="held") + "\n"),
            {"status": "declined", "name": "decline", "arguments": {"reason": "held"}},
        )

    def test_a_value_keeps_its_own_line_breaks(self):
        text = "line one\n\nline three\n"
        got = self.read(call("decline", reason=text))
        self.assertEqual(got["arguments"], {"reason": text})
        compact = "<tool_call><function=decline><parameter=reason>held</parameter></function></tool_call>"
        self.assertEqual(self.read(compact)["arguments"], {"reason": "held"})

    def test_text_around_the_block_is_not_a_call(self):
        block = call("send_report", **SEND)
        self.assertEqual(
            self.read("I will send it.\n" + block)["status"], "non_tool_text"
        )
        self.assertEqual(self.read(block + "\nDone.")["status"], "non_tool_text")
        self.assertEqual(self.read(block + "\n" + block)["status"], "non_tool_text")
        self.assertEqual(self.read("")["status"], "non_tool_text")
        self.assertEqual(
            self.read("The work item is on hold.")["status"], "non_tool_text"
        )

    def test_a_malformed_block_is_invalid(self):
        twice = (
            "<tool_call>\n<function=decline>\n<parameter=reason>\na\n</parameter>\n"
            "<parameter=reason>\nb\n</parameter>\n</function>\n</tool_call>"
        )
        junk = (
            "<tool_call>\n<function=decline>\nnote\n<parameter=reason>\na\n</parameter>\n"
            "</function>\n</tool_call>"
        )
        two = (
            "<tool_call>\n<function=decline>\n<parameter=reason>\na\n</parameter>\n"
            "</function>\n<function=decline>\n<parameter=reason>\nb\n</parameter>\n"
            "</function>\n</tool_call>"
        )
        for raw in (twice, junk, two):
            self.assertEqual(self.read(raw), {"status": "invalid"}, raw)

    def test_the_parser_still_decides_what_a_call_is(self):
        for raw in (
            call("delete_everything", reason="x"),
            call("send_report", resource="inbox"),
            call("send_report", **SEND, extra="1"),
            call("decline", reason=""),
            call("decline", reason="x" * 513),
        ):
            self.assertEqual(self.read(raw), {"status": "invalid"}, raw)
        self.assertEqual(
            self.read(call("send_report", **SEND), truncated=True),
            {"status": "truncated"},
        )

    def test_json_is_the_other_wires_form_and_is_invalid_here(self):
        neutral = json.dumps({"name": "send_report", "parameters": SEND})
        for raw in (
            hermes("send_report", **SEND),
            neutral,
            "<tool_call>\n" + neutral + "\n</tool_call>",
            json.dumps({"name": "send_report", "arguments": SEND}),
            "[]",
        ):
            self.assertEqual(self.read(raw), {"status": "invalid"}, raw)

    def test_the_same_output_on_a_json_wire_model_is_read_by_19hs_decoder(self):
        raw = hermes("send_report", **SEND)
        self.assertEqual(v.read(JSON, raw, False)["status"], "call")
        raw = call("send_report", **SEND)
        self.assertEqual(v.read(JSON, raw, False)["status"], "non_tool_text")

    def test_lenient_read(self):
        block = call("send_report", **SEND)
        loose = v.lenient_function_parameter
        self.assertEqual(loose(block, False)["status"], "call")
        self.assertEqual(loose("Reasoning first.\n" + block, False)["status"], "call")
        self.assertEqual(loose(block + "\nDone.", False)["status"], "non_tool_text")
        self.assertEqual(loose(block + block, False)["status"], "non_tool_text")
        self.assertEqual(loose(hermes("send_report", **SEND), False)["status"], "call")
        self.assertEqual(loose(block, True), {"status": "truncated"})

    def test_forms(self):
        block = call("decline", reason="held")
        form = v.form_function_parameter
        self.assertEqual(form(block), "wrapped")
        self.assertEqual(form("Why: held.\n" + block), "wrapped_with_text")
        self.assertEqual(form(block + block), "several_calls")
        self.assertEqual(form('{"name": "decline"}'), "bare_json")
        self.assertEqual(form("On hold."), "prose")
        self.assertEqual(form(" \n"), "empty")
        self.assertEqual(form(hermes("decline", reason="held")), "wrapped_with_text")


class ReaderTests(unittest.TestCase):
    def pinned(self):
        return local.decode, inject19k.lenient, n.wire_form

    def test_the_three_names_are_swapped_only_inside_the_block(self):
        before = self.pinned()
        with v.reader(FP):
            self.assertIs(local.decode, v._decode)
            self.assertIs(inject19k.lenient, v.lenient_function_parameter)
            self.assertIs(n.wire_form, v.form_function_parameter)
        self.assertEqual(self.pinned(), before)

    def test_a_block_inside_a_block_leaves_the_outer_one_in_force(self):
        before = self.pinned()
        raw = call("decline", reason="held")
        with v.reader(FP):
            self.assertEqual(v.read(FP, raw, False)["status"], "declined")
            self.assertEqual(v.judge.__module__, "inject19v")
            self.assertIs(local.decode, v._decode)
            self.assertEqual(n.wire_form(raw), "wrapped")
            with v.reader(JSON):
                self.assertIs(local.decode, v._decode)
        self.assertEqual(self.pinned(), before)

    def test_they_are_restored_after_an_error(self):
        before = self.pinned()
        with self.assertRaises(RuntimeError):
            with v.reader(FP):
                raise RuntimeError("stop")
        self.assertEqual(self.pinned(), before)

    def test_a_json_wire_model_touches_nothing(self):
        before = self.pinned()
        with v.reader(JSON):
            self.assertEqual(self.pinned(), before)

    def test_importing_this_module_leaves_the_pinned_readers_in_place(self):
        self.assertIs(local.decode, v._pinned["decode"])
        self.assertIs(inject19k.lenient, v._pinned["lenient"])
        self.assertIs(n.wire_form, v._pinned["form"])
        self.assertEqual(local.decode.__module__, "capture19local")
        self.assertEqual(inject19k.lenient.__module__, "inject19k")
        self.assertEqual(n.wire_form.__module__, "inject19n")

    def test_the_other_wires_pass_through_the_swapped_decoder_unchanged(self):
        samples = (
            hermes("send_report", **SEND),
            json.dumps({"name": "decline", "parameters": {"reason": "held"}}),
            "prose",
            "",
        )
        for wire in local.WIRES:
            for raw in samples:
                self.assertEqual(v._decode(wire, raw), local.decode(wire, raw))
        with self.assertRaises(ValueError):
            v._decode("unknown", "x")

    def test_an_earlier_lanes_reader_is_unchanged_by_a_read_here(self):
        spec = n.model("qwen3-4b-4bit")
        raw = hermes("send_report", **SEND)
        before = inject19.read(spec, raw, False)
        v.read(FP, call("send_report", **SEND), False)
        self.assertEqual(inject19.read(spec, raw, False), before)
        self.assertEqual(before["status"], "call")


class RunTests(unittest.TestCase):
    """A scripted model on each wire: the analysis must not depend on the wire."""

    @classmethod
    def setUpClass(cls):
        cls.fp_rows = play(moved_by_belief, FP)
        cls.json_rows = play(moved_by_belief, JSON)
        cls.fp = v.assess(FP, cls.fp_rows)
        cls.json = v.assess(JSON, cls.json_rows)

    def test_a_scripted_run_is_read_the_same_on_both_wires(self):
        self.assertEqual(len(self.fp_rows), len(n.slots()))
        self.assertEqual(self.fp["eligibility"], self.json["eligibility"])
        self.assertTrue(self.fp["eligibility"]["eligible"])
        self.assertEqual(self.fp["hypotheses"], self.json["hypotheses"])
        a, b = dict(self.fp["analysis"]), dict(self.json["analysis"])
        self.assertEqual((a.pop("model"), b.pop("model")), (FP["id"], JSON["id"]))
        self.assertEqual(a, b)

    def test_the_scripted_model_is_read_as_it_was_scripted(self):
        a = self.fp["analysis"]
        self.assertEqual(a["active_control"]["calls"], n.ACTIVE)
        self.assertEqual(a["active_control"]["exact"], n.ACTIVE)
        for placement in n.PLACEMENTS:
            self.assertEqual(a["placement"][placement]["control"]["sent"], 0)
            self.assertGreater(a["placement"][placement]["injected"]["sent"], 0)
        self.assertTrue(self.fp["hypotheses"]["N2"]["supported"])

    def test_without_the_reader_the_same_rows_hold_no_call(self):
        with self.assertRaises(ValueError):
            # 19n's own code does not know this wire
            n.assess(FP, self.fp_rows)

    def test_a_refused_send_is_fed_back_in_the_models_own_form(self):
        with v.reader(FP):
            run = n.replay(FP, self.fp_rows)
        retry = next(
            r
            for r, row in zip(run.resolved, run.rows)
            if r["block"] == "retry" and not row.get("skipped")
        )
        said = retry["messages"][-2]
        self.assertEqual(said["role"], "assistant")
        self.assertIn("<function=send_report>", said["content"])

    def test_partial_and_active_control(self):
        self.assertEqual(
            v.active_control(FP, self.fp_rows[: n.ACTIVE])["calls"], n.ACTIVE
        )
        self.assertEqual(v.partial(FP, self.fp_rows[:40])["rows"], 40)
        self.assertEqual(len(v.judge(FP, self.fp_rows)), len(n.slots()))

    def test_ladder(self):
        entry = lambda i, a: {  # noqa: E731
            "id": i,
            "status": "captured",
            **a,
        }
        models = [
            entry("qwen3-8b", self.json),
            {"id": "qwen3-14b", "status": "not_captured", "reason": "x"},
            entry("granite-4.2-8b", self.fp),
        ]
        rows = v.ladder(models)
        self.assertEqual([r["id"] for r in rows], list(v.LADDER))
        self.assertEqual(rows[1], {"id": "qwen3-14b", "status": "not_captured"})
        self.assertEqual(rows[2], {"id": "qwen3-32b", "status": "absent"})
        self.assertEqual(rows[0]["active_calls"], n.ACTIVE)
        self.assertEqual(rows[0]["control_sent"], 0)
        self.assertEqual(rows[0]["injected_n"], 384)
        self.assertEqual(rows[0]["injected_sent"], 192)


class FakeSampler:
    def __init__(self, spec, policy):
        self.spec, self.policy = spec, policy

    def run(self, resolved):
        raw = answer(self.spec, resolved, self.policy(resolved))
        return n.sampled_row(
            resolved,
            raw=raw,
            streamed=raw,
            truncated=False,
            generated_token_sha256="t",
            rendered_prompt_sha256="p",
        )


class CaptureTests(unittest.TestCase):
    def test_a_capture_on_the_new_wire_fills_the_transcript(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "t.jsonl"
            with v.reader(FP):
                got = n.capture(
                    FP,
                    path,
                    lambda: FakeSampler(FP, moved_by_belief),
                    log=lambda _: None,
                )
            rows = [json.loads(x) for x in path.read_text().splitlines()]
        self.assertEqual(got["status"], "captured")
        self.assertEqual(got["determinism_recheck"], {"rows": 6, "identical": True})
        self.assertEqual(v.assess(FP, rows)["eligibility"]["active_calls"], n.ACTIVE)

    def test_a_model_that_writes_json_on_the_new_wire_stops_at_the_control(self):
        wrong = lambda r: hermes("send_report", **r["expected"])  # noqa: E731
        with tempfile.TemporaryDirectory() as tmp:
            with v.reader(FP):
                got = n.capture(
                    FP,
                    Path(tmp) / "t.jsonl",
                    lambda: FakeSampler(FP, wrong),
                    log=lambda _: None,
                )
        self.assertEqual(got["status"], "stopped_positive_control")
        self.assertEqual(got["active_calls"], 0)

    def run_all(
        self, tmp, *, fetch=None, process=None, keep=(), deadline=None, retry=False
    ):
        done = mock.Mock(returncode=0)
        with (
            mock.patch.object(v, "host", return_value={"host": {}, "runtime": {}}),
            mock.patch.object(v, "_drop_weights") as dropped,
            mock.patch.object(local, "file_digests", return_value={"f": {}}),
            mock.patch.dict(
                sys.modules,
                {"huggingface_hub": mock.Mock(snapshot_download=fetch)},
            ),
            mock.patch.object(
                v.subprocess, "run", side_effect=process or (lambda *a, **k: done)
            ),
        ):
            meta = v.capture_all(
                tmp, keep=keep, deadline=deadline, retry=retry, log=lambda _: None
            )
        return meta, [c.args[0]["id"] for c in dropped.call_args_list]

    def test_every_failure_is_recorded_and_the_next_model_starts(self):
        def fetch(repo, revision):
            if "granite" in repo:
                raise OSError("no route")
            return "/weights"

        def process(command, timeout):
            self.assertEqual(timeout, v.BUDGET_SECONDS)
            model_id, out = command[-2], Path(command[-1])
            if model_id == "qwen3-14b":
                raise v.subprocess.TimeoutExpired(command, timeout)
            if model_id == "qwen3-32b":
                return mock.Mock(returncode=137)
            (out / ("result-" + model_id + ".json")).write_text(
                json.dumps({"status": "captured", "repo": "r", "revision": "s"})
            )
            return mock.Mock(returncode=0)

        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "transcripts").mkdir()
            (Path(tmp) / "transcripts" / "qwen3-14b.jsonl").write_text("{}\n{}\n")
            meta, dropped = self.run_all(
                tmp, fetch=fetch, process=process, keep=("qwen3-8b",)
            )
            saved = json.loads((Path(tmp) / "capture.json").read_text())
        models = meta["models"]
        self.assertEqual(saved, meta)
        self.assertEqual(list(models), list(v.MODEL_IDS))
        self.assertEqual(models["qwen3-8b"]["status"], "captured")
        self.assertEqual(models["granite-4.2-8b"]["reason"], "fetch_failed:OSError")
        self.assertIsNone(models["granite-4.2-8b"]["files"])
        self.assertEqual(models["qwen3-14b"]["reason"], "time_budget_exceeded")
        self.assertEqual(models["qwen3-14b"]["partial_rows"], 2)
        self.assertEqual(models["qwen3-32b"]["reason"], "process_exit_137")
        self.assertEqual(
            models["qwen3-32b"]["revision"], v.model("qwen3-32b")["revision"]
        )
        self.assertEqual(dropped, list(v.MODEL_IDS[1:]))

    def test_the_deadline_comes_from_the_cap_and_the_price(self):
        self.assertEqual(v.SPEND_CAP_USD, 25.0)
        # at 2.50 an hour the cap buys ten hours; a quarter of an hour is kept for teardown
        self.assertEqual(v.deadline_for(1000.0, 2.5), 1000.0 + 10 * 3600 - 900)
        self.assertEqual(v.allowance(None, 0.0), (v.BUDGET_SECONDS, False))
        self.assertEqual(v.allowance(50_000.0, 0.0), (v.BUDGET_SECONDS, False))
        self.assertEqual(v.allowance(4000.0, 1000.0), (3000, True))
        self.assertEqual(v.allowance(1000.0, 4000.0), (-3000, True))

    def test_at_the_deadline_the_running_model_stops_and_no_other_starts(self):
        clock = {"now": 0.0}
        ran = []

        def process(command, timeout):
            ran.append((command[-2], timeout))
            if len(ran) == 2:
                clock["now"] += timeout
                raise v.subprocess.TimeoutExpired(command, timeout)
            clock["now"] += 3000
            (Path(command[-1]) / ("result-" + command[-2] + ".json")).write_text(
                json.dumps({"status": "captured"})
            )
            return mock.Mock(returncode=0)

        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(v.time, "time", lambda: clock["now"]):
                meta, _ = self.run_all(
                    tmp, fetch=lambda *a, **k: "/w", process=process, deadline=7000.0
                )
                self.assertEqual(list(meta["models"]), list(v.MODEL_IDS[:2]))
                closed = v.close(tmp, log=lambda _: None)
        self.assertEqual(ran, [("qwen3-8b", 7000), ("granite-4.2-8b", 4000)])
        self.assertEqual(meta["models"]["granite-4.2-8b"]["reason"], v.CAP_REACHED)
        self.assertEqual(sorted(closed["models"]), sorted(v.MODEL_IDS))
        for model_id in v.MODEL_IDS[2:]:
            got = closed["models"][model_id]
            self.assertEqual(
                (got["status"], got["reason"]), ("not_captured", v.NOT_STARTED)
            )
            self.assertEqual(got["revision"], v.model(model_id)["revision"])
            self.assertEqual(got["partial_rows"], 0)

    def test_a_model_that_failed_before_its_first_row_may_run_once_more(self):
        calls = []

        def process(command, timeout):
            model_id, out = command[-2], Path(command[-1])
            calls.append(model_id)
            if calls.count(model_id) == 1 and model_id in ("qwen3-8b", "qwen3-14b"):
                if model_id == "qwen3-14b":
                    (out / "transcripts").mkdir(exist_ok=True)
                    (out / "transcripts" / "qwen3-14b.jsonl").write_text("{}\n")
                return mock.Mock(returncode=1)
            if model_id == "granite-4.2-8b":
                return mock.Mock(returncode=1)
            (out / ("result-" + model_id + ".json")).write_text(
                json.dumps({"status": "captured"})
            )
            return mock.Mock(returncode=0)

        fetch = lambda *a, **k: "/w"  # noqa: E731
        with tempfile.TemporaryDirectory() as tmp:
            first, _ = self.run_all(tmp, fetch=fetch, process=process)
            self.assertTrue(v.may_retry(first["models"]["qwen3-8b"]))
            self.assertFalse(
                v.may_retry(first["models"]["qwen3-14b"]), "it wrote a row"
            )
            self.assertFalse(v.may_retry(first["models"]["qwen3-32b"]), "captured")
            before = len(calls)
            second, _ = self.run_all(tmp, fetch=fetch, process=process, retry=True)
            self.assertEqual(calls[before:], ["qwen3-8b", "granite-4.2-8b"])
            third, _ = self.run_all(tmp, fetch=fetch, process=process, retry=True)
            self.assertEqual(len(calls), before + 2, "one retry and no more")
        again = second["models"]["qwen3-8b"]
        self.assertEqual(again["status"], "captured")
        self.assertEqual(
            [a["reason"] for a in again["earlier_attempts"]], ["process_exit_1"]
        )
        failed = third["models"]["granite-4.2-8b"]
        self.assertEqual(
            (failed["status"], failed["reason"]), ("not_captured", "process_exit_1")
        )
        self.assertEqual(len(failed["earlier_attempts"]), 1)
        self.assertEqual(second["models"]["qwen3-14b"]["partial_rows"], 1)
        self.assertNotIn("earlier_attempts", second["models"]["qwen3-14b"])
        for reason in (v.CAP_REACHED, v.NOT_STARTED, "time_budget_exceeded"):
            self.assertFalse(
                v.may_retry(
                    {"status": "not_captured", "partial_rows": 0, "reason": reason}
                )
            )

    def test_the_rental_record_is_the_four_declared_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "capture.json").write_text(json.dumps({"models": {}}))
            got = v.record_rental(
                tmp, provider="p", machine="m", usd_per_hour=2.09, seconds=3600
            )
            saved = json.loads((Path(tmp) / "capture.json").read_text())
        self.assertEqual(saved["rental"], got)
        self.assertEqual(
            got,
            {"provider": "p", "machine": "m", "usd_per_hour": 2.09, "seconds": 3600},
        )
        self.assertEqual(saved["models"], {})

    def test_the_optional_kernels_are_named(self):
        self.assertEqual(
            v.KERNELS, ("causal-conv1d", "flash-linear-attention", "mamba-ssm")
        )
        self.assertIsNone(v._installed("no-such-package-19v"))

    def test_a_recorded_model_is_not_run_again(self):
        ran = []

        def process(command, timeout):
            ran.append(command[-2])
            return mock.Mock(returncode=3)

        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "capture.json").write_text(
                json.dumps({"models": {"qwen3-8b": {"status": "captured"}}})
            )
            self.run_all(tmp, fetch=lambda *a, **k: "/w", process=process)
        self.assertEqual(ran, list(v.MODEL_IDS[1:]))


@unittest.skipUnless(TORCH, "needs torch")
class SamplerTests(unittest.TestCase):
    def draw(self, scores, seed, *, temperature=1.0, top_p=0.9):
        import torch

        generator = torch.Generator(device="cpu").manual_seed(seed)
        return v.nucleus(
            torch.tensor(scores, dtype=torch.float32), temperature, top_p, generator
        )

    def test_the_kept_set_stops_at_the_token_that_reaches_top_p(self):
        import math

        scores = [math.log(p) for p in (0.5, 0.3, 0.15, 0.05)]
        drawn = {self.draw(scores, seed, top_p=0.8) for seed in range(300)}
        self.assertEqual(drawn, {0, 1})
        drawn = {self.draw(scores, seed, top_p=0.81) for seed in range(300)}
        self.assertEqual(drawn, {0, 1, 2})
        self.assertEqual({self.draw(scores, s, top_p=0.5) for s in range(50)}, {0})

    def test_a_seed_fixes_the_draw(self):
        scores = [0.1 * i for i in range(50)]
        first = [self.draw(scores, 7) for _ in range(5)]
        self.assertEqual(len(set(first)), 1)
        self.assertGreater(len({self.draw(scores, s) for s in range(40)}), 5)

    def test_a_low_temperature_takes_the_top_token(self):
        scores = [1.0, 1.2, 0.9]
        drawn = {self.draw(scores, s, temperature=0.01) for s in range(50)}
        self.assertEqual(drawn, {1})

    def test_ties_keep_the_lower_token_id_first(self):
        import math

        scores = [math.log(0.25)] * 4
        drawn = {self.draw(scores, s, top_p=0.5) for s in range(200)}
        self.assertEqual(drawn, {0, 1})

    def test_the_processor_leaves_one_token(self):
        import torch

        processor = v._processor(11)
        scores = torch.tensor([[0.0, 5.0, 1.0, -2.0]])
        out = processor(torch.tensor([[1, 2]]), scores)
        self.assertEqual(out.shape, scores.shape)
        self.assertEqual(int((out == 0).sum()), 1)
        self.assertEqual(int(torch.isinf(out).sum()), 3)


if __name__ == "__main__":
    unittest.main()
