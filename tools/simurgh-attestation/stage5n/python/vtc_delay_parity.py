# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5N — Python parity for the deterministic core (independent audit, Lane D). Stdlib only (hashlib);
# reproduces H_DS / canonical / seed derivation / the dependent chain byte-for-byte vs the Node core.
# Full anchor verification (RFC-3161 via openssl, OTS/Bitcoin, Rekor) is added in the Lane-D pack; this
# module is the shared deterministic surface.
import hashlib
import json
import struct
import sys

DS = {
    "seed": "simurgh.vtc_delay.seed.v1",
    "x0": "simurgh.vtc_delay.x0.v1",
    "step": "simurgh.vtc_delay.step.v1",
}


def canonical(value):
    # Matches the shared JS canonicaliser: recursively sorted keys, no whitespace, UTF-8.
    return json.dumps(_sort(value), separators=(",", ":"), ensure_ascii=False)


def _sort(v):
    if isinstance(v, dict):
        return {k: _sort(v[k]) for k in sorted(v.keys())}
    if isinstance(v, list):
        return [_sort(x) for x in v]
    return v


def sha256(b: bytes) -> bytes:
    return hashlib.sha256(b).digest()


def h_ds(tag: str, data: bytes) -> str:
    return sha256(tag.encode("utf-8") + b"\x00" + data).hex()


def hds_object(tag: str, obj) -> str:
    return h_ds(tag, canonical(obj).encode("utf-8"))


def derive_seed(run_id, d_in, start_token_digest, delay_policy_digest) -> str:
    return hds_object(
        DS["seed"],
        {
            "run_id": run_id,
            "D_in": d_in,
            "start_token_digest": start_token_digest,
            "delay_policy_digest": delay_policy_digest,
        },
    )


def x0_bytes(seed_hex: str) -> bytes:
    return sha256(DS["x0"].encode("utf-8") + b"\x00" + bytes.fromhex(seed_hex))


def run_chain(seed_hex: str, t: int, cadence: int):
    x = x0_bytes(seed_hex)
    x0 = x.hex()
    checkpoints = []
    for i in range(1, t + 1):
        x = sha256(DS["step"].encode("utf-8") + b"\x00" + struct.pack(">Q", i) + x)
        if cadence > 0 and i % cadence == 0:
            checkpoints.append({"i": i, "value": x.hex()})
    return {"x0": x0, "checkpoints": checkpoints, "terminal_value": x.hex()}


if __name__ == "__main__":
    # Emit the same vectors the Node core produces, for cross-runtime comparison.
    seed = derive_seed("r1", "a" * 64, "b" * 64, "c" * 64)
    chain = run_chain(seed, 10, 5)
    print(
        json.dumps(
            {
                "seed": seed,
                "x0": chain["x0"],
                "terminal": chain["terminal_value"],
                "cps": chain["checkpoints"],
            }
        )
    )
    sys.exit(0)
