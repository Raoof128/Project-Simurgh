"""Phase 19w capture: the benchmark's own runner in its no-injection mode, metered.

Run with the benchmark's Python environment, from anywhere:

    python capture19w.py run --benchmark <clone> --out <dir> --model claude-haiku-5-5
    python capture19w.py audit --benchmark <clone> > audit.json
    python capture19w.py records --benchmark <clone> --out <dir> --model claude-haiku-5-5

``run`` refuses a clone that is not at the declared commit, a model whose stage is not
authorised, and a repeat that the meter does not allow. It calls the benchmark's ``run_eval``
with no defence and no injection, once per environment and repeat, then writes one record per
run and a capture record. The API key is read from the environment by the provider library;
this module never reads, prints or stores it.

Two settings differ from the benchmark's defaults, as declared: no temperature is sent, and
the scorer's judge call is re-issued without a temperature.
"""

import argparse
import importlib.metadata
import json
import os
import platform
import sys
import time
from pathlib import Path

import control19w

SCHEMA = "simurgh-phase19w-capture-v1"
AUTHORISED_STAGES = (1,)
SETTINGS = {
    "provider": "the model vendor's own API",
    "temperature": None,
    "judge_temperature": None,
    "judge_max_tokens": 8,
    "max_connections": 4,
    "max_tasks": 4,
    "retry_on_error": 3,
    "defence": None,
    "system_prompt": None,
}
PACKAGES = ("inspect_ai", "anthropic", "mcp", "pydantic")


def suffix(repeat):
    return f"plain_r{repeat}"


def log_dir(out, model, environment, repeat):
    return (
        Path(out)
        / "attack_evaluation/evals"
        / model
        / f"{environment}_{suffix(repeat)}"
    )


def collect(out, model, repeats):
    """Records and token usage for the repeats on disk.

    A case and repeat with several logs (the runner retried it) keeps the scored record, or
    the last one if none was scored. Every log's tokens are counted, kept or not.
    """
    kept, usage, by_repeat, superseded = {}, {}, {}, 0
    for repeat in range(1, repeats + 1):
        for environment in control19w.ENVIRONMENTS:
            for path in sorted(log_dir(out, model, environment, repeat).glob("*.eval")):
                for row in control19w.read_log(
                    path, environment=environment, repeat=repeat
                ):
                    control19w.add_usage(usage, row["usage"])
                    control19w.add_usage(by_repeat.setdefault(repeat, {}), row["usage"])
                    key = (environment, row["case"], repeat)
                    old = kept.get(key)
                    if old is not None:
                        superseded += 1
                    if old is None or row["scored"] or not old["scored"]:
                        kept[key] = row
    return [kept[key] for key in sorted(kept)], usage, superseded, by_repeat


def repeat_cost(by_repeat, repeat):
    return control19w.meter(by_repeat.get(repeat, {}))


def versions():
    out = {"python": platform.python_version()}
    for name in PACKAGES:
        try:
            out[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            out[name] = None
    return out


def capture_record(model, rows, usage, superseded, by_repeat, data_sha256, timeline):
    declared = control19w.STAGES[model]["repeats"]
    return {
        "schema": SCHEMA,
        "benchmark": {
            "repo": control19w.BENCHMARK_REPO,
            "commit": control19w.BENCHMARK_COMMIT,
            "data_sha256": data_sha256,
        },
        "model": model,
        "judge": control19w.JUDGE,
        "judge_votes": control19w.JUDGE_VOTES,
        "stage": control19w.STAGES[model]["stage"],
        "declared_repeats": declared,
        "repeats": [
            {
                "repeat": repeat,
                "status": "run" if repeat in by_repeat else "not_run",
                "runs": sum(1 for row in rows if row["repeat"] == repeat),
                "metered_usd": round(repeat_cost(by_repeat, repeat), 6),
                **timeline.get(repeat, {}),
            }
            for repeat in range(1, declared + 1)
        ],
        "usage": usage,
        "settings": dict(SETTINGS),
        "versions": versions(),
        "superseded_logs": superseded,
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
    out = Path(out)
    declared = control19w.STAGES[model]["repeats"]
    timeline_path = out / "timeline.json"
    timeline = (
        {int(k): v for k, v in json.loads(timeline_path.read_text()).items()}
        if timeline_path.exists()
        else {}
    )
    rows, usage, superseded, by_repeat = collect(out, model, declared)
    record = capture_record(
        model, rows, usage, superseded, by_repeat, data_sha256, timeline
    )
    write_outputs(out, model, rows, record)
    return record


def _prepare(benchmark, out):
    """Point the benchmark at our output directory and drop the judge's temperature."""
    os.environ["PIB_OUTPUT_DIR"] = str(out)
    os.environ["LLM_CHECK_MODEL"] = "anthropic/" + control19w.JUDGE
    os.environ["LLM_CHECK_VOTES"] = str(control19w.JUDGE_VOTES)
    os.environ.pop("LLM_CHECK_CACHE_DIR", None)
    os.chdir(benchmark)
    from prompt_injection_benchmark.core.evaluation import llm_check
    from prompt_injection_benchmark.scripts import run_eval

    async def generate(model_id, prompt, memoize):
        from inspect_ai.model import GenerateConfig, get_model

        config = GenerateConfig(max_tokens=SETTINGS["judge_max_tokens"])
        judge = get_model(model_id, config=config, memoize=memoize)
        return (await judge.generate(prompt)).completion

    llm_check._generate = generate
    return run_eval.run_eval


def run(benchmark, out, model):
    benchmark, out = Path(benchmark).resolve(), Path(out).resolve()
    if model not in control19w.STAGES:
        raise SystemExit("undeclared model: " + model)
    stage = control19w.STAGES[model]
    if stage["stage"] not in AUTHORISED_STAGES or stage["repeats"] is None:
        raise SystemExit("stage not authorised for " + model)
    if control19w.benchmark_commit(benchmark) != control19w.BENCHMARK_COMMIT:
        raise SystemExit("the benchmark clone is not at the declared commit")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("ANTHROPIC_API_KEY is not set")
    data_sha256 = control19w.data_digest(benchmark)
    timeline_path = out / "timeline.json"
    timeline = (
        {int(k): v for k, v in json.loads(timeline_path.read_text()).items()}
        if timeline_path.exists()
        else {}
    )
    out.mkdir(parents=True, exist_ok=True)
    run_eval = _prepare(benchmark, out)
    for repeat in range(1, stage["repeats"] + 1):
        rows, usage, superseded, by_repeat = collect(out, model, stage["repeats"])
        started_before = repeat in by_repeat
        spent = control19w.meter(usage)
        previous = repeat_cost(by_repeat, repeat - 1) if repeat > 1 else None
        if not started_before and not control19w.may_start(
            spent=spent, previous=previous
        ):
            print(f"repeat {repeat} not started: meter {spent:.4f} USD", flush=True)
            break
        timeline.setdefault(repeat, {})["started"] = timeline.get(repeat, {}).get(
            "started", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        )
        timeline_path.write_text(json.dumps(timeline))
        for environment in control19w.ENVIRONMENTS:
            run_eval(
                env=environment,
                model="anthropic/" + model,
                temperature=SETTINGS["temperature"],
                max_connections=SETTINGS["max_connections"],
                max_tasks=SETTINGS["max_tasks"],
                retry_on_error=SETTINGS["retry_on_error"],
                fail_on_error=False,
                resume=True,
                no_injection=True,
                output_suffix=suffix(repeat),
            )
        timeline[repeat]["finished"] = time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
        )
        timeline_path.write_text(json.dumps(timeline))
        rows, usage, superseded, by_repeat = collect(out, model, stage["repeats"])
        record = capture_record(
            model, rows, usage, superseded, by_repeat, data_sha256, timeline
        )
        write_outputs(out, model, rows, record)
        print(
            f"repeat {repeat} done: {len(rows)} records, meter "
            f"{control19w.meter(usage):.4f} USD",
            flush=True,
        )
    print("DONE", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    launch = sub.add_parser("run")
    launch.add_argument("--benchmark", type=Path, required=True)
    launch.add_argument("--out", type=Path, required=True)
    launch.add_argument("--model", required=True)
    look = sub.add_parser("audit")
    look.add_argument("--benchmark", type=Path, required=True)
    again = sub.add_parser("records")
    again.add_argument("--benchmark", type=Path, required=True)
    again.add_argument("--out", type=Path, required=True)
    again.add_argument("--model", required=True)
    args = parser.parse_args()
    if args.command == "run":
        run(args.benchmark, args.out, args.model)
    elif args.command == "records":
        if control19w.benchmark_commit(args.benchmark) != control19w.BENCHMARK_COMMIT:
            raise SystemExit("the benchmark clone is not at the declared commit")
        record = rebuild(
            args.out, args.model, data_sha256=control19w.data_digest(args.benchmark)
        )
        print(json.dumps({"repeats": record["repeats"]}, sort_keys=True))
    else:
        if control19w.benchmark_commit(args.benchmark) != control19w.BENCHMARK_COMMIT:
            raise SystemExit("the benchmark clone is not at the declared commit")
        json.dump(
            control19w.audit(args.benchmark), sys.stdout, indent=1, sort_keys=True
        )
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()
