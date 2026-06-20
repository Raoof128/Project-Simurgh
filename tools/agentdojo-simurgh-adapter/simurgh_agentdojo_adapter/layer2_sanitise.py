# SPDX-License-Identifier: AGPL-3.0-or-later
"""Allowlist-based sanitising for AgentDojo results."""

from __future__ import annotations

import json
from typing import Any


FORBIDDEN_KEYS = {
    "api_key",
    "anthropic_api_key",
    "provider_request_body",
    "provider_response_body",
    "raw_provider_output",
    "raw_prompt",
    "raw_tool_output",
    "system_prompt",
    "transcript",
    "trajectory",
    "tool_result",
    "token",
}

ALLOWLIST = {
    "agentdojo_run_id",
    "task_id",
    "security_case_id",
    "kind",
    "suite",
    "attack_family",
    "defence",
    "model_provider",
    "provider_mode",
    "utility_success",
    "attack_success",
    "completed",
    "gateway_contacted",
    "receipt_id",
    "non_call_reason",
    "audit_verified",
    "gateway_verdict",
    "boundary",
    "tool_execution_bypassed_gate",
    "unsafe_output_exported",
    "context_authority_escalated",
    "generated_evidence_leakage",
    # Stage 3K descriptive tags (metadata-only enums).
    "lane",
    "operator_id",
    "category",
    "attacker_goal_completed",
}


class SanitiseError(ValueError):
    pass


def _reject_forbidden_keys(value: Any) -> None:
    blob = json.dumps(value).lower()
    for key in FORBIDDEN_KEYS:
        if f'"{key}"' in blob:
            raise SanitiseError(f"forbidden key in AgentDojo result: {key}")


def sanitise_agentdojo_row(row: dict[str, Any]) -> dict[str, Any]:
    _reject_forbidden_keys(row)
    return {key: row[key] for key in ALLOWLIST if key in row}


def sanitise_agentdojo_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [sanitise_agentdojo_row(row) for row in rows]
