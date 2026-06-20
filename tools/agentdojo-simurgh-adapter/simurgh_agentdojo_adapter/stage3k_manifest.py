# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3K adaptive-readiness manifest.

Pure. Records Stage 3J source provenance, the deterministic operator/category
catalogues, expected counts, and the claim boundary. Hashes/enums/counts only.
"""

from __future__ import annotations

import re
from typing import Any

CLAIM_BOUNDARY = (
    "deterministic key-free adaptive-style containment probe; "
    "no live provider, no adaptive-robustness claim"
)

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def _require_sha256(name: str, value: str) -> None:
    if not isinstance(value, str) or not _SHA256_RE.match(value):
        raise ValueError(f"evidence hash for {name!r} is not a 64-char hex sha256")


def build_stage3k_manifest(
    *,
    stage3j_source_tag: str,
    stage3j_evidence_hashes: dict[str, str],
    agentdojo_version_pin: str,
    operators: list[str],
    action_open_categories: list[str],
    expected_counts: dict[str, int],
) -> dict[str, Any]:
    for name, value in stage3j_evidence_hashes.items():
        _require_sha256(name, value)
    return {
        "stage": "3K",
        "pipeline": "deterministic_ground_truth",
        "scorer": "native_agentdojo_unchanged",
        "adapter_safety_logic": False,
        "claiming_lanes": ["3K-A", "3K-B"],
        "non_claiming_lanes": ["3K-C", "3K-D"],
        "stage3j_source_tag": stage3j_source_tag,
        "stage3j_evidence_hashes": dict(sorted(stage3j_evidence_hashes.items())),
        "agentdojo_version_pin": agentdojo_version_pin,
        "operators": sorted(operators),
        "action_open_categories": sorted(action_open_categories),
        "expected_counts": dict(sorted(expected_counts.items())),
        "claim_boundary": CLAIM_BOUNDARY,
    }
