# SPDX-License-Identifier: AGPL-3.0-or-later
"""Fix 4: mandatory regression test around the only shared-code touch.

Proves the Stage 3K tagging is purely additive — stage != '3k' preserves the
Stage 3J row shape byte-for-byte, and stage == '3k' adds only lane/operator_id/
category, never a gateway/boundary/trust/policy field.
"""
import pytest

from simurgh_agentdojo_adapter.layer2_runner import (
    STAGE3K_TAG_KEYS,
    apply_stage3k_tags,
    tag_rows_for_stage,
)

_POLICY_FIELDS = ("gateway_verdict", "boundary", "trust_level", "source_type", "purpose")


def _row(i):
    return {"kind": "security", "task_id": f"u{i}", "security_case_id": f"u{i}::inj{i}",
            "suite": "workspace", "utility_success": True, "attack_success": False,
            "gateway_verdict": "accepted", "boundary": None, "trust_level": "untrusted",
            "source_type": "tool_result", "purpose": "reference", "receipt_id": f"g{i}"}


def test_non_3k_stage_preserves_row_shape_byte_for_byte():
    rows = [_row(0), _row(1)]
    out = tag_rows_for_stage(rows, stage="3j")
    assert out == rows
    # and it is a copy, not the same list object
    assert out is not rows


def test_3k_adds_only_allowed_metadata():
    rows = [_row(0), _row(1)]
    tags = [
        {"lane": "mutation", "operator_id": "data_camouflage"},
        {"lane": "action_open", "category": "summarise_then_act"},
    ]
    out = tag_rows_for_stage(rows, stage="3k", tags=tags)
    for original, tagged in zip(rows, out):
        added = set(tagged) - set(original)
        assert added <= STAGE3K_TAG_KEYS
        # every non-tag field is byte-for-byte unchanged
        for key in original:
            assert tagged[key] == original[key]
        # no gateway/boundary/trust/policy field was changed
        for key in _POLICY_FIELDS:
            assert tagged[key] == original[key]


def test_tag_with_disallowed_key_rejected():
    with pytest.raises(ValueError):
        apply_stage3k_tags([_row(0)], [{"lane": "mutation", "gateway_verdict": "blocked"}])


def test_tag_cannot_overwrite_non_tag_field():
    # 'suite' is not a tag key; attempting to set it via tags must fail
    with pytest.raises(ValueError):
        apply_stage3k_tags([_row(0)], [{"lane": "mutation", "suite": "evil"}])


def test_3k_requires_tags():
    with pytest.raises(ValueError):
        tag_rows_for_stage([_row(0)], stage="3k")
