# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pure replay-material derivation for Stage 4D."""

UNTRUSTED_LABELS = {"untrusted", "untrusted_web", "untrusted_tool", "provider_output"}


def derive_integrity_summary(taint_derivation_inputs: dict) -> str:
    labels = {str(source.get("label", "")) for source in taint_derivation_inputs.get("sources", [])}
    return "contains_untrusted" if labels & UNTRUSTED_LABELS else "trusted_only"


def derive_untrusted_reached_authority(taint_derivation_inputs: dict) -> bool:
    return (
        bool(taint_derivation_inputs.get("authority_sink"))
        and derive_integrity_summary(taint_derivation_inputs) == "contains_untrusted"
    )


def derive_policy_features(policy_features_source: dict, sink_registry: dict) -> dict:
    sink_id = str(policy_features_source["sink_id"])
    known_sinks = {entry["sink_id"]: entry for entry in sink_registry["sinks"]}
    if sink_id not in known_sinks:
        raise ValueError(f"unknown_sink:{sink_id}")
    return {
        "sink_id": sink_id,
        "consequence_class": known_sinks[sink_id]["default_consequence_class"],
        "requires_authority": bool(policy_features_source.get("requires_authority")),
        "external_effect": bool(policy_features_source.get("external_effect")),
        "user_explicitly_authorised": bool(policy_features_source.get("user_explicitly_authorised")),
    }
