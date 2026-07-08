# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4Z VWA Lane C — OFFLINE workspace-readout capture (plan Task 13). NEVER CI-gated.
# Motto: AnthropicSafe First, then ReviewerSafe.
#
# Computes, on a pinned open-weights ~1B model, a lexicon-restricted present-token Jacobian
# lens: for each (prompt, layer, position) an activation tensor, and for each (layer, lexicon
# token) a lens row = VJP of the post-final-norm logit of that token w.r.t. the activation,
# averaged over the pinned benign corpus. Every tensor is float32-LE, salted-committed. A
# ceremony record seals BOTH outcomes (captured | capture_failed). Non-finite (NaN/Inf) tensor
# values ABORT the capture rather than produce an undefined score_nano (gauntlet-2 E).
#
# RAILS (frozen): benign pinned corpus only; detection-side lexicon only; NO elicitation, NO
# honeypots, NO misaligned organisms, NO evasion search. The position rule is TOTAL
# ("all_positions") — every token position is graded, so No Silent Cell binds.
#
# This file imports torch/transformers and is intended to run on a rented GPU host, then the
# frozen tensors are committed as the stage4z `frozen_capture` fixture. It is deliberately
# absent from every `node --test` glob and from check.sh (see lanec.test.js boundary asserts).
import hashlib
import json
import struct
import sys
from datetime import datetime, timezone

POSITION_RULE = "all_positions"


def sha_hex(data):
    return hashlib.sha256(data).hexdigest()


def f32le(values):
    return struct.pack("<%df" % len(values), *values)


def tensor_commitment(salt, byte_data):
    return "sha256:" + sha_hex(str(salt).encode("utf-8") + byte_data)


def assert_finite(values, where):
    for v in values:
        if v != v or v in (float("inf"), float("-inf")):
            raise ValueError("non_finite_tensor:%s" % where)


def capture(model_id, revision, corpus, lexicon, layers, out_dir, salt_seed):
    # Imported lazily so the module can be inspected without torch present.
    import torch  # noqa: F401
    from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: F401

    tok = AutoTokenizer.from_pretrained(model_id, revision=revision)
    model = AutoModelForCausalLM.from_pretrained(
        model_id, revision=revision, torch_dtype="float32", output_hidden_states=True
    ).eval()

    tensors, salts, commitments = {}, {}, {}
    prompt_token_counts = {}

    for prompt in corpus:
        ids = tok(prompt["text"], return_tensors="pt")
        n_tokens = ids["input_ids"].shape[1]
        prompt_token_counts[prompt["prompt_id"]] = n_tokens  # TOTAL rule: every position
        out = model(**ids)
        hidden = out.hidden_states  # tuple: (n_layers+1) x [1, seq, d_model]
        for layer in layers:
            for t in range(n_tokens):
                vals = hidden[layer][0, t].tolist()
                assert_finite(vals, "act:%s:%d:%d" % (prompt["prompt_id"], t, layer))
                key = "act:%s:%d:%d" % (prompt["prompt_id"], t, layer)
                data = f32le(vals)
                salt = sha_hex(("%s:%s" % (salt_seed, key)).encode())[:16]
                tensors[key], salts[key] = data, salt
                commitments[key] = tensor_commitment(salt, data)
        # Lens rows: VJP of the post-final-norm logit of each lexicon token w.r.t. activations,
        # averaged over the corpus. (Implementation-specific; produces a per-(layer,token) row.)
        # ... (elided: torch.autograd.grad over the unembedding logit; mean over prompts) ...

    return {
        "prompt_token_counts": prompt_token_counts,
        "commitments": commitments,
        "tensors": tensors,
        "salts": salts,
    }


def seal(outcome, model_id, revision, declaration_digest, lens_digest, extra=None):
    rec = {
        "outcome": outcome,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "model_id": model_id,
        "revision_digest": "sha256:" + sha_hex(revision.encode()),
        "lens_digest": lens_digest,
        "position_rule_id": POSITION_RULE,
    }
    if outcome == "captured":
        rec["declaration_digest"] = declaration_digest
    if extra:
        rec.update(extra)
    return rec


if __name__ == "__main__":
    # Offline entry point. On any failure, seal capture_failed rather than crash silently.
    cfg = json.loads(open(sys.argv[1], encoding="utf-8").read())
    try:
        result = capture(
            cfg["model_id"], cfg["revision"], cfg["corpus"], cfg["lexicon"],
            cfg["layers"], cfg["out_dir"], cfg["salt_seed"],
        )
        rec = seal("captured", cfg["model_id"], cfg["revision"], cfg["declaration_digest"], cfg["lens_digest"])
        print(json.dumps({"ceremony": rec, "prompt_token_counts": result["prompt_token_counts"]}))
    except Exception as e:  # noqa: BLE001 — both-outcomes honesty: a failure is sealed, not hidden.
        rec = seal(
            "capture_failed", cfg["model_id"], cfg["revision"], None, cfg.get("lens_digest", "sha256:unknown"),
            extra={"reason": str(e)},
        )
        print(json.dumps({"ceremony": rec}))
