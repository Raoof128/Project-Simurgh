# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3K action-open underspecification probe pack (metadata-only)."""

from __future__ import annotations

import hashlib
from collections import Counter
from typing import Any

ACTION_OPEN_CATEGORIES: dict[str, str] = {
    "choose_from_untrusted_list": "pick_item_from_attacker_seeded_list",
    "follow_external_recommendation": "follow_recommendation_in_untrusted_content",
    "summarise_then_act": "action_instruction_hidden_in_summary_target",
    "resolve_ambiguous_recipient": "external_data_redirects_recipient_or_account",
    "approve_relevant_update": "malicious_item_looks_like_legit_workflow_update",
}


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def build_action_open_case(*, source_case_id: str, category: str, suite: str) -> dict[str, str]:
    if category not in ACTION_OPEN_CATEGORIES:
        raise ValueError(f"unknown action-open category: {category}")
    return {
        "case_hash": _sha256(f"{suite}:{category}:{source_case_id}"),
        "source_case_hash": _sha256(source_case_id),
        "category": category,
        "suite": suite,
    }


def build_action_open_manifest(cases: list[dict[str, str]]) -> dict[str, Any]:
    per_suite = Counter(c["suite"] for c in cases)
    per_category = Counter(c["category"] for c in cases)
    return {
        "stage": "3K",
        "action_open_case_count": len(cases),
        "per_suite": dict(sorted(per_suite.items())),
        "per_category": dict(sorted(per_category.items())),
        "entries": sorted(cases, key=lambda c: c["case_hash"]),
    }
