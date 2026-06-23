# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3V-B RunPod capture harness. TRANSPORT-ONLY: runs Llama Guard 4 once over the supplied
# {case_id, user_task} pairs and writes raw classifier outputs + self-reported provenance. It
# performs NO normalisation, NO hashing of evidence, NO signing — those happen in the Mac JS
# trusted harness. Determinism: greedy decode (do_sample=False). Requires HF license acceptance
# + token in env.
import argparse
import datetime
import hashlib
import json
import sys


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inputs", required=True, help="JSON file: [{case_id, user_task}, ...]")
    ap.add_argument("--out", required=True, help="output capture JSON path")
    ap.add_argument("--model-id", default="meta-llama/Llama-Guard-4-12B")
    ap.add_argument("--gpu", default="unknown")
    args = ap.parse_args()

    import os

    import torch
    import transformers
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from huggingface_hub import snapshot_download

    with open(args.inputs, "r", encoding="utf-8") as f:
        items = json.load(f)

    tok = AutoTokenizer.from_pretrained(args.model_id)
    model = AutoModelForCausalLM.from_pretrained(
        args.model_id, torch_dtype=torch.bfloat16, device_map="auto"
    )
    model.eval()

    chat_template = getattr(tok, "chat_template", "") or ""
    chat_template_hash = "sha256:" + hashlib.sha256(chat_template.encode("utf-8")).hexdigest()

    # Real, verifiable provenance digests (Fix 1): a snapshot manifest digest over the local HF
    # snapshot (filename + size + per-file sha256), plus the tokenizer config digest. No fake
    # sentinel hashes — every digest is a genuine sha256 over real bytes.
    snapshot_dir = snapshot_download(args.model_id)
    manifest = []
    for root, _dirs, files in os.walk(snapshot_dir):
        for name in sorted(files):
            fp = os.path.join(root, name)
            rel = os.path.relpath(fp, snapshot_dir)
            manifest.append({"path": rel, "size": os.path.getsize(fp), "sha256": sha256_file(fp)})
    manifest.sort(key=lambda m: m["path"])
    snapshot_digest = "sha256:" + hashlib.sha256(
        json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    tok_cfg = os.path.join(snapshot_dir, "tokenizer_config.json")
    tokenizer_config_digest = sha256_file(tok_cfg) if os.path.exists(tok_cfg) else snapshot_digest
    hf_model_commit = os.path.basename(os.path.realpath(snapshot_dir))

    cases = []
    for it in items:
        messages = [{"role": "user", "content": it["user_task"]}]
        ids = tok.apply_chat_template(messages, return_tensors="pt").to(model.device)
        with torch.no_grad():
            out = model.generate(ids, max_new_tokens=64, do_sample=False, temperature=0.0)
        text = tok.decode(out[0][ids.shape[-1]:], skip_special_tokens=True).strip()
        cases.append({"case_id": it["case_id"], "raw_lg4_output": text})

    cases.sort(key=lambda c: c["case_id"])
    capture = {
        "schema": "simurgh.stage3vb.frozen_lg4_capture.v1",
        "live": True,
        "capture_environment": "runpod_gpu",
        "contains_raw_prompts": False,
        "contains_hf_token": False,
        "contains_secrets": False,
        "capture_provenance": {
            "model_id": args.model_id,
            "hf_model_commit": hf_model_commit,
            "hf_model_snapshot_digest": snapshot_digest,
            "tokenizer_config_digest": tokenizer_config_digest,
            "chat_template_hash": chat_template_hash,
            "transformers_version": transformers.__version__,
            "torch_version": torch.__version__,
            "cuda_version": torch.version.cuda or "cpu",
            "gpu": args.gpu,
            "python_version": sys.version.split()[0],
            "captured_at_utc": datetime.datetime.now(datetime.timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            ),
            "capture_origin": "self_reported_capture_environment",
            "model_weights_digest_source": "capture_environment_self_reported",
            "model_weights_recomputed_by_verifier": False,
        },
        "cases": cases,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(capture, f, indent=2)
        f.write("\n")
    print("stage3vb capture: wrote", len(cases), "cases to", args.out)


if __name__ == "__main__":
    main()
