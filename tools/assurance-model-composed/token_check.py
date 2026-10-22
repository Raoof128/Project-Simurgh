"""Offline tokenizer linkage; does not regenerate or attest inference."""

import argparse
import hashlib
import os
from pathlib import Path

from contract import TRIALS, messages, validate_tasks
from model_inputs import DOCS, MANIFEST, SEED_BASE, TOOLS, check_output, loads, wire
from model_worker import verify_files


def check(cap, tasks, tokenizer, settings, *, trials=TRIALS, heldout=True):
    validate_tasks(tasks, heldout=heldout)
    if heldout:
        if (
            set(cap)
            != {
                "schema",
                "metadata",
                "model_header",
                "complete",
                "requests",
                "generations",
                "rows",
            }
            or cap["schema"] != "simurgh-phase10-capture-v1"
            or cap["complete"] is not True
        ):
            raise ValueError("capture_schema")
        protocol_raw = (DOCS / "protocol.json").read_bytes()
        protocol = loads(protocol_raw)
        if (
            cap["metadata"].get("protocol_sha256")
            != hashlib.sha256(protocol_raw).hexdigest()
            or cap["model_header"] != protocol["model_header"]
        ):
            raise ValueError("capture_binding")
    expected = [(case["id"], trial) for trial in trials for case in tasks]
    if (
        type(cap.get("generations")) is not list
        or len(cap["generations"]) != len(expected)
        or not expected
    ):
        raise ValueError("generation_inventory")
    batch_size = settings.get("batch_size", 16)
    checked = errors = 0
    for i, (g, (task_id, trial)) in enumerate(zip(cap["generations"], expected)):
        link = {
            "id": "g" + str(i + 1),
            "task_id": task_id,
            "trial": trial,
            "batch": i // batch_size,
            "position": i % batch_size,
            "seed": SEED_BASE + i // batch_size,
        }
        if set(g) != set(link) | {"output"} or any(g[k] != v for k, v in link.items()):
            raise ValueError("generation_linkage")
        check_output(g["output"])
    cases = {t["id"]: t for t in tasks}
    for g in cap["generations"]:
        o = g["output"]
        if o["status"] == "generation_error":
            errors += 1
            continue
        checked += 1
        rendered = tokenizer.apply_chat_template(
            messages(cases[g["task_id"]]),
            tools=TOOLS,
            add_generation_prompt=True,
            tokenize=False,
            date_string=settings["date_string"],
        )
        inputs = tokenizer(rendered, add_special_tokens=False)["input_ids"]
        ids = o["generated_token_ids"]
        stop = next(
            (i for i, t in enumerate(ids) if t in settings["eos_token_ids"]), None
        )
        if (
            inputs != o["input_token_ids"]
            or tokenizer.decode(inputs, skip_special_tokens=False)
            != o["rendered_prompt"]
            or tokenizer.decode(ids, skip_special_tokens=True) != o["raw"]
            or not 0 < len(inputs) <= settings["max_input_tokens"]
            or not 0 < len(ids) <= settings["max_new_tokens"]
            or o["truncated"] != (stop is None)
            or (stop is not None and stop != len(ids) - 1)
            or (stop is None and len(ids) != settings["max_new_tokens"])
        ):
            raise ValueError("token_linkage:" + g["id"])
    if checked == 0:
        raise ValueError("empty_token_evaluation")
    return {
        "tokenizer_linkage": True,
        "capture_sha256": hashlib.sha256(wire(cap)).hexdigest(),
        "checked_generations": checked,
        "generation_errors": errors,
        "generations": len(cap["generations"]),
        "inference_attestation": False,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("capture", type=Path)
    p.add_argument("--model-dir", type=Path, required=True)
    a = p.parse_args()
    verify_files(a.model_dir, loads(MANIFEST.read_bytes()))
    os.environ.update(
        HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1"
    )
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(
        a.model_dir, local_files_only=True, trust_remote_code=False
    )
    result = check(
        loads(a.capture.read_bytes()),
        loads((DOCS / "tasks.json").read_bytes()),
        tok,
        loads((DOCS / "settings.json").read_bytes()),
    )
    print(wire(result).decode(), end="")


if __name__ == "__main__":
    main()
