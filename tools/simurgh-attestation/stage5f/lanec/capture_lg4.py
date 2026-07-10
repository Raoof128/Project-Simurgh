#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5F VMP — Lane C capture, member: Llama Guard 4 12B (plan Task 18). NON-CI (needs a GPU droplet;
# 8-bit). Motto: AnthropicSafe First, then ReviewerSafe. Classifies the SHARED committed corpus and
# emits a bounded categorical verdict (allow/block) — a non-{allow,block}/refusal output maps to the
# frozen capture_failed/unexpected_categorical_output (there is NO model_refused status). Isolated env
# (requirements-lg4.lock). Acquisition lifecycle: acquire -> verify manifest -> HF_HUB_OFFLINE=1 ->
# capture from cache.
import hashlib
import json
import sys
from pathlib import Path

MODEL_ID = "meta-llama/Llama-Guard-4-12B"
HF_REVISION = "lg4-1"


def sha256_str(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def parse_verdict(raw_text):
    t = raw_text.strip().lower()
    if t.startswith("safe"):
        return "allow"
    if t.startswith("unsafe"):
        return "block"
    return None  # unexpected -> capture_failed


def capture(corpus_path, out_path):
    import torch  # noqa: F401
    from transformers import AutoModelForCausalLM, AutoTokenizer

    corpus = json.loads(Path(corpus_path).read_text())
    tok = AutoTokenizer.from_pretrained(MODEL_ID, revision=HF_REVISION)
    model = AutoModelForCausalLM.from_pretrained(MODEL_ID, revision=HF_REVISION, load_in_8bit=True).eval()
    PARSER_DIGEST = sha256_str("startswith(safe)->allow; startswith(unsafe)->block; else capture_failed")

    cells = []
    for case in corpus["cases"]:
        text = case["source_text"]
        messages = [{"role": "user", "content": text}]
        enc = tok.apply_chat_template(messages, return_tensors="pt")
        with __import__("torch").no_grad():
            out = model.generate(enc, max_new_tokens=64, do_sample=False)
        raw = tok.decode(out[0][enc.shape[-1]:], skip_special_tokens=True)
        label = parse_verdict(raw)
        cell = {"case_id": case["case_id"], "member_id": "llama_guard_4_12b", "detector_input_digest": sha256_str(text)}
        if label is None:
            cell.update({"status": "capture_failed", "error_reason": "unexpected_categorical_output"})
        else:
            cell.update({"status": "evaluated", "decision_evidence": {"kind": "categorical_generation", "normalised_label": label, "raw_output_digest": sha256_str(raw), "parser_digest": PARSER_DIGEST}})
        cells.append(cell)
    fragment = {"member_id": "llama_guard_4_12b", "model_id": MODEL_ID, "hf_revision": HF_REVISION, "runtime": {"quantization": "8bit"}, "cells": cells}
    Path(out_path).write_text(json.dumps(fragment, indent=2))
    print(f"[lanec/lg4] wrote {out_path} ({len(cells)} cells)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: capture_lg4.py <shared-corpus.json> <out-fragment.json>", file=sys.stderr)
        sys.exit(2)
    capture(sys.argv[1], sys.argv[2])
