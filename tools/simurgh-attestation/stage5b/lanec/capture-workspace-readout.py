# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5B VAR Lane C — OFFLINE workspace-readout capture (plan Task 2). NEVER CI-gated.
# Motto: AnthropicSafe First, then ReviewerSafe.
#
# COPIED from stage4z/lanec/capture-workspace-readout.py (the frozen 4Z file is byte-untouched;
# reviewer blocker 1) and the elided lens VJP is COMPLETED here. Computes, on a pinned
# open-weights ~1B model, a lexicon-restricted present-token Jacobian lens: for each
# (prompt, layer, position) an activation tensor, and for each (layer, lexicon token) a lens row
# = VJP of the post-final-norm logit of that token w.r.t. the activation, averaged over the
# pinned benign corpus. Every tensor is float32-LE, salted-committed. A ceremony record seals
# BOTH outcomes (captured | capture_failed). Non-finite (NaN/Inf) values ABORT the capture.
#
# RAILS (frozen): benign pinned corpus only; detection-side lexicon only; NO elicitation, NO
# honeypots, NO misaligned organisms, NO evasion search. Position rule is TOTAL ("all_positions").
#
# Runs on CPU/Apple-Silicon (1B needs no GPU) or a pinned GPU host. Byte-stability is MEASURED
# (capture twice, cmp), never assumed; a GPU capture is hash-anchored. Deliberately absent from
# every `node --test` glob and from scripts/check.sh (see lanec.test.js boundary asserts).
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
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tok = AutoTokenizer.from_pretrained(model_id, revision=revision)
    model = AutoModelForCausalLM.from_pretrained(
        model_id, revision=revision, torch_dtype="float32", output_hidden_states=True
    ).eval()
    torch.use_deterministic_algorithms(True)  # help CPU byte-stability (still MEASURED, not assumed)

    # Resolve the lexicon token ids once (detection-side only).
    lex_ids = [int(t) for t in lexicon]

    tensors, salts, commitments = {}, {}, {}
    prompt_token_counts = {}
    # lens accumulator: (layer, token_id) -> running sum of VJP rows + count, for the mean.
    lens_sum, lens_count = {}, {}

    for prompt in corpus:
        ids = tok(prompt["text"], return_tensors="pt")
        n_tokens = ids["input_ids"].shape[1]
        prompt_token_counts[prompt["prompt_id"]] = n_tokens  # TOTAL rule: every position
        out = model(**ids)
        hidden = out.hidden_states  # tuple: (n_layers+1) x [1, seq, d_model]
        logits = out.logits[0]  # [seq, vocab] — post-final-norm unembedding logits
        for layer in layers:
            for t in range(n_tokens):
                vals = hidden[layer][0, t].detach().tolist()
                assert_finite(vals, "act:%s:%d:%d" % (prompt["prompt_id"], t, layer))
                key = "act:%s:%d:%d" % (prompt["prompt_id"], t, layer)
                data = f32le(vals)
                salt = sha_hex(("%s:%s" % (salt_seed, key)).encode())[:16]
                tensors[key], salts[key] = data, salt
                commitments[key] = tensor_commitment(salt, data)

        # Lens rows (the completed VJP): for each lexicon token, the gradient of that token's
        # post-final-norm logit at the LAST position w.r.t. each requested layer's activation —
        # the "does this workspace state push toward this detection token" reading.
        for tid in lex_ids:
            for layer in layers:
                act = hidden[layer]  # [1, seq, d_model], requires grad via retain_graph
                grad = torch.autograd.grad(
                    logits[n_tokens - 1, tid], act, retain_graph=True, allow_unused=True
                )[0]
                row = (
                    grad[0, n_tokens - 1].detach().tolist()
                    if grad is not None
                    else [0.0] * hidden[layer].shape[-1]
                )
                assert_finite(row, "lens:%d:%d" % (layer, tid))
                lk = (layer, tid)
                if lk not in lens_sum:
                    lens_sum[lk] = [0.0] * len(row)
                    lens_count[lk] = 0
                lens_sum[lk] = [a + b for a, b in zip(lens_sum[lk], row)]
                lens_count[lk] += 1

    # Mean over the corpus → the frozen lens; commit each averaged row.
    lens_commitments = {}
    for (layer, tid), s in lens_sum.items():
        mean = [x / lens_count[(layer, tid)] for x in s]
        assert_finite(mean, "lensmean:%d:%d" % (layer, tid))
        lk = "lens:%d:%d" % (layer, tid)
        data = f32le(mean)
        salt = sha_hex(("%s:%s" % (salt_seed, lk)).encode())[:16]
        tensors[lk], salts[lk] = data, salt
        lens_commitments[lk] = tensor_commitment(salt, data)

    commitments.update(lens_commitments)
    lens_digest = "sha256:" + sha_hex(
        "\n".join(sorted(lens_commitments.values())).encode("utf-8")
    )
    return {
        "prompt_token_counts": prompt_token_counts,
        "commitments": commitments,
        "tensors": tensors,
        "salts": salts,
        "lens_digest": lens_digest,
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
        rec = seal(
            "captured", cfg["model_id"], cfg["revision"], cfg["declaration_digest"],
            result["lens_digest"],
        )
        print(json.dumps({"ceremony": rec, "prompt_token_counts": result["prompt_token_counts"]}))
    except Exception as e:  # noqa: BLE001 — both-outcomes honesty: a failure is sealed, not hidden.
        rec = seal(
            "capture_failed", cfg["model_id"], cfg["revision"], None,
            cfg.get("lens_digest", "sha256:unknown"), extra={"reason": str(e)},
        )
        print(json.dumps({"ceremony": rec}))
