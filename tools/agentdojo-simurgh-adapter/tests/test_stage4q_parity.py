# SPDX-License-Identifier: AGPL-3.0-or-later
# Motto: AnthropicSafe First, then ReviewerSafe.
# Cross-language parity: the pure-Python friction_surface must return the SAME
# {raw, reason} per case as the Node core, over the committed Lane-A corpus.
import base64
import json
import pathlib

import pytest

pytest.importorskip("cryptography")
from cryptography.exceptions import InvalidSignature  # noqa: E402
from cryptography.hazmat.primitives.serialization import load_pem_public_key  # noqa: E402

from simurgh_agentdojo_adapter import friction_surface as fs  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2].parent
FIX = ROOT / "tests/fixtures/llmShield/stage4q/lane-a"


def make_verifier(public_keys):
    loaded = {d: load_pem_public_key(pem.encode("utf-8")) for d, pem in public_keys.items()}

    def verify(pub_digest, unsigned, sig_b64):
        key = loaded.get(pub_digest)
        if key is None:
            return False
        try:
            key.verify(base64.b64decode(sig_b64), fs.canonical_json(unsigned).encode("utf-8"))
            return True
        except InvalidSignature:
            return False

    return verify


def test_python_kernel_matches_committed_expected_decisions():
    corpus = json.loads((FIX / "corpus.json").read_text())
    expected = json.loads((FIX / "expected-decisions.json").read_text())
    verify = make_verifier(corpus["public_keys"])
    got = []
    for c in corpus["cases"]:
        entries, root = fs.build_chain(c["chain_events"])
        cv = fs.verify_chain(entries, expected_root=root, census=c.get("census"))
        out = fs.decide(
            envelope=c["envelope"],
            receipt=c["receipt"],
            exemption=c["exemption"],
            crossing=c["crossing"],
            chain_entries=entries,
            chain_verdict=cv,
            verify_signature=verify,
            display_expected=c.get("display_expected"),
        )
        got.append({"case_id": c["case_id"], "raw": out["raw"], "reason": out["reason"]})
    assert got == expected
