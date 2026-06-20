# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3K run-independent catalogue artifacts (frozen in Plan 1)."""

from __future__ import annotations

from typing import Any

from .stage3k_action_open import ACTION_OPEN_CATEGORIES
from .stage3k_mutations import operator_catalogue


def build_catalogue_artifacts() -> dict[str, Any]:
    return {
        "mutation-operators.json": {
            "stage": "3K",
            "operators": operator_catalogue(),
        },
        "action-open-categories.json": {
            "stage": "3K",
            "categories": [
                {"category": k, "stress_pattern": ACTION_OPEN_CATEGORIES[k]}
                for k in sorted(ACTION_OPEN_CATEGORIES)
            ],
        },
    }
