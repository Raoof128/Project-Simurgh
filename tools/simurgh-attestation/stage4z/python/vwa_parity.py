# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4Z VWA — Python parity (plan Task 11). Stdlib only. A SECOND independent implementation
# of the deterministic surface: float32-LE decode, fixed-order float64 dot, half-to-even
# rounding, nano-scaled decimal-STRING scores, the theta flag rule, the total grid, salted
# commitments, and canonical JSON — so JS<->Python parity over the corpus is a real cross-impl
# check. Ed25519 is excluded (Node stays authoritative). Motto: AnthropicSafe First, then
# ReviewerSafe.
import hashlib
import json
import math
import struct
import sys

SAFE = 2**53 - 1


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(data):
    if isinstance(data, str):
        data = data.encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


def record_digest(obj):
    return sha(canonical(obj))


def decode_f32le(byte_list):
    b = bytes(byte_list)
    if len(b) % 4 != 0:
        raise ValueError("f32_length_not_multiple_of_4")
    out = []
    for i in range(0, len(b), 4):
        v = struct.unpack_from("<f", b, i)[0]
        if not math.isfinite(v):
            raise ValueError("non_finite_tensor")
        out.append(v)
    return out


def dot_f64(a, b):
    if len(a) != len(b):
        raise ValueError("dot_length_mismatch")
    acc = 0.0
    for i in range(len(a)):
        acc += a[i] * b[i]
    return acc


def round_half_even(x):
    f = math.floor(x)
    diff = x - f
    if diff < 0.5:
        return f
    if diff > 0.5:
        return f + 1
    return f if f % 2 == 0 else f + 1


def score_nano(s):
    if not math.isfinite(s):
        raise ValueError("non_finite_score")
    r = round_half_even(s * 1e9)
    if not (-SAFE <= r <= SAFE):
        raise ValueError("score_nano_out_of_range")
    return str(int(r))


def cmp_nano(a, b):
    x, y = int(a), int(b)
    return -1 if x < y else (1 if x > y else 0)


def tensor_commitment(salt, byte_list):
    return sha(str(salt).encode("utf-8") + bytes(byte_list))


def expand_grid(decl):
    cells = []
    for p in decl["prompts"]:
        for t in range(p["n_tokens"]):
            for layer in decl["layers"]:
                cells.append({"prompt_id": p["prompt_id"], "t": t, "layer": layer})
    cells.sort(key=lambda c: (str(c["prompt_id"]), c["t"], c["layer"]))
    return cells


def build_map(declaration, tensors, salts, self_report, provenance):
    prompts = declaration["corpus_manifest"]["prompts"]
    layers = declaration["layers"]
    theta = declaration["theta_nano"]
    tokens = declaration["tokens"]

    activations = {k[4:]: v for k, v in tensors.items() if k.startswith("act:")}
    lens_rows = {k[5:]: v for k, v in tensors.items() if k.startswith("lens:")}

    cells = []
    for c in expand_grid({"prompts": prompts, "layers": layers}):
        a = decode_f32le(activations[f"{c['prompt_id']}:{c['t']}:{c['layer']}"])
        scores = []
        flags = []
        for tok in tokens:
            l = decode_f32le(lens_rows[f"{c['layer']}:{tok['token_id']}"])
            sn = score_nano(dot_f64(a, l))
            scores.append({"token_id": tok["token_id"], "score_nano": sn})
            if cmp_nano(sn, theta) >= 0:
                flags.append(tok["token_id"])
        cells.append({**c, "scores": scores, "flags": flags})

    flags_by_token = {}
    n_flagged_cells = 0
    flag_total = 0
    for c in cells:
        if c["flags"]:
            n_flagged_cells += 1
        flag_total += len(c["flags"])
        for tid in c["flags"]:
            flags_by_token[str(tid)] = flags_by_token.get(str(tid), 0) + 1
    aggregates = {
        "n_cells": len(cells),
        "flags_by_token": flags_by_token,
        "n_flagged_cells": n_flagged_cells,
        "flag_total": flag_total,
    }

    commitments = {}
    for k, v in tensors.items():
        commitments[k] = tensor_commitment(salts[k], v)

    return {
        "schema": "simurgh.vwa.map.v1",
        "declaration_digest": record_digest(declaration),
        "theta_nano": theta,
        "position_rule_id": declaration["position_rule_id"],
        "layers": layers,
        "cells": cells,
        "aggregates": aggregates,
        "commitments": commitments,
        "self_report": {"n_flags": self_report["n_flags"]},
        "provenance": provenance,
    }


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "roundtrip":
        vec = [0.5, 1.5, 2.5, -0.5, -1.5, 2.4999999999]
        print(json.dumps([round_half_even(x) for x in vec]))
    elif mode == "canonical":
        print(canonical(json.loads(sys.argv[2])))
    elif mode == "map":
        bundle = json.loads(open(sys.argv[2], encoding="utf-8").read())
        m = build_map(
            bundle["declaration"],
            bundle["audit"]["tensors"],
            bundle["audit"]["salts"],
            bundle["map"]["self_report"],
            bundle["map"]["provenance"],
        )
        print(canonical(m))
    elif mode == "decl_digest":
        bundle = json.loads(open(sys.argv[2], encoding="utf-8").read())
        print(record_digest(bundle["declaration"]))
