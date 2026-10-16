"""Offline tokenizer linkage; does not regenerate or attest inference."""

import argparse
import os
from pathlib import Path

from contract import messages
from model_inputs import DOCS, MANIFEST, TOOLS, loads, wire
from model_worker import verify_files


def check(cap, tasks, tokenizer, settings):
    cases = {t["id"]: t for t in tasks}
    for g in cap["generations"]:
        o = g["output"]
        if o["status"] != "generated":
            continue
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
    return {
        "tokenizer_linkage": True,
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
