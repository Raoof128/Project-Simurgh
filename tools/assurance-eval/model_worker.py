"""Offline, hash-verified local model process. No host/provider credentials inherited."""

import argparse
import importlib.metadata
import os
import platform
import sys
import time
from pathlib import Path

from spec import TOOLS, canonical, digest, loads


def verify_files(directory, manifest):
    if {p.name for p in directory.iterdir() if p.is_file()} != set(manifest["files"]):
        raise ValueError("model_inventory")
    for name, item in manifest["files"].items():
        p = directory / name
        if (
            p.is_symlink()
            or not p.is_file()
            or p.stat().st_size != item["bytes"]
            or digest(p) != item["sha256"]
        ):
            raise ValueError("model_hash_mismatch:" + name)


def validate_request(request, batch_size):
    if (
        type(request) is not dict
        or set(request) != {"prompts", "seed"}
        or type(request["seed"]) is not int
        or not 0 <= request["seed"] < 2**31
        or type(request["prompts"]) is not list
        or not 1 <= len(request["prompts"]) <= batch_size
    ):
        raise ValueError("generation_request")
    for messages in request["prompts"]:
        if (
            type(messages) is not list
            or not 2 <= len(messages) <= 4
            or len(canonical(messages)) > 16000
            or any(
                type(m) is not dict
                or set(m) != {"role", "content"}
                or m["role"] not in ("system", "user", "assistant")
                or type(m["content"]) is not str
                for m in messages
            )
        ):
            raise ValueError("message_shape")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--settings", type=Path, required=True)
    args = parser.parse_args()
    manifest = loads(args.manifest.read_text())
    settings = loads(args.settings.read_text())
    verify_files(args.model_dir, manifest)
    os.environ.update(
        HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1"
    )
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, GenerationConfig

    torch.set_num_threads(settings["threads"])
    torch.set_num_interop_threads(1)
    tokenizer = AutoTokenizer.from_pretrained(
        args.model_dir, local_files_only=True, trust_remote_code=False
    )
    tokenizer.padding_side = "left"
    tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        args.model_dir,
        local_files_only=True,
        trust_remote_code=False,
        use_safetensors=True,
        dtype=torch.bfloat16,
    ).eval()
    generation = GenerationConfig(
        do_sample=True,
        temperature=settings["temperature"],
        top_p=settings["top_p"],
        max_new_tokens=settings["max_new_tokens"],
        eos_token_id=settings["eos_token_ids"],
        pad_token_id=tokenizer.pad_token_id,
        use_cache=True,
    )
    print(
        canonical(
            {
                "ready": True,
                "manifest_sha256": digest(args.manifest),
                "runtime": {
                    "python": platform.python_version(),
                    "packages": {
                        p: importlib.metadata.version(p)
                        for p in (
                            "torch",
                            "transformers",
                            "tokenizers",
                            "safetensors",
                            "huggingface-hub",
                        )
                    },
                    "device": str(model.device),
                    "dtype": str(model.dtype),
                },
                "generation_config": generation.to_dict(),
            }
        ),
        flush=True,
    )
    for line in sys.stdin:
        started = time.perf_counter()
        try:
            request = loads(line)
            validate_request(request, settings["batch_size"])
            rendered = [
                tokenizer.apply_chat_template(
                    m,
                    tools=TOOLS,
                    add_generation_prompt=True,
                    tokenize=False,
                    date_string=settings["date_string"],
                )
                for m in request["prompts"]
            ]
            encoded = tokenizer(
                rendered, add_special_tokens=False, return_tensors="pt", padding=True
            )
            if encoded["input_ids"].shape[1] > settings["max_input_tokens"]:
                raise ValueError("input_token_limit")
            torch.manual_seed(request["seed"])
            with torch.inference_mode():
                output = model.generate(**encoded, generation_config=generation)
            rows = []
            width = encoded["input_ids"].shape[1]
            for i in range(len(rendered)):
                ids = output[i, width:].tolist()
                # Remove batch padding after the first generation stop token only.
                stop = next(
                    (j for j, t in enumerate(ids) if t in settings["eos_token_ids"]),
                    None,
                )
                if stop is not None:
                    ids = ids[: stop + 1]
                inputs = encoded["input_ids"][i][
                    encoded["attention_mask"][i].bool()
                ].tolist()
                rows.append(
                    {
                        "status": "generated",
                        "raw": tokenizer.decode(ids, skip_special_tokens=True),
                        "generated_token_ids": ids,
                        "input_token_ids": inputs,
                        "rendered_prompt": tokenizer.decode(
                            inputs, skip_special_tokens=False
                        ),
                        "truncated": stop is None,
                        "seconds": time.perf_counter() - started,
                    }
                )
            print(canonical({"rows": rows}), flush=True)
        except (ValueError, RuntimeError, MemoryError) as exc:
            print(
                canonical(
                    {
                        "error": type(exc).__name__,
                        "seconds": time.perf_counter() - started,
                    }
                ),
                flush=True,
            )


if __name__ == "__main__":
    main()
