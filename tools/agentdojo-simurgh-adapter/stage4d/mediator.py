# SPDX-License-Identifier: AGPL-3.0-or-later
"""Recorded-fixture mediator for Stage 4D."""

import json
from pathlib import Path

from .derivation import derive_integrity_summary, derive_untrusted_reached_authority
from .policy import POLICY_BUNDLE, decide

SINK_REGISTRY = {
    "registry_version": "sinks.v1",
    "sinks": [
        {
            "sink_id": "egress",
            "description": "External communication or network/post/email-style action",
            "default_consequence_class": "external_egress",
        },
        {
            "sink_id": "destructive_mutation",
            "description": "Delete, overwrite, cancel, or irreversible state mutation",
            "default_consequence_class": "irreversible_external_effect",
        },
        {
            "sink_id": "secret_export",
            "description": "Export of secrets, hidden prompts, credentials, or internal policy",
            "default_consequence_class": "external_egress",
        },
        {
            "sink_id": "authority_escalation",
            "description": "Untrusted context gaining instruction or tool authority",
            "default_consequence_class": "internal_mutation",
        },
    ],
}

CONSEQUENCE_LATTICE = {
    "lattice_version": "consequence_lattice.v1",
    "order": ["read_only", "internal_mutation", "external_egress", "irreversible_external_effect"],
}


def load_fixture(path: Path | str) -> dict:
    fixture_path = Path(path)
    if not fixture_path.is_absolute():
        fixture_path = Path(__file__).resolve().parents[1] / fixture_path
    return json.loads(fixture_path.read_text())


def _material_for(action: dict, policy_mode: str) -> dict:
    return {
        "resolved_args_redacted": action["resolved_args_redacted"],
        "policy_features_source": action["policy_features_source"],
        "taint_derivation_inputs": {
            "sources": action["input_sources"],
            "authority_sink": bool(action["policy_features_source"]["requires_authority"]),
        },
        "decision_context": {
            "prior_decision_count": int(action["step_index"]),
            "rate_limit_bucket": f"fixture_bucket_{action['step_index']}",
            "policy_mode": policy_mode,
        },
    }


def build_run_record(path: Path | str) -> dict:
    fixture = load_fixture(path)
    policy_mode = fixture["policy_mode"]
    observation_log = []
    replay_material = {}
    decisions = []

    for action in fixture["actions"]:
        material = _material_for(action, policy_mode)
        replay_material[action["action_id"]] = material
        untrusted = derive_untrusted_reached_authority(material["taint_derivation_inputs"])
        decision_input = {"policy_mode": policy_mode, "untrusted_reached_authority": untrusted}
        replayed = decide(POLICY_BUNDLE, decision_input, material, SINK_REGISTRY)
        observation_log.append(
            {
                "event_version": "simurgh.stage4d.observation.v1",
                "run_id": fixture["run_id"],
                "parent_session": fixture["parent_session"],
                "action_id": action["action_id"],
                "step_index": action["step_index"],
                "action_type": action["action_type"],
                "sink_id": action["sink_id"],
                "consequence_class": action["consequence_class"],
                "boundary_id": action["boundary_id"],
            }
        )
        decisions.append(
            {
                "action_id": action["action_id"],
                "decision": replayed["decision"],
                "decision_reason_code": replayed["reason_code"],
                "input_integrity_summary": derive_integrity_summary(material["taint_derivation_inputs"]),
                "decision_input": decision_input,
            }
        )

    return {
        "run_manifest": {
            "run_id": fixture["run_id"],
            "parent_session": fixture["parent_session"],
            "mode": "recorded_fixture",
            "fixture_id": "browser_inject_01",
            "model_identity_committed": fixture["model_identity_committed"],
            "model_identity_origin": fixture["model_identity_origin"],
        },
        "policy_bundle": POLICY_BUNDLE,
        "sink_registry": SINK_REGISTRY,
        "consequence_lattice": CONSEQUENCE_LATTICE,
        "action_observation_log": observation_log,
        "replay_material": replay_material,
        "decisions": decisions,
    }
