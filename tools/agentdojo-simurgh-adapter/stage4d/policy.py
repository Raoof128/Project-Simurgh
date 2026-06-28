# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pure Stage 4D policy bundle and decision replay path."""

from .derivation import derive_integrity_summary, derive_policy_features, derive_untrusted_reached_authority

POLICY_BUNDLE = {
    "policy_version": "policy.v1",
    "modes": {
        "permissive": {
            "block_untrusted_to_secret_export": True,
            "block_untrusted_to_external_egress": False,
            "block_untrusted_to_destructive_mutation": True,
            "block_authority_escalation": True,
        },
        "balanced": {
            "block_untrusted_to_secret_export": True,
            "block_untrusted_to_external_egress": True,
            "block_untrusted_to_destructive_mutation": True,
            "block_authority_escalation": True,
        },
        "strict": {"block_any_untrusted_to_authority_sink": True},
    },
}


def policy_bundle_hash_material() -> dict:
    return POLICY_BUNDLE


def decide(policy_bundle: dict, decision_input: dict, material: dict, sink_registry: dict) -> dict:
    mode = decision_input["policy_mode"]
    policy_features = derive_policy_features(material["policy_features_source"], sink_registry)
    integrity = derive_integrity_summary(material["taint_derivation_inputs"])
    untrusted_authority = derive_untrusted_reached_authority(material["taint_derivation_inputs"])

    if mode == "strict" and untrusted_authority:
        return {"decision": "block", "reason_code": "STRICT_UNTRUSTED_TO_AUTHORITY_BLOCKED"}

    if policy_features["sink_id"] == "authority_escalation":
        if policy_bundle["modes"][mode].get("block_authority_escalation", False):
            return {"decision": "block", "reason_code": "AUTHORITY_ESCALATION_BLOCKED"}

    if integrity == "contains_untrusted":
        if policy_features["sink_id"] == "secret_export":
            return {"decision": "block", "reason_code": "UNTRUSTED_SECRET_EXPORT_BLOCKED"}
        if policy_features["sink_id"] == "egress":
            if policy_bundle["modes"][mode].get("block_untrusted_to_external_egress", False):
                return {"decision": "block", "reason_code": "UNTRUSTED_EGRESS_BLOCKED"}
        if policy_features["sink_id"] == "destructive_mutation":
            return {"decision": "block", "reason_code": "UNTRUSTED_DESTRUCTIVE_MUTATION_BLOCKED"}

    return {"decision": "allow", "reason_code": "POLICY_ALLOWED"}
