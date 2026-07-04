# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4O: authorise_with_manifest kernel entry point (additive; 4A/4B/4C frozen)."""
import pathlib
import subprocess
import sys

from simurgh_agentdojo_adapter import manifest_surface as ms
from simurgh_agentdojo_adapter.capability_kernel import (
    Action,
    authorise_with_manifest,
    action_digest,
)
from _stage4o_helpers import mk_entry, mk_manifest, mk_envelope, valid_world

SIG_OK = lambda env: True  # noqa: E731
SIG_BAD = lambda env: False  # noqa: E731


def _act():
    return Action("egress", "send", "email", "alice@example.com")


def test_green_accept_carries_six_bindings():
    chain, receipt = valid_world()
    act = _act()
    out = authorise_with_manifest(act, manifest_chain=chain, receipt=receipt, verify_commitment_signature=SIG_OK)
    assert out.raw_code == 0
    assert out.decision.verdict == "allow" and out.decision.reason == "manifest_bound"
    assert out.manifest_bindings.kernel_entrypoint == "authorise_with_manifest.v1"
    assert out.manifest_bindings.action_digest == action_digest(act)


def test_default_signature_check_fails_closed_to_56():
    chain, receipt = valid_world()
    out = authorise_with_manifest(_act(), manifest_chain=chain, receipt=receipt)
    assert out.raw_code == 56


def test_each_raw_code_in_isolation_and_first_failure_order():
    chain, receipt = valid_world()
    act = _act()

    _UNSET = object()

    def raw(ch=_UNSET, rc=_UNSET, sig=SIG_OK):
        return authorise_with_manifest(
            act,
            manifest_chain=chain if ch is _UNSET else ch,
            receipt=receipt if rc is _UNSET else rc,
            verify_commitment_signature=sig,
        ).raw_code

    assert raw(ch=None) == 55  # absent (None chain)
    assert raw(ch=[{**chain[0], "extra": 1}, chain[1]]) == 55  # schema_invalid
    assert raw(sig=SIG_BAD) == 56
    assert raw(rc={**receipt, "run_epoch": 999}) == 57
    assert raw(rc={**receipt, "tool_name_digest": mk_entry(9)["tool_name_digest"]}) == 59  # identity
    assert raw(rc={**receipt, "inclusion_proof": []}) == 59  # bad proof
    assert raw(rc={**receipt, "tool_schema_digest": mk_entry(9)["tool_schema_digest"]}) == 60
    assert raw(rc={**receipt, "authority_class": "write"}) == 61
    assert raw(rc={**receipt, "sinks_used": [mk_entry(9)["tool_schema_digest"]]}) == 62
    malformed = {k: v for k, v in receipt.items() if k != "run_id_digest"}
    assert raw(rc=malformed) == 63

    # 58 in isolation: single genesis envelope, valid-format but wrong toolset root.
    m0 = mk_manifest([mk_entry(1), mk_entry(2)])
    idx = next(i for i, t in enumerate(m0["tools"]) if t["tool_name_digest"] == mk_entry(1)["tool_name_digest"])
    g_receipt = {
        "schema": ms.RECEIPT_SCHEMA,
        "tool_name_digest": m0["tools"][idx]["tool_name_digest"],
        "tool_schema_digest": m0["tools"][idx]["tool_schema_digest"],
        "authority_class": m0["tools"][idx]["authority_class"],
        "sinks_used": [],
        "inclusion_proof": ms.surface_path([ms.tool_entry_digest(t) for t in m0["tools"]], idx),
        "run_epoch": 5,
        "run_id_digest": ms.domain_digest(ms.DOMAINS["RECEIPT"], "run", "g"),
    }
    tampered = {**m0, "toolset_digest": "sha256:" + "d" * 64}
    g_env = mk_envelope(tampered, 0, None, "state")
    assert authorise_with_manifest(act, manifest_chain=[g_env], receipt=g_receipt, verify_commitment_signature=SIG_OK).raw_code == 58

    # 64 / 65 chain arms.
    m1 = mk_manifest([mk_entry(1), mk_entry(2), mk_entry(3)])
    e0 = mk_envelope(mk_manifest([mk_entry(1), mk_entry(2)]), 0, None, "state")
    blind = mk_envelope(m1, 1, e0, "state")
    r2 = valid_world()[1]
    assert authorise_with_manifest(act, manifest_chain=[e0, blind], receipt=r2, verify_commitment_signature=SIG_OK).raw_code in (57, 65)

    # First failure wins: bad signature + authority upgrade => 56.
    assert raw(rc={**receipt, "authority_class": "destructive"}, sig=SIG_BAD) == 56


def test_frozen_entry_points_untouched():
    adapter_root = pathlib.Path(__file__).resolve().parents[1]  # tests/ -> adapter root
    r = subprocess.run(
        [sys.executable, "-m", "pytest", "-q",
         "tests/test_capability_kernel.py", "tests/test_capability_kernel_intent.py",
         "tests/test_capability_kernel_provenance.py", "tests/test_capability_kernel_equivalence.py"],
        cwd=adapter_root, capture_output=True, text=True,
    )
    assert r.returncode == 0, r.stdout + r.stderr
