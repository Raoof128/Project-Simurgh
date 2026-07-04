# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4O kernel<->verifier parity: the Python gate must agree with the Node gate on
every committed arm's FIRST raw code, and Python domain_digest must byte-match Node's.

The signature-mismatch arm carries the literal signature "TAMPERED" so the Python side can
detect it with a crypto-free stub (Node uses real Ed25519). Timeline arms (raw 66) are
attestation-level, not kernel-level, and are skipped here (asserted by the Node verifier).
"""
import json
import pathlib

from simurgh_agentdojo_adapter import manifest_surface as ms

ROOT = pathlib.Path(__file__).resolve().parents[3]
FIX = ROOT / "tests/fixtures/llmShield/stage4o"


def test_canonical_digest_parity_with_node():
    for v in json.loads((FIX / "parity/canonical-parity.json").read_text()):
        assert ms.domain_digest(v["domain"], v["schema"], v["value"]) == v["digest"], v["description"]


def test_gate_parity_same_first_raw_code_on_every_arm():
    matrix = json.loads((FIX / "expected-results/vtsa-matrix.json").read_text())
    checked = 0
    for row in matrix:
        if row["expected_raw"] == 66:
            continue  # attestation-level, not evaluated by the kernel gate
        arm = json.loads((FIX / "arms" / f"{row['arm']}.json").read_text())
        out = ms.gate_tool_call(
            chain=arm["chain"],
            receipt=arm["receipt"],
            action_digest_value=arm["action_digest"],
            verify_commitment_signature=lambda env: env.get("signature") != "TAMPERED",
            kernel_entrypoint="authorise_with_manifest.v1",
        )
        assert out["raw"] == row["expected_raw"], row["arm"]
        checked += 1
    assert checked >= 17
