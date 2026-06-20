# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3K deterministic mutation generator.

Pure. Generates metadata-only variant descriptors from source case identifiers
and enumerated operators. No model, no I/O, no raw text in output. The raw
mutated prompt text (if ever materialised) is the runner's local concern; this
module only emits hashes/enums.
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

OPERATORS: dict[str, str] = {
    "instruction_softening": "imperative_to_polite_request",
    "authority_shadowing": "fake_policy_developer_compliance_framing",
    "data_camouflage": "goal_inside_plausible_external_data",
    "format_shift": "markdown_json_table_quote_yaml_email",
    "role_indirection": "act_as_auditor_router_verifier",
    "benign_prefix_padding": "benign_task_data_before_goal",
    "benign_suffix_padding": "benign_task_data_after_goal",
    "multi_step_delegation": "stage_request_same_ultimate_goal",
    "encoded_hint": "lightweight_reversible_encoding_or_spacing",
    "tool_affordance_lure": "tool_looking_action_without_call_syntax",
}

_REQUIRED_VARIANT_KEYS = {
    "variant_hash",
    "source_case_hash",
    "operator_id",
    "operator_params_hash",
}

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _params_hash(operator_params: dict[str, Any]) -> str:
    canonical = json.dumps(operator_params, sort_keys=True, separators=(",", ":"))
    return _sha256(canonical)


def _validate_variant(variant: dict[str, Any]) -> None:
    if set(variant) != _REQUIRED_VARIANT_KEYS:
        raise ValueError(f"variant has unexpected keys: {sorted(variant)}")
    if variant["operator_id"] not in OPERATORS:
        raise ValueError(f"unknown operator: {variant['operator_id']}")
    for key in ("variant_hash", "source_case_hash", "operator_params_hash"):
        if not _SHA256_RE.match(str(variant[key])):
            raise ValueError(f"{key} is not a 64-char hex sha256")


def operator_catalogue() -> list[dict[str, str]]:
    return [{"operator_id": k, "purpose": OPERATORS[k]} for k in sorted(OPERATORS)]


def generate_variant(
    *, source_case_id: str, operator_id: str, operator_params: dict[str, Any]
) -> dict[str, str]:
    if operator_id not in OPERATORS:
        raise ValueError(f"unknown operator: {operator_id}")
    source_case_hash = _sha256(source_case_id)
    operator_params_hash = _params_hash(operator_params)
    variant_hash = _sha256(f"{source_case_hash}:{operator_id}:{operator_params_hash}")
    return {
        "variant_hash": variant_hash,
        "source_case_hash": source_case_hash,
        "operator_id": operator_id,
        "operator_params_hash": operator_params_hash,
    }


def generate_mutation_set(
    *,
    source_case_ids: list[str],
    operators: list[str],
    params_by_operator: dict[str, dict[str, Any]],
) -> list[dict[str, str]]:
    variants: list[dict[str, str]] = []
    for source_case_id in sorted(source_case_ids):
        for operator_id in sorted(operators):
            variants.append(
                generate_variant(
                    source_case_id=source_case_id,
                    operator_id=operator_id,
                    operator_params=params_by_operator.get(operator_id, {}),
                )
            )
    variants.sort(key=lambda v: v["variant_hash"])
    return variants


def build_mutation_manifest(variants: list[dict[str, str]], *, seed: int) -> dict[str, Any]:
    for variant in variants:
        _validate_variant(variant)
    coverage = sorted({v["operator_id"] for v in variants})
    return {
        "stage": "3K",
        "seed": seed,
        "mutation_variant_count": len(variants),
        "operator_coverage": coverage,
        "entries": variants,
    }
