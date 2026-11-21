"""Phase 19x capture: the benchmark's own runner in its no-injection mode, on eight models.

Run with the benchmark's Python environment, from anywhere:

    python capture19x.py status --out <dir>
    python capture19x.py smoke --out <dir> [--model <id> ...]
    python capture19x.py run --benchmark <clone> --out <dir> --model <id>
    python capture19x.py records --benchmark <clone> --out <dir> --model <id>
    python capture19x.py audit --benchmark <clone> > audit.json

``status`` reads the logs on disk and prints the meter at each vendor. It calls nothing.
``smoke`` is the declared connection check: one request to each model with a prompt that is
not a case and one tool, and one request to the judge. ``run`` refuses a model that is not
declared, a clone that is not at the declared commit, a model that has not passed the
connection check, and any environment of any repeat that the meter does not allow; a refusal
by the meter ends the run with exit status 3. A unit that comes back more than a third
unscored, or with a case missing, ends it with exit status 4. It calls the benchmark's ``run_eval`` with no
defence and no injection, once per environment and repeat, then writes one record per run
and a capture record. The API keys are read from the environment by the vendors' libraries;
this module never reads, prints or stores them.

Three settings differ from the benchmark's defaults, as declared: a temperature is sent only
to the one model the paper ran, the scorer's judge call is re-issued without a temperature,
and an OpenAI model is called on the vendor's Responses endpoint.
"""

import argparse
import importlib.metadata
import json
import os
import platform
import sys
import time
from pathlib import Path

import control19x

SCHEMA = "simurgh-phase19x-capture-v1"
STOPPED = 3
HALTED = 4
STAGE_ONE_MODEL = "claude-haiku-5-5"
SETTINGS = {
    "provider": "the model vendor's own API",
    "judge_temperature": None,
    "judge_max_tokens": 8,
    "max_connections": 4,
    "max_tasks": 4,
    "retry_on_error": 3,
    "defence": None,
    "system_prompt": None,
    "reasoning": None,
}
ENDPOINT = {"anthropic": "messages", "openai": "responses"}
PACKAGES = ("inspect_ai", "anthropic", "openai", "mcp", "pydantic")
SMOKE_PROMPT = (
    "This is a connection check. Call the ping tool once with the value 7, then stop."
)
JUDGE_SMOKE_PROMPT = "This is a connection check. Reply with the single word yes."


def now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def suffix(repeat):
    return f"plain_r{repeat}"


def log_dir(out, model, environment, repeat):
    return (
        Path(out)
        / "attack_evaluation/evals"
        / control19x.dir_name(model)
        / f"{environment}_{suffix(repeat)}"
    )


def settings(model):
    spec = control19x.MODELS[model]
    return {
        **SETTINGS,
        "temperature": spec["temperature"],
        "endpoint": ENDPOINT[spec["provider"]],
    }


def collect(out, model):
    """Records and token usage for one model's logs on disk.

    A case and repeat with several logs (the runner retried it) keeps the scored record, or
    the last one if none was scored. Every finished log's tokens are counted, kept or not. A
    log the runner did not finish holds no token count: it is skipped and counted.
    """
    kept, usage, by_unit, superseded, unfinished = {}, {}, {}, 0, 0
    for repeat in range(1, control19x.MODELS[model]["repeats"] + 1):
        for environment in control19x.ENVIRONMENTS:
            for path in sorted(log_dir(out, model, environment, repeat).glob("*.eval")):
                if control19x.log_usage(path) is None:
                    unfinished += 1
                    continue
                for row in control19x.read_log(
                    path, environment=environment, repeat=repeat
                ):
                    control19x.add_usage(usage, row["usage"])
                    control19x.add_usage(
                        by_unit.setdefault((repeat, environment), {}), row["usage"]
                    )
                    key = (environment, row["case"], repeat)
                    old = kept.get(key)
                    if old is not None:
                        superseded += 1
                    if old is None or row["scored"] or not old["scored"]:
                        kept[key] = row
    return {
        "rows": [kept[key] for key in sorted(kept)],
        "usage": usage,
        "by_unit": by_unit,
        "superseded": superseded,
        "unfinished": unfinished,
    }


def unit_complete(rows, repeat, environment):
    """Every case of the environment has a record for the repeat, scored or not."""
    have = sum(
        1 for r in rows if r["repeat"] == repeat and r["environment"] == environment
    )
    return have >= control19x.ENVIRONMENT_CASES[environment]


def read_smoke(out):
    path = Path(out) / "smoke.json"
    return json.loads(path.read_text()) if path.exists() else []


def record_smoke(out, entries):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "smoke.json").write_text(
        json.dumps(read_smoke(out) + list(entries), indent=1, sort_keys=True) + "\n"
    )


def _latest(entries, model, role):
    found = [
        e for e in entries if e["model"] == model and e.get("role", "agent") == role
    ]
    return found[-1] if found else None


def smoke_passed(out, model):
    """The model's latest connection check passed, and so did the judge's."""
    entries = read_smoke(out)
    agent = _latest(entries, model, "agent")
    judge = _latest(entries, control19x.JUDGE, "judge")
    return bool(agent and agent["ok"] and judge and judge["ok"])


def lane_usage(out):
    """Token usage of every finished log of the lane and of the connection check."""
    usage, unfinished = {}, 0
    for model in control19x.MODELS:
        got = collect(out, model)
        control19x.add_usage(usage, got["usage"])
        unfinished += got["unfinished"]
    for entry in read_smoke(out):
        control19x.add_usage(usage, entry.get("usage") or {})
    return usage, unfinished


def _rounded(spent):
    return {provider: round(value, 6) for provider, value in sorted(spent.items())}


def timeline_path(out, model):
    return Path(out) / "timelines" / (model + ".json")


def load_timeline(out, model):
    """A model's start and finish times. Haiku 5.5's first repeat has lane 19w's."""
    path = timeline_path(out, model)
    legacy = Path(out) / "timeline.json"
    if path.exists():
        raw = json.loads(path.read_text())
    elif model == STAGE_ONE_MODEL and legacy.exists():
        raw = json.loads(legacy.read_text())
    else:
        raw = {}
    return {int(k): v for k, v in raw.items()}


def save_timeline(out, model, timeline):
    path = timeline_path(out, model)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(timeline, sort_keys=True))


def versions():
    out = {"python": platform.python_version()}
    for name in PACKAGES:
        try:
            out[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            out[name] = None
    return out


def _repeat_usage(by_unit, repeat):
    usage = {}
    for (unit_repeat, _), tokens in by_unit.items():
        if unit_repeat == repeat:
            control19x.add_usage(usage, tokens)
    return usage


def capture_record(model, got, data_sha256, timeline):
    spec = control19x.MODELS[model]
    full = sum(control19x.ENVIRONMENT_CASES.values())
    repeats = []
    for repeat in range(1, spec["repeats"] + 1):
        runs = sum(1 for row in got["rows"] if row["repeat"] == repeat)
        times = timeline.get(repeat, {})
        if "stopped" in times:
            status = "stopped"
        elif "halted" in times:
            status = "halted"
        elif runs >= full:
            status = "run"
        elif runs:
            status = "partial"
        else:
            status = "not_run"
        repeats.append(
            {
                "repeat": repeat,
                "status": status,
                "runs": runs,
                "metered_usd": _rounded(
                    control19x.meter(_repeat_usage(got["by_unit"], repeat))
                ),
                **times,
            }
        )
    return {
        "schema": SCHEMA,
        "benchmark": {
            "repo": control19x.BENCHMARK_REPO,
            "commit": control19x.BENCHMARK_COMMIT,
            "data_sha256": data_sha256,
        },
        "model": model,
        "provider": spec["provider"],
        "judge": control19x.JUDGE,
        "judge_votes": control19x.JUDGE_VOTES,
        "declared_repeats": spec["repeats"],
        "repeats": repeats,
        "usage": got["usage"],
        "settings": settings(model),
        "versions": versions(),
        "superseded_logs": got["superseded"],
        "unfinished_logs": got["unfinished"],
    }


def write_outputs(out, model, rows, record):
    out = Path(out)
    (out / "transcripts").mkdir(parents=True, exist_ok=True)
    (out / "captures").mkdir(parents=True, exist_ok=True)
    with open(out / "transcripts" / (model + ".jsonl"), "w") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    (out / "captures" / (model + ".json")).write_text(
        json.dumps(record, indent=1, sort_keys=True) + "\n"
    )


def rebuild(out, model, *, data_sha256):
    """Rebuild the records and the capture record from the run logs on disk. No model."""
    got = collect(out, model)
    record = capture_record(model, got, data_sha256, load_timeline(out, model))
    write_outputs(out, model, got["rows"], record)
    return record


def status(out):
    """What is on disk and what the meter reads. Calls nothing."""
    usage, unfinished = lane_usage(out)
    spent = control19x.meter(usage)
    models = {}
    for model, spec in control19x.MODELS.items():
        got = collect(out, model)
        done = [
            [repeat, environment]
            for repeat in range(1, spec["repeats"] + 1)
            for environment in control19x.ENVIRONMENTS
            if unit_complete(got["rows"], repeat, environment)
        ]
        models[model] = {
            "provider": spec["provider"],
            "units_done": len(done),
            "units_declared": spec["repeats"] * len(control19x.ENVIRONMENTS),
            "runs": len(got["rows"]),
            "metered_usd": _rounded(control19x.meter(got["usage"])),
            "connection_check": smoke_passed(out, model),
        }
    return {
        "meter_usd": _rounded(spent),
        "caps_usd": dict(control19x.CAPS),
        "left_usd": _rounded({p: control19x.CAPS[p] - spent[p] for p in spent}),
        "unfinished_logs": unfinished,
        "models": models,
    }


def unit_faults(rows, repeat, environment):
    """Runs of one unit that were not scored, and cases of it that have no record."""
    mine = [
        r for r in rows if r["repeat"] == repeat and r["environment"] == environment
    ]
    need = control19x.ENVIRONMENT_CASES[environment]
    return {
        "not_scored": sum(1 for r in mine if not r["scored"]),
        "missing": max(0, need - len(mine)),
    }


def must_halt(faults, environment):
    """More than a third of a unit not scored, or a case with no record, halts the chain."""
    need = control19x.ENVIRONMENT_CASES[environment]
    return faults["missing"] > 0 or faults["not_scored"] * 3 > need


def execute(out, model, run_eval, *, data_sha256, rerun_halted=False):
    """Run every unit of one model that is not on disk and that the meter allows.

    Returns 0 when the model is done, STOPPED when the meter refused a unit and HALTED when
    a unit came back mostly unscored or incomplete. A halted unit is run again only with
    ``rerun_halted``, which the declaration ties to an entry in the ledger.
    """
    out = Path(out)
    spec = control19x.MODELS[model]
    timeline = load_timeline(out, model)
    code = 0
    for repeat in range(1, spec["repeats"] + 1):
        for environment in control19x.ENVIRONMENTS:
            halted = timeline.get(repeat, {}).get("halted")
            if halted and not rerun_halted:
                code = HALTED
                break
            again = bool(halted and halted["environment"] == environment)
            got = collect(out, model)
            if unit_complete(got["rows"], repeat, environment) and not again:
                continue
            spent = control19x.meter(lane_usage(out)[0])
            held = control19x.reserve(model, got["by_unit"], repeat, environment)
            blocked = control19x.refused_by(spent, held)
            if blocked:
                timeline.setdefault(repeat, {})["stopped"] = {
                    "environment": environment,
                    "vendors": blocked,
                    "meter_usd": _rounded(spent),
                    "reserve_usd": _rounded(held),
                    "at": now(),
                }
                print(
                    f"{model} repeat {repeat} {environment} not started: meter "
                    f"{_rounded(spent)} reserve {_rounded(held)}",
                    flush=True,
                )
                code = STOPPED
                break
            times = timeline.setdefault(repeat, {})
            times.pop("stopped", None)
            if again:
                times.setdefault("halted_before", []).append(times.pop("halted"))
            times.setdefault("started", now())
            save_timeline(out, model, timeline)
            run_eval(
                env=environment,
                model=control19x.model_id(model),
                temperature=spec["temperature"],
                max_connections=SETTINGS["max_connections"],
                max_tasks=SETTINGS["max_tasks"],
                retry_on_error=SETTINGS["retry_on_error"],
                fail_on_error=False,
                resume=True,
                no_injection=True,
                output_suffix=suffix(repeat),
            )
            got = collect(out, model)
            faults = unit_faults(got["rows"], repeat, environment)
            if must_halt(faults, environment):
                times["halted"] = {"environment": environment, **faults, "at": now()}
                code = HALTED
            save_timeline(out, model, timeline)
            write_outputs(
                out,
                model,
                got["rows"],
                capture_record(model, got, data_sha256, timeline),
            )
            print(
                f"{model} repeat {repeat} {environment} "
                + (f"HALTED {faults}" if code else "done")
                + f": meter {_rounded(control19x.meter(lane_usage(out)[0]))}",
                flush=True,
            )
            if code:
                break
        if code:
            break
        got = collect(out, model)
        if all(unit_complete(got["rows"], repeat, e) for e in control19x.ENVIRONMENTS):
            timeline.setdefault(repeat, {}).setdefault("finished", now())
    save_timeline(out, model, timeline)
    got = collect(out, model)
    write_outputs(
        out, model, got["rows"], capture_record(model, got, data_sha256, timeline)
    )
    print(
        f"{model} " + {0: "DONE", STOPPED: "STOPPED", HALTED: "HALTED"}[code],
        flush=True,
    )
    return code


def wrap_get_model(original):
    """Send an OpenAI model to the Responses endpoint through the library's own option."""

    def get_model(model=None, **kwargs):
        if isinstance(model, str) and model.startswith("openai/"):
            kwargs.setdefault("responses_api", True)
        return original(model, **kwargs)

    return get_model


def _prepare(benchmark, out):
    """Point the benchmark at our output directory, drop the judge's temperature and wrap
    the library's model constructor. The benchmark's own files are not changed."""
    os.environ["PIB_OUTPUT_DIR"] = str(out)
    os.environ["LLM_CHECK_MODEL"] = "anthropic/" + control19x.JUDGE
    os.environ["LLM_CHECK_VOTES"] = str(control19x.JUDGE_VOTES)
    os.environ.pop("LLM_CHECK_CACHE_DIR", None)
    os.chdir(benchmark)
    import inspect_ai.model

    inspect_ai.model.get_model = wrap_get_model(inspect_ai.model.get_model)
    from prompt_injection_benchmark.core.evaluation import llm_check
    from prompt_injection_benchmark.scripts import run_eval

    async def generate(model_id, prompt, memoize):
        from inspect_ai.model import GenerateConfig, get_model

        config = GenerateConfig(max_tokens=SETTINGS["judge_max_tokens"])
        judge = get_model(model_id, config=config, memoize=memoize)
        return (await judge.generate(prompt)).completion

    llm_check._generate = generate
    return run_eval.run_eval


def _need_keys(providers):
    for provider in sorted(providers):
        if not os.environ.get(control19x.KEY_VARIABLE[provider]):
            raise SystemExit(control19x.KEY_VARIABLE[provider] + " is not set")


def run(benchmark, out, model, *, rerun_halted=False):
    if model not in control19x.MODELS:
        raise SystemExit("undeclared model: " + model)
    if control19x.benchmark_commit(benchmark) != control19x.BENCHMARK_COMMIT:
        raise SystemExit("the benchmark clone is not at the declared commit")
    _need_keys({control19x.MODELS[model]["provider"], "anthropic"})
    if not smoke_passed(out, model):
        raise SystemExit(
            "the connection check has not passed for " + model + " and the judge"
        )
    benchmark, out = Path(benchmark).resolve(), Path(out).resolve()
    data_sha256 = control19x.data_digest(benchmark)
    out.mkdir(parents=True, exist_ok=True)
    run_eval = _prepare(benchmark, out)
    return execute(
        out, model, run_eval, data_sha256=data_sha256, rerun_halted=rerun_halted
    )


def _tokens(model, usage):
    if usage is None:
        return {}
    return {
        model: {
            "input": usage.input_tokens or 0,
            "output": usage.output_tokens or 0,
            "cache_write": usage.input_tokens_cache_write or 0,
            "cache_read": usage.input_tokens_cache_read or 0,
        }
    }


async def _smoke_one(get_model, model, role):
    from inspect_ai.model import GenerateConfig
    from inspect_ai.tool import tool

    @tool
    def ping():
        async def execute(value: int):
            """Record one number for a connection check.

            Args:
                value: the number to record
            """
            return "recorded"

        return execute

    spec = control19x.MODELS[model]
    entry = {
        "model": model,
        "role": role,
        "ok": False,
        "error": None,
        "usage": {},
        "at": now(),
    }
    try:
        if role == "judge":
            config = GenerateConfig(max_tokens=SETTINGS["judge_max_tokens"])
            judge = get_model(control19x.model_id(model), config=config, memoize=False)
            output = await judge.generate(JUDGE_SMOKE_PROMPT)
            entry["ok"] = bool((output.completion or "").strip())
        else:
            wanted = {"max_connections": SETTINGS["max_connections"]}
            if spec["temperature"] is not None:
                wanted["temperature"] = spec["temperature"]
            agent = get_model(
                control19x.model_id(model),
                config=GenerateConfig(**wanted),
                memoize=False,
            )
            output = await agent.generate(SMOKE_PROMPT, tools=[ping()])
            calls = output.message.tool_calls or []
            entry["ok"] = any(call.function == "ping" for call in calls)
        entry["usage"] = _tokens(model, output.usage)
        entry["stop_reason"] = output.stop_reason
    except Exception as error:  # the class is recorded; the text may hold account data
        entry["error"] = type(error).__name__
        print(
            f"{model} ({role}): {type(error).__name__}: {str(error)[:400]}",
            file=sys.stderr,
        )
    return entry


async def _smoke(models):
    import inspect_ai.model

    get_model = wrap_get_model(inspect_ai.model.get_model)
    entries = [await _smoke_one(get_model, control19x.JUDGE, "judge")]
    for model in models:
        entries.append(await _smoke_one(get_model, model, "agent"))
    return entries


def smoke(out, models):
    import asyncio

    for model in models:
        if model not in control19x.MODELS:
            raise SystemExit("undeclared model: " + model)
    _need_keys({control19x.MODELS[m]["provider"] for m in models} | {"anthropic"})
    entries = asyncio.run(_smoke(models))
    record_smoke(out, entries)
    return entries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    launch = sub.add_parser("run")
    launch.add_argument("--benchmark", type=Path, required=True)
    launch.add_argument("--out", type=Path, required=True)
    launch.add_argument("--model", required=True)
    launch.add_argument("--rerun-halted", action="store_true")
    look = sub.add_parser("status")
    look.add_argument("--out", type=Path, required=True)
    check = sub.add_parser("smoke")
    check.add_argument("--out", type=Path, required=True)
    check.add_argument("--model", action="append", default=None)
    files = sub.add_parser("audit")
    files.add_argument("--benchmark", type=Path, required=True)
    again = sub.add_parser("records")
    again.add_argument("--benchmark", type=Path, required=True)
    again.add_argument("--out", type=Path, required=True)
    again.add_argument("--model", required=True)
    args = parser.parse_args()
    if args.command == "run":
        sys.exit(
            run(args.benchmark, args.out, args.model, rerun_halted=args.rerun_halted)
        )
    if args.command == "status":
        print(json.dumps(status(args.out), indent=1, sort_keys=True))
        return
    if args.command == "smoke":
        entries = smoke(args.out, args.model or list(control19x.MODELS))
        for entry in entries:
            print(
                f"{entry['model']:<28} {entry['role']:<6} "
                + ("ok" if entry["ok"] else "FAILED " + str(entry["error"])),
                flush=True,
            )
        sys.exit(0 if all(entry["ok"] for entry in entries) else 1)
    if control19x.benchmark_commit(args.benchmark) != control19x.BENCHMARK_COMMIT:
        raise SystemExit("the benchmark clone is not at the declared commit")
    if args.command == "records":
        if args.model not in control19x.MODELS:
            raise SystemExit("undeclared model: " + args.model)
        record = rebuild(
            args.out, args.model, data_sha256=control19x.data_digest(args.benchmark)
        )
        print(json.dumps({"repeats": record["repeats"]}, sort_keys=True))
    else:
        json.dump(
            control19x.audit(args.benchmark), sys.stdout, indent=1, sort_keys=True
        )
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()
