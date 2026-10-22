"""One predeclared official Meta 3B arm, offline after artifact verification."""

import argparse
import importlib.metadata
import json
import os
import platform
import time
from pathlib import Path

import model_study as study

PACKAGES = ("torch", "transformers", "huggingface-hub", "safetensors", "tokenizers")


def verify_files(directory, manifest):
    study.validate_manifest(manifest)
    for name, item in manifest["files"].items():
        path = directory / name
        if (
            path.is_symlink()
            or not path.is_file()
            or path.stat().st_size != item["bytes"]
            or study.digest(path) != item["sha256"]
        ):
            raise ValueError("local artifact mismatch: " + name)
    if {p.name for p in directory.iterdir() if p.is_file()} != set(manifest["files"]):
        raise ValueError("exact model artifact inventory")


def check_fallback(capture_path, report_path, runtime_python=study.PYTHON):
    cap = study.loads(capture_path.read_text())
    study.validate_capture(cap)
    study.validate_journal(capture_path, cap)
    report = study.loads(report_path.read_text())
    if (
        report.get("schema") != "simurgh-safety-model-report-v1"
        or report.get("arm") != "luna"
        or report.get("capture_sha256") != study.digest(capture_path)
        or report.get("protocol_sha256") != cap["protocol_sha256"]
    ):
        raise ValueError("Luna evidence linkage")
    if report["summary"] != study.summarize(
        report["rows"], study.load_cases(), 3
    ) or report["generation"] != study.generation(cap):
        raise ValueError("Luna derived accounting")
    by_slot = {(row["repeat"], row["id"]): row for row in cap["rows"]}
    for row in report["rows"]:
        if study.semantic(row["modes"]["enforced"]) != study.semantic(
            by_slot[(row["seed"], row["id"])]["trajectory"]
        ):
            raise ValueError("Luna enforced trajectory linkage")
    fresh = study.generate_report(capture_path, runtime_python)
    if study.stable(fresh) != study.stable(report):
        raise ValueError("Luna fallback controls do not reproduce")
    if not study.fallback_required(report):
        raise ValueError("predeclared Meta condition not met")
    return {
        "luna_capture_sha256": study.digest(capture_path),
        "luna_report_sha256": study.digest(report_path),
        "reason": "api_error"
        if report["generation"]["api_errors"]
        else "zero_attack_unsafe_baselines",
    }


def tool_definitions():
    return [
        {
            "type": "function",
            "function": {k: v for k, v in tool.items() if k not in ("type", "strict")},
        }
        for tool in study.native.SETTINGS["tools"]
    ]


def validate_tokenizer_evidence(cap, tokenizer):
    if cap.get("arm") != "meta":
        raise ValueError("tokenizer verification requires Meta capture")
    for row in cap["rows"]:
        for step in row["steps"]:
            if step["status"] != "generated":
                continue
            rendered = tokenizer.apply_chat_template(
                step["messages"],
                tools=tool_definitions(),
                add_generation_prompt=True,
                tokenize=False,
                date_string=study.META_SETTINGS["date_string"],
            )
            expected_ids = tokenizer.encode(rendered, add_special_tokens=False)
            if (
                expected_ids != step["input_token_ids"]
                or tokenizer.decode(expected_ids, skip_special_tokens=False)
                != step["rendered_prompt"]
                or tokenizer.decode(
                    step["generated_token_ids"], skip_special_tokens=True
                )
                != step["raw_completion"]
            ):
                raise ValueError("Meta tokenizer input/template/output linkage")


def verify_tokenizer_capture(cap, directory):
    manifest = cap["model_manifest"]
    study.validate_manifest(manifest)
    for name in (
        "config.json",
        "tokenizer.json",
        "tokenizer_config.json",
        "special_tokens_map.json",
    ):
        path = directory / name
        expected = manifest["files"][name]
        if (
            path.is_symlink()
            or path.stat().st_size != expected["bytes"]
            or study.digest(path) != expected["sha256"]
        ):
            raise ValueError("tokenizer artifact mismatch")
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(
        directory, local_files_only=True, trust_remote_code=False
    )
    validate_tokenizer_evidence(cap, tokenizer)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--model-manifest", type=Path, required=True)
    parser.add_argument("--luna-capture", type=Path, required=True)
    parser.add_argument("--luna-report", type=Path, required=True)
    parser.add_argument("--runtime-python", default=study.PYTHON)
    args = parser.parse_args()
    out = args.out
    if out.exists() or out.with_suffix(".jsonl").exists():
        raise ValueError("refusing capture/journal overwrite")
    commit = study.git("rev-parse", "HEAD").decode().strip()
    _, sha = study.protocol(commit)
    trigger = check_fallback(args.luna_capture, args.luna_report, args.runtime_python)
    manifest = study.loads(args.model_manifest.read_text())
    verify_files(args.model_dir, manifest)
    os.environ.update(
        HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1"
    )
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, GenerationConfig

    settings = study.META_SETTINGS
    torch.set_num_threads(settings["threads"])
    torch.set_num_interop_threads(1)
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
        temperature=settings["temperature"],
        top_p=settings["top_p"],
        max_new_tokens=settings["max_new_tokens"],
        eos_token_id=settings["eos_token_ids"],
        pad_token_id=tokenizer.eos_token_id,
        use_cache=True,
    )
    cap = {
        "schema": "simurgh-safety-model-capture-v1",
        "arm": "meta",
        "protocol_commit": commit,
        "protocol_sha256": sha,
        "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_manifest": manifest,
        "fallback": trigger,
        "runtime": {
            "python": platform.python_version(),
            "packages": {p: importlib.metadata.version(p) for p in PACKAGES},
            "dtype": str(model.dtype),
            "device": str(model.device),
        },
        "resolved_generation_config": generation.to_dict(),
        "rows": [],
    }
    tools = tool_definitions()
    failed = False
    out.parent.mkdir(parents=True, exist_ok=True)
    with (
        out.with_suffix(".jsonl").open("x") as journal,
        study.Client(args.runtime_python) as runtime,
    ):

        def append(record):
            journal.write(json.dumps(record) + "\n")
            journal.flush()
            os.fsync(journal.fileno())

        append({"capture_header": cap})
        for case_index, case in enumerate(study.load_cases()):
            runtime.request({"op": "start", "case": case, "mode": "enforced"})
            row = {"repeat": 0, "id": case["id"], "steps": [], "trajectory": []}
            began = time.monotonic()
            for index in (0, 1):
                prompt = study.messages(
                    case, index, None if index == 0 else row["trajectory"][0]
                )
                seed = case_index * 2 + index
                step = {"messages": prompt}
                started = time.monotonic()
                if failed:
                    step.update(status="skipped_after_error", seconds=0)
                else:
                    try:
                        torch.manual_seed(seed)
                        inputs = tokenizer.apply_chat_template(
                            prompt,
                            tools=tools,
                            add_generation_prompt=True,
                            return_dict=True,
                            return_tensors="pt",
                            date_string=settings["date_string"],
                        )
                        count = inputs["input_ids"].shape[-1]
                        if count > settings["max_input_tokens"]:
                            raise ValueError("input context limit")
                        with torch.inference_mode():
                            output = model.generate(
                                **inputs, generation_config=generation
                            )
                        ids = output[0, count:].tolist()
                        raw = tokenizer.decode(ids, skip_special_tokens=True)
                        finish = (
                            "stop"
                            if ids and ids[-1] in settings["eos_token_ids"]
                            else "length"
                        )
                        step.update(
                            status="generated",
                            raw_completion=raw,
                            raw_finish_reason=finish,
                            sampling_seed=seed,
                            generated_token_ids=ids,
                            output_tokens=len(ids),
                            input_tokens=count,
                            input_token_ids=inputs["input_ids"][0].tolist(),
                            rendered_prompt=tokenizer.decode(
                                inputs["input_ids"][0], skip_special_tokens=False
                            ),
                        )
                        step.update(study.meta_decode(raw, finish))
                        study.validate_meta_step(step, seed)
                    except Exception as exc:  # noqa: BLE001 -- bounded sanitized failure, no retries
                        step = {
                            "messages": prompt,
                            "status": "generation_error",
                            "error_type": type(exc).__name__,
                        }
                        failed = True
                    step["seconds"] = round(time.monotonic() - started, 6)
                append({"repeat": 0, "id": case["id"], "index": index, "step": step})
                row["steps"].append(step)
                row["trajectory"].append(
                    runtime.request(
                        {
                            "op": "read" if index == 0 else "write",
                            "proposal": study.proposal(step),
                        }
                    )
                )
                print(
                    json.dumps(
                        {
                            "id": case["id"],
                            "step": index,
                            "status": step["status"],
                            "seconds": step["seconds"],
                        }
                    ),
                    flush=True,
                )
            runtime.request({"op": "close"})
            row["seconds"] = round(time.monotonic() - began, 6)
            cap["rows"].append(row)
            append({"completed_row": row})
    study.validate_capture(cap)
    validate_tokenizer_evidence(cap, tokenizer)
    with out.open("x") as stream:
        stream.write(json.dumps(cap, indent=2) + "\n")


if __name__ == "__main__":
    main()
