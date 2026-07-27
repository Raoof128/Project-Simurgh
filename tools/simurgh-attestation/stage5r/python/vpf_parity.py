#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 5R — the deterministic surface, mirrored in Python (Task 25).

AN INDEPENDENT RECOMPUTE, NOT A TRANSLATION OF THE JAVASCRIPT.

The value of a second runtime is that it disagrees when the first one is wrong. A mirror written by
transliterating the JS line by line inherits the JS's assumptions and agrees with it for the same
reasons, which is agreement that proves nothing. So this is written from the stated rules:
domain-separated SHA-256 with a single 0x00 separator, byte-level canonicalisation, and integer
round-half-up arithmetic in tenths of a percent.

Where Python and JavaScript genuinely differ, the difference is handled explicitly:

  integer division   Python's // floors toward negative infinity and JS's Math.floor does too, so
                     the round-half-up expression transfers unchanged for non-negative inputs — and
                     negative inputs are refused rather than assumed away.
  sorting            Python sorts str by code point, JS by UTF-16 code unit. They differ only above
                     the BMP, and the permutation sorts hex digests, which are ASCII.
"""

import hashlib
import json
import sys


def _sha256_hex(*parts: bytes) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p)
    return h.hexdigest()


def tenths(numerator: int, denominator: int) -> int:
    """Integer round-half-up, in TENTHS of a percent."""
    if not isinstance(numerator, int) or not isinstance(denominator, int):
        raise TypeError("tenths: integers only")
    if isinstance(numerator, bool) or isinstance(denominator, bool):
        raise TypeError("tenths: a bool is not an integer here")
    if denominator <= 0:
        raise ValueError("tenths: denominator must be positive")
    if numerator < 0:
        raise ValueError("tenths: a negative numerator is not a count")
    return (numerator * 1000 + denominator // 2) // denominator


def span_digest(source: str) -> str:
    return _sha256_hex(b"simurgh.vpf.control-span.v1", b"\x00", str(source).encode("utf-8"))


def file_pin(text: str) -> str:
    lf = str(text).replace("\r\n", "\n").replace("\r", "\n")
    canonical = lf if lf.endswith("\n") else lf + "\n"
    return _sha256_hex(b"simurgh.vpf.inherited-file.v1", b"\x00", canonical.encode("utf-8"))


def verdict_receipt_digest(receipt: dict) -> str:
    canonical = " ".join(
        [
            receipt["control_digest"],
            receipt["detector_digest"],
            receipt["declared_signal"],
            receipt["verdict"],
            receipt["signal_evidence_digest"],
        ]
    )
    return _sha256_hex(b"simurgh.vpf.verdict-receipt.v1", b"\x00", canonical.encode("utf-8"))


def permute(items, seed: str):
    keyed = [(_sha256_hex(f"{seed} {item}".encode("utf-8")), item) for item in items]
    keyed.sort()
    return [item for _, item in keyed]


def answer_one(entry_id: str, value):
    if entry_id == "measurements.tenths":
        return tenths(value["numerator"], value["denominator"])
    if entry_id == "controls.spanDigest":
        return span_digest(value["source"])
    if entry_id == "inherit.filePin":
        return file_pin(value["text"])
    if entry_id == "laneB.verdictReceiptDigest":
        return verdict_receipt_digest(value)
    if entry_id == "laneB.permute":
        return ",".join(permute(value["items"], value["seed"]))
    # Fail closed. A mirror that skips what it does not implement reports parity over the subset it
    # happens to cover.
    raise KeyError(f"python mirror: no implementation for manifest entry {entry_id!r}")


def answer_manifest(manifest: dict) -> dict:
    return {
        entry["id"]: [answer_one(entry["id"], v["input"]) for v in entry["vectors"]]
        for entry in manifest["entries"]
    }


if __name__ == "__main__":
    with open(sys.argv[1], "r", encoding="utf-8") as fh:
        manifest = json.load(fh)
    json.dump(answer_manifest(manifest), sys.stdout, sort_keys=True)
