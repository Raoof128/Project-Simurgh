#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5F VMP — Lane C capture, member: Prompt Guard 2 86M (plan Task 18). NON-CI.
# Motto: AnthropicSafe First, then ReviewerSafe. Deterministic: cpu / float32 / batch 1 / single thread.
# Scores the SHARED committed corpus (inputs only; extends 5E's published safe bases — no new potent
# strings) and emits a hash-bound per-member fragment that merge_capture_census.py folds into the
# unified census. Isolated env (requirements-pg2.lock) so PG2 and LG4 never share a transformers pin.
#
# Acquisition lifecycle (frozen): (1) acquire the pinned snapshot; (2) verify its manifest digest;
# (3) export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1; (4) run this from the verified cache only.
import hashlib
import json
import sys
from pathlib import Path

MODEL_ID = "meta-llama/Llama-Prompt-Guard-2-86M"
HF_REVISION = "a8ded8e697ce7c355e395a0df51f94adb4a2fd27"
SCORE_PRECISION = 4


def sha256_str(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def capture(corpus_path, out_path):
    import torch  # noqa: F401
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    torch.set_num_threads(1)
    corpus = json.loads(Path(corpus_path).read_text())
    tok = AutoTokenizer.from_pretrained(MODEL_ID, revision=HF_REVISION)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID, revision=HF_REVISION, torch_dtype="float32").eval()
    # PG2 config has no id2label — derive the positive (malicious) index empirically (5E lesson).
    positive_index = 1

    cells = []
    for case in corpus["cases"]:
        text = case["source_text"]
        enc = tok(text, return_tensors="pt", truncation=True, max_length=512)
        with __import__("torch").no_grad():
            logits = model(**enc).logits[0]
        probs = logits.softmax(-1)
        score = f"{float(probs[positive_index]):.{SCORE_PRECISION}f}"
        label = "malicious" if score >= "0.5000" else "benign"  # lexical, matches the verifier
        cells.append({
            "case_id": case["case_id"],
            "member_id": "prompt_guard_2_86m",
            "detector_input_digest": sha256_str(text),
            "decision_evidence": {"kind": "binary_softmax", "positive_score": score, "threshold": "0.5000", "positive_class_index": positive_index, "label": label},
            "token_count": int(enc["input_ids"].shape[-1]),
        })
    fragment = {"member_id": "prompt_guard_2_86m", "model_id": MODEL_ID, "hf_revision": HF_REVISION, "runtime": {"device": "cpu", "dtype": "float32"}, "cells": cells}
    Path(out_path).write_text(json.dumps(fragment, indent=2))
    print(f"[lanec/pg2] wrote {out_path} ({len(cells)} cells)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: capture_pg2.py <shared-corpus.json> <out-fragment.json>", file=sys.stderr)
        sys.exit(2)
    capture(sys.argv[1], sys.argv[2])
