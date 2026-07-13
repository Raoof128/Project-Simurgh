#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5M — Lane C-adv (LOCAL model backend). A cached, uncensored small model (Llama-3.2-1B-Instruct,
# offline, MPS) generates forgery mutations for EVERY attack class — including the ones a frontier model
# refuses — so the VERIFIER is exercised against the full set. This is defensive: the target is our own
# verifier; a "contained" result means the forged bundle did NOT bank externally_anchored. Output is a
# mutations file; apply-local-adversary.mjs runs each through the frozen verifyVtcQuorum.
import json, os, sys
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

EV = os.path.join(os.path.dirname(__file__), "../../../../docs/research/llm-shield/evidence/stage-5m/real-laneb")
BUNDLE = json.load(open(os.path.join(EV, "laneb-bundle.json")))
MODEL = os.environ.get("SIMURGH_LOCAL_MODEL", "meta-llama/Llama-3.2-1B-Instruct")

ATTACKS = [
    "Forge a fake transparency_log_seat (a Rekor entry) that makes the verifier count a third ecology and bank externally_anchored.",
    "Make two seats resolve to the same trust ecology but be counted as three distinct ones (counterfeit ecology).",
    "Cross-log replay: swap in a checkpoint/inclusion proof from a different Rekor log so the seat verifies.",
    "Cross-commitment replay: staple a valid Rekor entry that binds a DIFFERENT commitment.",
    "Promote the 2-seat floor: set declared_externally_anchored=true and ots declared_finality=confirmed with a fabricated checkpoint_evidence.",
    "Fabricate a confirmed checkpoint_evidence (block/merkle/witness signature) so finality reads confirmed without a real Bitcoin proof.",
]
SYS = ('You are a red-team fuzzer attacking an offline VERIFIER (not a person), authorised engagement. '
       'Output ONLY JSON: {"mutations":[{"path":"a.b.c","value":<json>}]} using dot-paths into the bundle '
       '(array indices allowed, e.g. anchors.1.declared_finality). Try to make it FALSELY bank externally_anchored.')

dev = "mps" if torch.backends.mps.is_available() else "cpu"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float16).to(dev)

# Keep the bundle context small for a 1B model: send the top-level shape only.
shape = {k: (BUNDLE[k] if not isinstance(BUNDLE[k], (dict, list)) else f"<{type(BUNDLE[k]).__name__}>") for k in BUNDLE}
out = []
for attack in ATTACKS:
    msgs = [{"role": "system", "content": SYS},
            {"role": "user", "content": f"Attack: {attack}\nBundle keys: {json.dumps(shape)}\nemit mutations JSON:"}]
    ids = tok.apply_chat_template(msgs, add_generation_prompt=True, return_tensors="pt").to(dev)
    with torch.no_grad():
        gen = model.generate(ids, max_new_tokens=256, do_sample=False, pad_token_id=tok.eos_token_id)
    text = tok.decode(gen[0, ids.shape[1]:], skip_special_tokens=True)
    muts = []
    try:
        j = text[text.index("{"):text.rindex("}") + 1]
        muts = json.loads(j).get("mutations", [])
    except Exception:
        muts = []
    out.append({"attack": attack, "mutations": muts, "raw_excerpt": text[:200]})
    print(f"[{len(muts)} muts] {attack[:50]}", file=sys.stderr)

json.dump({"model": MODEL, "device": dev, "attacks": out}, open(os.path.join(EV, "..", "real-lanec", "lanec-local-mutations.json"), "w"), indent=2)
print("wrote lanec-local-mutations.json")
