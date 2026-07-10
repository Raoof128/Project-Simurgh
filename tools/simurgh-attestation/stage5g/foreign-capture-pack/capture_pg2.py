#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# VFC foreign producer — capture Prompt Guard 2 86M over the shared committed corpus (inputs only).
# OFFLINE acquisition lifecycle (frozen): (1) acquire the exact pinned snapshot; (2) verify its manifest
# revision; (3) export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1; (4) capture from the verified cache only.
# Deterministic: cpu / float32 / single thread. Emits a capture object (no signing — sign-transcript.py).
import json, sys
from _vfc_common import sha256_hex

MODEL_ID = "meta-llama/Llama-Prompt-Guard-2-86M"
HF_REVISION = "a8ded8e697ce7c355e395a0df51f94adb4a2fd27"

def capture(corpus_path, out_path):
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    torch.set_num_threads(1)
    corpus = json.load(open(corpus_path))
    tok = AutoTokenizer.from_pretrained(MODEL_ID, revision=HF_REVISION)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID, revision=HF_REVISION, torch_dtype="float32").eval()
    cells = []
    for case in corpus["cases"]:
        text = case["source_text"]
        enc = tok(text, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            score = float(model(**enc).logits[0].softmax(-1)[1])
        cells.append({"case_id": case["case_id"], "detector_input_digest": sha256_hex(text),
                      "label": "malicious" if f"{score:.4f}" >= "0.5000" else "benign"})
    json.dump({"cells": cells, "model_id": MODEL_ID, "hf_revision": HF_REVISION}, open(out_path, "w"), indent=2)
    print(f"[foreign-pack/pg2] wrote {out_path} ({len(cells)} cells)")

if __name__ == "__main__":
    capture(sys.argv[1], sys.argv[2])
