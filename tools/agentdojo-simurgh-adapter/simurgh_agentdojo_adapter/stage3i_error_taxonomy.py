# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3I Phase 1 error taxonomy.

Pure classification over per-case defended rows. No policy, no I/O, no AgentDojo
import. Stores only hashes and enums so generated evidence stays metadata-only.
"""

from __future__ import annotations

import hashlib
from typing import Any

SIMURGH_BOUNDARY_FAILURE_CLASSES = frozenset(
    {
        "input_firewall_block",
        "context_provenance_reject",
        "tool_family_not_permitted",
        "argument_shape_reject",
        "effect_reject",
        "output_firewall_block",
    }
)

_BLOCK_BOUNDARY_TO_CLASS = {
    "context_guard": ("context_provenance_reject", "context"),
    "tool_gate": ("tool_family_not_permitted", "tool"),
    "output_firewall": ("output_firewall_block", "output"),
}


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def classify_failure(row: dict[str, Any]) -> tuple[str, str]:
    """Return (primary_failure_class, boundary) for a failed/blocked row."""
    if row.get("gateway_verdict") == "blocked":
        boundary = row.get("boundary")
        if boundary in _BLOCK_BOUNDARY_TO_CLASS:
            return _BLOCK_BOUNDARY_TO_CLASS[boundary]
        return ("input_firewall_block", "input")
    if row.get("adapter_mapping_error") is True:
        return ("adapter_mapping_error", "adapter")
    if row.get("scorer_mismatch") is True:
        return ("scorer_completion_mismatch", "scorer")
    if row.get("utility_success") is False:
        return ("model_failed_task", "model")
    return ("unknown", "unknown")


def _is_benign_failure(row: dict[str, Any]) -> bool:
    return row.get("kind") == "benign" and row.get("utility_success") is False


def _is_blocked_security(row: dict[str, Any]) -> bool:
    return row.get("kind") == "security" and row.get("gateway_verdict") == "blocked"


def build_error_taxonomy(defended_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for row in defended_rows:
        if not (_is_benign_failure(row) or _is_blocked_security(row)):
            continue
        failure_class, boundary = classify_failure(row)
        kind = row.get("kind", "case")
        # positional reference only — never the raw task identifier
        case_ref = f"{kind}_{len(entries):03d}"
        raw_case_id = row.get("security_case_id") or row.get("task_id") or "unknown_case"
        task_id = str(row.get("task_id", "unknown_task"))
        receipt_id = row.get("receipt_id") or "none"
        entries.append(
            {
                "case_ref": case_ref,
                "case_hash": _sha256(raw_case_id),
                "task_id_hash": _sha256(task_id),
                "kind": kind,
                "mode": "defended",
                "utility_result": "pass" if row.get("utility_success") else "fail",
                "primary_failure_class": failure_class,
                "boundary": boundary,
                "reason_codes": list(row.get("reason_codes", [])),
                "receipt_hash": _sha256(receipt_id),
                "audit_chain_valid": row.get("audit_verified") is True,
            }
        )
    return entries
