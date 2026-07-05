# SPDX-License-Identifier: AGPL-3.0-or-later
# Motto: AnthropicSafe First, then ReviewerSafe.
import inspect

from simurgh_agentdojo_adapter import capability_kernel as ck
from simurgh_agentdojo_adapter import friction_surface as fs


def D(c):
    return "sha256:" + c * 64


def good_envelope():
    return {
        "schema": fs.SCHEMAS["ENVELOPE"],
        "policy_id": "vfr-default.v1",
        "boundary_kinds_requiring_approval": ["tool_execution", "unsafe_export"],
        "admissible_exemption_boundary_kinds": [],
        "approver_public_key_digest": D("a"),
        "harness_public_key_digest": D("b"),
        "max_window_straddle": 1,
        "run_id_digest": D("c"),
        "stage4n_window_anchor_digest": D("d"),
    }


def good_receipt():
    return {
        "schema": fs.SCHEMAS["APPROVAL_RECEIPT"],
        "action_digest": D("e"),
        "request_digest": D("f"),
        "boundary_kind": "tool_execution",
        "stage4n_window_anchor_digest": D("d"),
        "run_id_digest": D("c"),
        "receipt_epoch": 10,
        "valid_from_epoch": 10,
        "valid_until_epoch": 11,
        "nonce_digest": D("0"),
        "approval_display_digest": D("1"),
        "approver_public_key_digest": D("a"),
        "signature": "AAAA",
    }


def good_exemption():
    return {
        "schema": fs.SCHEMAS["APPROVAL_EXEMPTION"],
        "action_digest": D("e"),
        "request_digest": D("f"),
        "boundary_kind": "tool_execution",
        "run_id_digest": D("c"),
        "stage4n_window_anchor_digest": D("d"),
        "exemption_reason": "approval_not_present",
        "exemption_policy_id": "vfr-default.v1",
        "harness_public_key_digest": D("b"),
        "signature": "EEEE",
    }


def good_crossing(receipt):
    return {
        "schema": fs.SCHEMAS["BOUNDARY_CROSSING"],
        "action_digest": D("e"),
        "request_digest": D("f"),
        "boundary_kind": "tool_execution",
        "crossing_epoch": 10,
        "run_id_digest": D("c"),
        "approval_binding_kind": "receipt",
        "approval_binding_digest": fs.approval_receipt_digest(receipt),
        "harness_public_key_digest": D("b"),
        "signature": "BBBB",
    }


ALWAYS_VALID = lambda *_: True  # noqa: E731
ACTION = ck.Action("egress", "send", "email", "bob@example.com")


def _green_ctx():
    receipt = good_receipt()
    crossing = good_crossing(receipt)
    chain = [
        {"entry_digest": fs.approval_receipt_digest(receipt)},
        {"entry_digest": fs.crossing_digest(crossing)},
    ]
    return ck.FrictionContext(
        envelope=good_envelope(),
        approval_receipt=receipt,
        exemption=None,
        crossing=crossing,
        chain_entries=tuple(chain),
        verify_signature=ALWAYS_VALID,
    ), receipt.get("approval_display_digest")


def test_green_receipt_path_is_allow_friction_receipt_bound():
    ctx, display = _green_ctx()
    out = ck.authorise_with_friction(ACTION, friction=ctx, display_expected=display)
    assert out.raw_code == 0
    assert out.reason == "accepted"
    assert out.decision.verdict == "allow"
    assert out.decision.reason == "friction_receipt_bound"


def test_83_masks_81_missing_receipt_with_bad_sig():
    ctx, display = _green_ctx()
    ctx = ck.FrictionContext(
        envelope=ctx.envelope, approval_receipt=None, exemption=None, crossing=ctx.crossing,
        chain_entries=ctx.chain_entries, verify_signature=lambda *_: False,
    )
    out = ck.authorise_with_friction(ACTION, friction=ctx, display_expected=display)
    assert out.raw_code == 83


def test_81_fails_closed_without_verifier():
    ctx, display = _green_ctx()
    ctx = ck.FrictionContext(
        envelope=ctx.envelope, approval_receipt=ctx.approval_receipt, exemption=None,
        crossing=ctx.crossing, chain_entries=ctx.chain_entries, verify_signature=None,
    )
    out = ck.authorise_with_friction(ACTION, friction=ctx, display_expected=display)
    assert out.raw_code == 81


def test_86_same_key_approval_refused():
    ctx, display = _green_ctx()
    receipt = {**ctx.approval_receipt, "approver_public_key_digest": ctx.envelope["harness_public_key_digest"]}
    crossing = {**ctx.crossing, "approval_binding_digest": fs.approval_receipt_digest(receipt)}
    chain = ({"entry_digest": fs.approval_receipt_digest(receipt)}, {"entry_digest": fs.crossing_digest(crossing)})
    ctx = ck.FrictionContext(ctx.envelope, receipt, None, crossing, chain, ALWAYS_VALID)
    out = ck.authorise_with_friction(ACTION, friction=ctx, display_expected=display)
    assert (out.raw_code, out.reason) == (86, "approver_key_equals_harness_key")


def test_exemption_admitted_is_allow_friction_exemption_bound():
    exemption = good_exemption()
    crossing = {
        **good_crossing(good_receipt()),
        "approval_binding_kind": "exemption",
        "approval_binding_digest": fs.approval_exemption_digest(exemption),
    }
    envelope = {**good_envelope(), "admissible_exemption_boundary_kinds": ["tool_execution"]}
    chain = ({"entry_digest": fs.crossing_digest(crossing)},)
    ctx = ck.FrictionContext(envelope, None, exemption, crossing, chain, ALWAYS_VALID)
    out = ck.authorise_with_friction(ACTION, friction=ctx)
    assert out.raw_code == 0
    assert out.reason == "accepted_exempt"  # preserved, not erased (MF5)
    assert out.decision.reason == "friction_exemption_bound"


def test_exemption_refused_by_default_policy():
    exemption = good_exemption()
    crossing = {
        **good_crossing(good_receipt()),
        "approval_binding_kind": "exemption",
        "approval_binding_digest": fs.approval_exemption_digest(exemption),
    }
    chain = ({"entry_digest": fs.crossing_digest(crossing)},)
    ctx = ck.FrictionContext(good_envelope(), None, exemption, crossing, chain, ALWAYS_VALID)
    out = ck.authorise_with_friction(ACTION, friction=ctx)
    assert (out.raw_code, out.reason) == (87, "approval_exemption_not_permitted_by_policy")


def test_frozen_family_unchanged():
    for name in ("authorise", "authorise_with_intent", "authorise_with_provenance", "authorise_with_manifest"):
        assert callable(getattr(ck, name))
    sig = inspect.signature(ck.authorise_with_friction)
    assert list(sig.parameters) == ["action", "friction", "chain_verdict", "display_expected"]
