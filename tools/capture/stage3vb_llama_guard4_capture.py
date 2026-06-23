# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3V-B RunPod capture harness. TRANSPORT-ONLY: runs Llama Guard 4 once over the supplied
# {case_id, user_task} pairs and writes raw classifier outputs + self-reported provenance. It
# performs NO normalisation, NO hashing of evidence, NO signing — those happen in the Mac JS
# trusted harness. Determinism: greedy decode (do_sample=False).
#
# Environment (validated on an RTX 3090 24GB):
#   * Llama Guard 4 is a Llama-4-based multimodal model -> AutoProcessor + Llama4ForConditionalGeneration.
#   * REQUIRES Meta's preview transformers, per the official model card:
#       pip install 'git+https://github.com/huggingface/transformers@v4.51.3-LlamaGuard-preview' hf_xet
#     The released PyPI builds (4.51.3, 4.53, 5.x) crash on this checkpoint's
#     attention_chunk_size=None; forcing a chunk size to dodge the crash makes generation
#     degenerate (token-0 spam). The preview build handles None natively — NO override here.
#   * 8-bit (bitsandbytes): ~13GB, fits 24GB at near-full-precision quality (4-bit degraded output).
#   * HF license acceptance + HF_TOKEN in env are required (gated repo).
import argparse
import datetime
import hashlib
import json
import os
import sys

TRANSFORMERS_INSTALL_REF = "git+https://github.com/huggingface/transformers@v4.51.3-LlamaGuard-preview"


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
    ap.add_argument("--max-new-tokens", type=int, default=20)
    ap.add_argument("--quant", choices=["8bit", "4bit"], default="8bit")
    args = ap.parse_args()

    import torch
    import transformers
    from transformers import AutoProcessor, BitsAndBytesConfig, Llama4ForConditionalGeneration
    from huggingface_hub import snapshot_download

    with open(args.inputs, "r", encoding="utf-8") as f:
        items = json.load(f)

    if args.quant == "8bit":
        bnb = BitsAndBytesConfig(load_in_8bit=True)
        quant_label = "bnb-8bit"
    else:
        bnb = BitsAndBytesConfig(
            load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16
        )
        quant_label = "bnb-4bit-nf4-bf16-compute"
    processor = AutoProcessor.from_pretrained(args.model_id)
    model = Llama4ForConditionalGeneration.from_pretrained(
        args.model_id, quantization_config=bnb, device_map="cuda", torch_dtype=torch.bfloat16
    )
    model.eval()

    chat_template = getattr(processor, "chat_template", None) or getattr(
        getattr(processor, "tokenizer", None), "chat_template", ""
    ) or ""
    chat_template_hash = "sha256:" + hashlib.sha256(chat_template.encode("utf-8")).hexdigest()

    # Real, verifiable provenance digests (no fake sentinels): a snapshot-manifest digest over the
    # local HF snapshot (filename + size + per-file sha256), plus the tokenizer-config digest.
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

    def classify(text):
        messages = [{"role": "user", "content": [{"type": "text", "text": text}]}]
        inp = processor.apply_chat_template(
            messages, tokenize=True, add_generation_prompt=True, return_tensors="pt", return_dict=True
        ).to(model.device)
        n = inp["input_ids"].shape[-1]
        with torch.no_grad():
            out = model.generate(**inp, max_new_tokens=args.max_new_tokens, do_sample=False)
        return processor.batch_decode(out[:, n:], skip_special_tokens=True)[0].strip()

    cases = []
    for it in items:
        cases.append({"case_id": it["case_id"], "raw_lg4_output": classify(it["user_task"])})
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
            "quantization": quant_label,
            "decode": {"do_sample": False, "temperature": 0, "max_new_tokens": args.max_new_tokens},
            "transformers_version": transformers.__version__,
            "transformers_install_ref": TRANSFORMERS_INSTALL_REF,
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
