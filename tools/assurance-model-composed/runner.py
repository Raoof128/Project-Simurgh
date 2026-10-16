"""One retained batch per request; journal responses before any execution."""

import os
from pathlib import Path

from contract import CONTROLS, TRIALS, messages, parse
from deps import wire
from trial import run_branch

SEED_BASE = 104000


def schedule(tasks, trials, batch_size):
    slots = [(case, trial) for trial in trials for case in tasks]
    for batch, start in enumerate(range(0, len(slots), batch_size)):
        items = slots[start : start + batch_size]
        yield {
            "type": "request",
            "batch": batch,
            "seed": SEED_BASE + batch,
            "slots": [
                {"task_id": c["id"], "trial": t, "position": i}
                for i, (c, t) in enumerate(items)
            ],
            "prompts": [messages(c) for c, _ in items],
        }


def proposal(generation):
    return (
        parse(generation["raw"], generation["truncated"])
        if generation["status"] == "generated"
        else {"status": "generation_error"}
    )


def execute(tasks, provider, out, *, trials=TRIALS, batch_size=16, metadata):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    cap = {
        "schema": "simurgh-phase10-capture-v1",
        "metadata": metadata,
        "model_header": provider.header,
        "complete": False,
        "requests": [],
        "generations": [],
        "rows": [],
    }
    files = {}
    with (out / "journal.jsonl").open("xb") as journal:

        def append(value):
            journal.write(wire(value))
            journal.flush()
            os.fsync(journal.fileno())

        append(
            {"type": "header", "metadata": metadata, "model_header": provider.header}
        )
        try:
            cases = {c["id"]: c for c in tasks}
            for request in schedule(tasks, trials, batch_size):
                cap["requests"].append(request)
                append(request)
                outputs = provider.generate(request["prompts"], request["seed"])
                append(
                    {
                        "type": "batch_response",
                        "batch": request["batch"],
                        "outputs": outputs,
                    }
                )
                if type(outputs) is not list or len(outputs) != len(request["slots"]):
                    raise ValueError("batch_inventory")
                batch = []
                for slot, output in zip(request["slots"], outputs):
                    generation = dict(
                        id="g" + str(len(cap["generations"]) + 1),
                        **slot,
                        batch=request["batch"],
                        seed=request["seed"],
                        output=output,
                    )
                    cap["generations"].append(generation)
                    batch.append(generation)
                    append({"type": "generation", "value": generation})
                for g in batch:
                    for control in CONTROLS:
                        directory = out / "branches" / f"{g['id']}-{control}"
                        row, raw = run_branch(
                            cases[g["task_id"]],
                            g["trial"],
                            control,
                            g["id"],
                            proposal(g["output"]),
                            directory,
                        )
                        files.update(raw)
                        cap["rows"].append(row)
                        append({"type": "branch", "value": row})
            cap["complete"] = True
            append(
                {
                    "type": "complete",
                    "generations": len(cap["generations"]),
                    "branches": len(cap["rows"]),
                }
            )
            (out / "capture.json").write_bytes(wire(cap))
            return cap, files
        except BaseException as exc:
            (out / "failure.json").write_bytes(
                wire(
                    {
                        "complete": False,
                        "error_type": type(exc).__name__,
                        "generations": len(cap["generations"]),
                        "branches": len(cap["rows"]),
                    }
                )
            )
            (out / "partial-capture.json").write_bytes(wire(cap))
            raise
