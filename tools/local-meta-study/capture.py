"""Explicit precommitted repeated local Meta inference with actual workflow feedback."""

import argparse
import importlib.metadata
import importlib.util
import json
import os
import platform
import resource
import subprocess
import time
from pathlib import Path

from client import PYTHON, Client
from study import (
    ROOT,
    SETTINGS,
    digest,
    load_cases,
    load_protocol,
    messages,
    proposal,
    validate_capture,
    validate_provenance,
)


def attempt(prompt, sampling_seed, generate):
    began = time.monotonic()
    row = {"messages": prompt, "sampling_seed": sampling_seed}
    try:
        row.update(generate())
    except Exception as exc:  # noqa: BLE001 -- preserve each failed generation without retry
        row.update(status="generation_error", error_type=type(exc).__name__)
    row["seconds"] = round(time.monotonic() - began, 6)
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True)
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--runtime-python", default=PYTHON)
    args = parser.parse_args()
    out = Path(args.out)
    if out.exists() or out.with_suffix(".jsonl").exists():
        raise ValueError("refusing overwrite")
    protocol, protocol_digest = load_protocol(require_committed=True)
    cases = load_cases()
    spec = importlib.util.spec_from_file_location(
        "old_capture", ROOT / "tools/local-meta-pilot/capture.py"
    )
    old = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(old)
    artifact = json.loads(
        (ROOT / "docs/assurance/meta/evidence/model-manifest.json").read_text()
    )
    old.verify_files(Path(args.model_dir), artifact)
    os.environ.update(
        HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1"
    )
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, GenerationConfig

    torch.set_num_threads(SETTINGS["threads"])
    torch.set_num_interop_threads(1)
    started = time.monotonic()
    tokenizer = AutoTokenizer.from_pretrained(
        args.model_dir, local_files_only=True, trust_remote_code=False
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.model_dir,
        local_files_only=True,
        trust_remote_code=False,
        use_safetensors=True,
        dtype=torch.bfloat16,
    ).eval()
    generation = GenerationConfig(
        do_sample=True,
        temperature=SETTINGS["temperature"],
        top_p=SETTINGS["top_p"],
        max_new_tokens=SETTINGS["max_new_tokens"],
        eos_token_id=model.generation_config.eos_token_id,
        pad_token_id=tokenizer.eos_token_id,
        use_cache=True,
    )
    load_seconds = time.monotonic() - started
    capture = {
        "schema": "simurgh-meta-study-capture-v1",
        "protocol_sha256": protocol_digest,
        "protocol_commit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, cwd=ROOT
        ).strip(),
        "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_artifacts_sha256": digest(
            ROOT / "docs/assurance/meta/evidence/model-manifest.json"
        ),
        "resolved_generation_config": generation.to_dict(),
        "rows": [],
    }
    capture["runtime"] = {
        "packages": {
            p: importlib.metadata.version(p)
            for p in (
                "torch",
                "transformers",
                "huggingface-hub",
                "safetensors",
                "tokenizers",
            )
        }
    }
    validate_provenance(capture, protocol, protocol_digest)
    out.parent.mkdir(parents=True, exist_ok=True)
    with (
        Client(args.runtime_python) as runtime,
        out.with_suffix(".jsonl").open("x") as journal,
    ):
        for seed in SETTINGS["seeds"]:
            for index, case in enumerate(cases):
                runtime.request({"op": "start", "case": case, "mode": "enforced"})
                row = {"id": case["id"], "seed": seed, "steps": [], "trajectory": []}
                began = time.monotonic()
                for step in (0, 1):
                    prompt = messages(
                        case, step, None if step == 0 else row["trajectory"][0]
                    )
                    sampling_seed = seed * 1000 + index * 2 + step

                    def generate(prompt=prompt, sampling_seed=sampling_seed):
                        torch.manual_seed(sampling_seed)
                        inputs = tokenizer.apply_chat_template(
                            prompt,
                            add_generation_prompt=True,
                            return_dict=True,
                            return_tensors="pt",
                            date_string=SETTINGS["date_string"],
                        )
                        count = inputs["input_ids"].shape[-1]
                        if count > SETTINGS["max_input_tokens"]:
                            raise ValueError("input context limit")
                        with torch.inference_mode():
                            tokens = model.generate(
                                **inputs, generation_config=generation
                            )
                        ids = tokens[0, count:].tolist()
                        eos = generation.eos_token_id
                        if isinstance(eos, int):
                            eos = [eos]
                        return {
                            "status": "generated",
                            "completion": tokenizer.decode(
                                ids, skip_special_tokens=True
                            ),
                            "generated_token_ids": ids,
                            "output_tokens": len(ids),
                            "input_tokens": count,
                            "input_token_ids": inputs["input_ids"][0].tolist(),
                            "rendered_prompt": tokenizer.decode(
                                inputs["input_ids"][0], skip_special_tokens=False
                            ),
                            "finish_reason": "stop"
                            if ids and ids[-1] in eos
                            else "length",
                        }

                    result = attempt(prompt, sampling_seed, generate)
                    observation = runtime.request(
                        {
                            "op": "read" if step == 0 else "write",
                            "proposal": proposal(result),
                        }
                    )
                    row["steps"].append(result)
                    row["trajectory"].append(observation)
                    journal.write(
                        json.dumps(
                            {
                                "id": case["id"],
                                "seed": seed,
                                "step": step,
                                "generation": result,
                                "observation": observation,
                            }
                        )
                        + "\n"
                    )
                    journal.flush()
                    os.fsync(journal.fileno())
                    print(
                        json.dumps(
                            {
                                "id": case["id"],
                                "seed": seed,
                                "step": step,
                                "status": result["status"],
                                "seconds": result["seconds"],
                                "tool_status": observation.get("status"),
                            }
                        ),
                        flush=True,
                    )
                row["seconds"] = round(time.monotonic() - began, 6)
                capture["rows"].append(row)
                runtime.request({"op": "close"})
    capture["runtime"] = {
        "python": platform.python_version(),
        "kernel": platform.release(),
        "machine": platform.machine(),
        "packages": {
            p: importlib.metadata.version(p)
            for p in (
                "torch",
                "transformers",
                "huggingface-hub",
                "safetensors",
                "tokenizers",
            )
        },
        "load_seconds": load_seconds,
        "peak_rss_mib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024,
    }
    validate_capture(capture, protocol, protocol_digest, cases)
    with out.open("x") as stream:
        stream.write(json.dumps(capture, indent=2) + "\n")
    print("saved complete capture " + str(out), flush=True)


if __name__ == "__main__":
    main()
