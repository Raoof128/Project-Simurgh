# SPDX-License-Identifier: AGPL-3.0-or-later
"""Shared Stage 4O Python test builders (mirror of tests/unit/llmShield/stage4o/helpers.mjs).

Leading underscore + no ``test_`` prefix so pytest never collects this module.
Motto: AnthropicSafe First, then ReviewerSafe.
"""
from simurgh_agentdojo_adapter import manifest_surface as ms


def mk_entry(i, **over):
    e = {
        "tool_name_digest": ms.domain_digest(ms.DOMAINS["SERVER_ID"], "test-name", f"tool-{i}"),
        "tool_schema_digest": ms.domain_digest(ms.DOMAINS["SERVER_ID"], "test-schema", f"schema-{i}"),
        "authority_class": "read_only",
        "declared_sinks": [],
        "risk_class": "low",
    }
    e.update(over)
    return e


def mk_manifest(entries):
    tools = sorted(entries, key=lambda t: t["tool_name_digest"])
    m = {
        "schema": ms.TOOL_MANIFEST_SCHEMA,
        "server_id_digest": ms.domain_digest(ms.DOMAINS["SERVER_ID"], "test", "srv"),
        "toolset_digest": "sha256:" + "0" * 64,
        "tools": tools,
    }
    m["toolset_digest"] = ms.compute_toolset_root(m)
    return m


def mk_envelope(manifest, epoch, prev_env, consent):
    return {
        "schema": ms.COMMITMENT_SCHEMA,
        "manifest": manifest,
        "manifest_epoch": epoch,
        "valid_from_epoch": epoch * 10,
        "valid_until_epoch": epoch * 10 + 9,
        "previous_manifest_digest": ms.commitment_digest(prev_env) if prev_env else ms.GENESIS,
        "delta_digest": ms.delta_digest(prev_env["manifest"], manifest) if prev_env else ms.GENESIS,
        "consent_binding": consent,
        "signer_public_key_pem": "PEM",
        "signature": "sig",
    }


def valid_world():
    m0 = mk_manifest([mk_entry(1)])
    m1 = mk_manifest([mk_entry(1), mk_entry(2)])
    e0 = mk_envelope(m0, 0, None, "state")
    e1 = mk_envelope(m1, 1, e0, "delta")
    idx = next(i for i, t in enumerate(m1["tools"]) if t["tool_name_digest"] == mk_entry(1)["tool_name_digest"])
    entry = m1["tools"][idx]
    receipt = {
        "schema": ms.RECEIPT_SCHEMA,
        "tool_name_digest": entry["tool_name_digest"],
        "tool_schema_digest": entry["tool_schema_digest"],
        "authority_class": entry["authority_class"],
        "sinks_used": [],
        "inclusion_proof": ms.surface_path([ms.tool_entry_digest(t) for t in m1["tools"]], idx),
        "run_epoch": 12,
        "run_id_digest": ms.domain_digest(ms.DOMAINS["RECEIPT"], "run", "run-1"),
    }
    return [e0, e1], receipt
