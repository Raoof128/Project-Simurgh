# SPDX-License-Identifier: AGPL-3.0-or-later
from stage4d.derivation import (
    derive_integrity_summary,
    derive_policy_features,
    derive_untrusted_reached_authority,
)
from stage4d.policy import POLICY_BUNDLE, decide, policy_bundle_hash_material


SINK_REGISTRY = {
    "registry_version": "sinks.v1",
    "sinks": [
        {"sink_id": "egress", "default_consequence_class": "external_egress"},
        {
            "sink_id": "destructive_mutation",
            "default_consequence_class": "irreversible_external_effect",
        },
        {"sink_id": "secret_export", "default_consequence_class": "external_egress"},
        {"sink_id": "authority_escalation", "default_consequence_class": "internal_mutation"},
    ],
}


def material(sink_id="egress", label="untrusted_web", authority_sink=True):
    return {
        "policy_features_source": {
            "sink_id": sink_id,
            "input_sources": ["web_context_01", "user_task"],
            "requires_authority": authority_sink,
            "external_effect": sink_id in {"egress", "secret_export"},
            "user_explicitly_authorised": False,
        },
        "taint_derivation_inputs": {
            "sources": [
                {"source_id": "user_task", "label": "trusted"},
                {"source_id": "web_context_01", "label": label},
            ],
            "authority_sink": authority_sink,
        },
        "decision_context": {
            "prior_decision_count": 0,
            "rate_limit_bucket": "fixture_bucket_0",
            "policy_mode": "balanced",
        },
    }


def test_policy_bundle_shape_is_committed_v1():
    assert POLICY_BUNDLE["policy_version"] == "policy.v1"
    assert set(POLICY_BUNDLE["modes"]) == {"permissive", "balanced", "strict"}
    assert policy_bundle_hash_material() == POLICY_BUNDLE


def test_derives_untrusted_integrity_and_authority_state():
    m = material()
    assert derive_integrity_summary(m["taint_derivation_inputs"]) == "contains_untrusted"
    assert derive_untrusted_reached_authority(m["taint_derivation_inputs"]) is True


def test_derives_trusted_only_integrity():
    m = material(label="trusted", authority_sink=True)
    assert derive_integrity_summary(m["taint_derivation_inputs"]) == "trusted_only"
    assert derive_untrusted_reached_authority(m["taint_derivation_inputs"]) is False


def test_derive_policy_features_rejects_unknown_sink():
    m = material("unknown")
    try:
        derive_policy_features(m["policy_features_source"], SINK_REGISTRY)
    except ValueError as exc:
        assert str(exc) == "unknown_sink:unknown"
    else:
        raise AssertionError("expected unknown sink rejection")


def test_decide_blocks_balanced_untrusted_egress():
    m = material("egress")
    decision_input = {"policy_mode": "balanced", "untrusted_reached_authority": True}
    assert decide(POLICY_BUNDLE, decision_input, m, SINK_REGISTRY) == {
        "decision": "block",
        "reason_code": "UNTRUSTED_EGRESS_BLOCKED",
    }


def test_decide_blocks_secret_export_and_authority_escalation():
    assert (
        decide(
            POLICY_BUNDLE,
            {"policy_mode": "balanced", "untrusted_reached_authority": True},
            material("secret_export"),
            SINK_REGISTRY,
        )["reason_code"]
        == "UNTRUSTED_SECRET_EXPORT_BLOCKED"
    )
    assert (
        decide(
            POLICY_BUNDLE,
            {"policy_mode": "balanced", "untrusted_reached_authority": True},
            material("authority_escalation"),
            SINK_REGISTRY,
        )["reason_code"]
        == "AUTHORITY_ESCALATION_BLOCKED"
    )


def test_decide_allows_trusted_destructive_mutation():
    m = material("destructive_mutation", label="trusted")
    decision_input = {"policy_mode": "balanced", "untrusted_reached_authority": False}
    assert decide(POLICY_BUNDLE, decision_input, m, SINK_REGISTRY) == {
        "decision": "allow",
        "reason_code": "POLICY_ALLOWED",
    }
