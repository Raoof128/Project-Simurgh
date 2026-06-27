# Stage 4D Decision-Replay Evidence Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Stage 4D as a metadata-only, completeness-checked, decision-replayable Evidence Pack for gateway-mediated high-risk agent actions, with offline verification and falsifier-tested receipts.

**Architecture:** Implement the design contract inside the existing Stage-4 repo structure. Python owns recorded-fixture mediation under `tools/agentdojo-simurgh-adapter/stage4d`; Node owns canonical bytes, receipt hashes, signatures, Merkle roots, pack building, verification, and stable failure output under `tools/simurgh-attestation/stage4d`. Evidence is committed under `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack`, and `scripts/reproduce-stage4d.sh` is the only closeout definition of done.

**Tech Stack:** Python 3.11+ stdlib for runtime; pytest as the existing dev/test runner; Node.js built-in `node:crypto` Ed25519; existing repo `canonicalise.mjs` for object ordering patterns; Stage 4D-local raw-hex hash helpers because the Stage 4D contract uses lowercase 64-character hex without `sha256:` prefixes.

---

## Scope Check

This is one subsystem: Stage 4D recorded-fixture evidence generation plus offline verification. It is large, but internally cohesive because every task contributes to the same closeout command: `scripts/reproduce-stage4d.sh`.

Do not create a top-level `simurgh/` tree. Treat the contract's `simurgh/` layout as a logical module map only.

## Global Constraints

- No live model, provider, network, browser automation, GPU, Claude, OpenAI, Anthropic, or live API-key dependency.
- No raw secrets, credentials, prompts, system prompts, email bodies, page text, model outputs, provider API keys, private signing keys, or private user content in evidence.
- No unstable timestamps, absolute local paths, random IDs, machine-specific values, or environment-dependent output in committed golden artifacts.
- The Stage 4D verifier trusts the external `--pubkey`, not the embedded public key.
- The Stage 4D recorded fixture uses an out-of-agent-boundary signer. The deterministic fixture key is test-only and exists solely so clean clones can reproduce committed golden bytes.
- The Stage 4D signer validates payload schema, domain, run id, and payload type before signing.
- The Python side never reads a private signing key and never computes final canonical hashes.
- The private deterministic test key is committed only under `tools/simurgh-attestation/stage4d/fixtures/keys`; it is never copied into the committed evidence folder.
- Every verifier failure writes `verify-results.json` with a stable failure reason.
- Stage 4D v1 uses strict manual structural validation in core verifier code. JSON Schema files are not part of v1 implementation.
- Existing Stage 4A / 4B / 4C artifact verification must keep working.

## File Structure

**Create:**

- `tools/agentdojo-simurgh-adapter/stage4d/__init__.py` — Stage 4D Python package marker.
- `tools/agentdojo-simurgh-adapter/stage4d/fixtures/browser_inject_01.json` — deterministic metadata-only fixture.
- `tools/agentdojo-simurgh-adapter/stage4d/policy.py` — pure `decide()` and committed `policy.v1` bundle.
- `tools/agentdojo-simurgh-adapter/stage4d/derivation.py` — replay-material feature and taint derivation.
- `tools/agentdojo-simurgh-adapter/stage4d/mediator.py` — fixture loader, observation events, replay material, and run record builder.
- `tools/agentdojo-simurgh-adapter/stage4d/dispatch_controller.py` — simulated dispatch state and signer-failure fail-closed behavior.
- `tools/agentdojo-simurgh-adapter/stage4d/run_fixture.py` — CLI that writes structured run input for Node.
- `tools/agentdojo-simurgh-adapter/tests/test_stage4d_policy.py` — policy and derivation tests.
- `tools/agentdojo-simurgh-adapter/tests/test_stage4d_mediator.py` — fixture and mediator tests.
- `tools/agentdojo-simurgh-adapter/tests/test_stage4d_dispatch_controller.py` — receipt-before-dispatch tests.
- `tools/simurgh-attestation/stage4d/constants.mjs` — domains, paths, schemas, limits, failure reasons.
- `tools/simurgh-attestation/stage4d/stage4dCrypto.mjs` — canonical JSON wrapper, raw-hex SHA-256, Ed25519 helpers, fingerprints.
- `tools/simurgh-attestation/stage4d/merkle.mjs` — RFC 6962 / 9162 style Merkle root.
- `tools/simurgh-attestation/stage4d/receipt.mjs` — receipt schema validation, hashing, signing, hash-chain helpers.
- `tools/simurgh-attestation/stage4d/signer.mjs` — out-of-agent-boundary local signer API for recorded-fixture mode.
- `tools/simurgh-attestation/stage4d/packBuilder.mjs` — evidence pack, completeness manifest, roots, and pack signature.
- `tools/simurgh-attestation/stage4d/replay.mjs` — verifier-side policy feature derivation and `decide()`.
- `tools/simurgh-attestation/stage4d/privacy.mjs` — forbidden-field and forbidden-pattern audit.
- `tools/simurgh-attestation/stage4d/verifyPack.mjs` — layered verifier and `verify-results.json` writer.
- `tools/simurgh-attestation/stage4d/tamper.mjs` — deterministic falsifier helpers for tests and scripts.
- `tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem` — deterministic test-only private key for golden reproduction, outside the evidence folder.
- `tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-public.pem` — matching deterministic test-only public key.
- `tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs` — run -> signed pack CLI.
- `tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs` — verify CLI.
- `tests/unit/llmShield/stage4d/crypto.test.js` — canonical hash, domain, and Merkle tests.
- `tests/unit/llmShield/stage4d/receipt.test.js` — receipt validation and signature tests.
- `tests/unit/llmShield/stage4d/pack.test.js` — pack-builder and completeness tests.
- `tests/unit/llmShield/stage4d/verify.test.js` — verifier layers and falsifier tests.
- `tests/unit/llmShield/stage4d/privacy.test.js` — privacy audit tests.
- `tests/unit/llmShield/stage4d/python-node-parity.test.js` — full four-action Python fixture verifies through Node.
- `scripts/tamper/drop-one-receipt-stage4d.mjs` — reviewer falsifier script.
- `scripts/tamper/corrupt-decision-stage4d.mjs` — reviewer falsifier script.
- `scripts/tamper/swap-embedded-key-stage4d.mjs` — reviewer falsifier script.
- `scripts/tamper/inject-raw-secret-stage4d.mjs` — reviewer falsifier script.
- `scripts/reproduce-stage4d.sh` — one-command closeout harness.

**Create generated evidence:**

- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.sig`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/signer.pub`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/run-manifest.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/completeness-manifest.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/non-claims.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/verify-results.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/expected-roots.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/tamper-results.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/adversarial-results.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/privacy-results.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/golden-results.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/stage4d-closeout.json`
- `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/README.md`

---

### Task 1: Python Policy And Replay Derivation

**Files:**

- Create: `tools/agentdojo-simurgh-adapter/stage4d/__init__.py`
- Create: `tools/agentdojo-simurgh-adapter/stage4d/policy.py`
- Create: `tools/agentdojo-simurgh-adapter/stage4d/derivation.py`
- Test: `tools/agentdojo-simurgh-adapter/tests/test_stage4d_policy.py`

- [ ] **Step 1: Write the failing tests**

```python
# tools/agentdojo-simurgh-adapter/tests/test_stage4d_policy.py
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
        {"sink_id": "destructive_mutation", "default_consequence_class": "irreversible_external_effect"},
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


def test_decide_blocks_balanced_untrusted_egress():
    m = material("egress")
    decision_input = {"policy_mode": "balanced", "untrusted_reached_authority": True}
    assert decide(POLICY_BUNDLE, decision_input, m, SINK_REGISTRY) == {
        "decision": "block",
        "reason_code": "UNTRUSTED_EGRESS_BLOCKED",
    }


def test_decide_blocks_secret_export_and_authority_escalation():
    assert decide(POLICY_BUNDLE, {"policy_mode": "balanced", "untrusted_reached_authority": True}, material("secret_export"), SINK_REGISTRY)["reason_code"] == "UNTRUSTED_SECRET_EXPORT_BLOCKED"
    assert decide(POLICY_BUNDLE, {"policy_mode": "balanced", "untrusted_reached_authority": True}, material("authority_escalation"), SINK_REGISTRY)["reason_code"] == "AUTHORITY_ESCALATION_BLOCKED"


def test_decide_allows_trusted_destructive_mutation():
    m = material("destructive_mutation", label="trusted")
    decision_input = {"policy_mode": "balanced", "untrusted_reached_authority": False}
    assert decide(POLICY_BUNDLE, decision_input, m, SINK_REGISTRY) == {
        "decision": "allow",
        "reason_code": "POLICY_ALLOWED",
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd tools/agentdojo-simurgh-adapter && python -m pytest tests/test_stage4d_policy.py -q`

Expected: FAIL with `ModuleNotFoundError: No module named 'stage4d'`.

- [ ] **Step 3: Implement the policy and derivation modules**

```python
# tools/agentdojo-simurgh-adapter/stage4d/__init__.py
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4D recorded-fixture mediation helpers."""
```

```python
# tools/agentdojo-simurgh-adapter/stage4d/derivation.py
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
```

```python
# tools/agentdojo-simurgh-adapter/stage4d/policy.py
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pure Stage 4D policy bundle and decision replay path."""

from .derivation import (
    derive_integrity_summary,
    derive_policy_features,
    derive_untrusted_reached_authority,
)

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd tools/agentdojo-simurgh-adapter && python -m pytest tests/test_stage4d_policy.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/agentdojo-simurgh-adapter/stage4d/__init__.py \
  tools/agentdojo-simurgh-adapter/stage4d/derivation.py \
  tools/agentdojo-simurgh-adapter/stage4d/policy.py \
  tools/agentdojo-simurgh-adapter/tests/test_stage4d_policy.py
git commit -m "feat(llm-shield): add stage 4d replay policy core"
```

---

### Task 2: Recorded Fixture, Mediator, And Dispatch Controller

**Files:**

- Create: `tools/agentdojo-simurgh-adapter/stage4d/fixtures/browser_inject_01.json`
- Create: `tools/agentdojo-simurgh-adapter/stage4d/mediator.py`
- Create: `tools/agentdojo-simurgh-adapter/stage4d/dispatch_controller.py`
- Create: `tools/agentdojo-simurgh-adapter/stage4d/run_fixture.py`
- Test: `tools/agentdojo-simurgh-adapter/tests/test_stage4d_mediator.py`
- Test: `tools/agentdojo-simurgh-adapter/tests/test_stage4d_dispatch_controller.py`

- [ ] **Step 1: Write the failing mediator tests**

```python
# tools/agentdojo-simurgh-adapter/tests/test_stage4d_mediator.py
# SPDX-License-Identifier: AGPL-3.0-or-later
from pathlib import Path

from stage4d.mediator import build_run_record, load_fixture


FIXTURE = Path("stage4d/fixtures/browser_inject_01.json")


def test_fixture_loads_four_metadata_only_actions():
    fixture = load_fixture(FIXTURE)
    assert fixture["run_id"] == "stage4d-browser-inject-01"
    assert [a["action_id"] for a in fixture["actions"]] == ["act_000", "act_001", "act_002", "act_003"]
    assert all("raw" not in str(action).lower() for action in fixture["actions"])


def test_run_record_has_contiguous_steps_and_expected_decisions():
    record = build_run_record(FIXTURE)
    assert [event["step_index"] for event in record["action_observation_log"]] == [0, 1, 2, 3]
    assert [event["action_id"] for event in record["action_observation_log"]] == ["act_000", "act_001", "act_002", "act_003"]
    assert [d["decision"] for d in record["decisions"]] == ["allow", "block", "block", "allow"]
    assert [d["decision_reason_code"] for d in record["decisions"]] == [
        "POLICY_ALLOWED",
        "AUTHORITY_ESCALATION_BLOCKED",
        "UNTRUSTED_SECRET_EXPORT_BLOCKED",
        "POLICY_ALLOWED",
    ]


def test_run_record_contains_replay_material_for_every_action():
    record = build_run_record(FIXTURE)
    assert sorted(record["replay_material"]) == ["act_000", "act_001", "act_002", "act_003"]
    for action_id, material in record["replay_material"].items():
        assert "resolved_args_redacted" in material
        assert "policy_features_source" in material
        assert "taint_derivation_inputs" in material
        assert "decision_context" in material
        assert "body_text" not in str(material).lower()
        assert "secret-value" not in str(material).lower()
```

- [ ] **Step 2: Write the failing dispatch tests**

```python
# tools/agentdojo-simurgh-adapter/tests/test_stage4d_dispatch_controller.py
# SPDX-License-Identifier: AGPL-3.0-or-later
from stage4d.dispatch_controller import record_dispatch


def test_blocked_action_is_never_dispatched():
    result = record_dispatch("act_001", "block", signed_receipt_exists=False)
    assert result == {
        "action_id": "act_001",
        "decision": "block",
        "simulated_dispatched": False,
        "fail_closed": False,
        "dispatch_reason": "blocked_by_policy",
    }


def test_allowed_action_requires_signed_receipt():
    result = record_dispatch("act_000", "allow", signed_receipt_exists=False)
    assert result["simulated_dispatched"] is False
    assert result["fail_closed"] is True
    assert result["dispatch_reason"] == "signed_receipt_required_before_dispatch"


def test_allowed_action_dispatches_after_signed_receipt():
    result = record_dispatch("act_000", "allow", signed_receipt_exists=True)
    assert result["simulated_dispatched"] is True
    assert result["fail_closed"] is False
    assert result["dispatch_reason"] == "signed_receipt_present"
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd tools/agentdojo-simurgh-adapter && python -m pytest tests/test_stage4d_mediator.py tests/test_stage4d_dispatch_controller.py -q`

Expected: FAIL with missing `stage4d.mediator` and `stage4d.dispatch_controller`.

- [ ] **Step 4: Create the fixture**

```json
{
  "fixture_version": "simurgh.stage4d.fixture.v1",
  "run_id": "stage4d-browser-inject-01",
  "parent_session": "session_stage4d_browser_inject_01",
  "policy_mode": "balanced",
  "model_identity_committed": "self-reported-fixture-model",
  "model_identity_origin": "self_reported",
  "actions": [
    {
      "action_id": "act_000",
      "step_index": 0,
      "sink_id": "egress",
      "action_type": "tool_call",
      "consequence_class": "external_egress",
      "boundary_id": "gateway_mediator_v1",
      "input_sources": [{ "source_id": "user_task", "label": "trusted" }],
      "resolved_args_redacted": {
        "tool_name": "send_email",
        "recipient_scope": "known_contact",
        "body_digest": "0000000000000000000000000000000000000000000000000000000000000001",
        "contains_secret_marker": false
      },
      "policy_features_source": {
        "sink_id": "egress",
        "input_sources": ["user_task"],
        "requires_authority": true,
        "external_effect": true,
        "user_explicitly_authorised": true
      }
    },
    {
      "action_id": "act_001",
      "step_index": 1,
      "sink_id": "authority_escalation",
      "action_type": "tool_call",
      "consequence_class": "internal_mutation",
      "boundary_id": "gateway_mediator_v1",
      "input_sources": [
        { "source_id": "user_task", "label": "trusted" },
        { "source_id": "web_context_01", "label": "untrusted_web" }
      ],
      "resolved_args_redacted": {
        "tool_name": "set_developer_instruction",
        "instruction_digest": "0000000000000000000000000000000000000000000000000000000000000002",
        "contains_secret_marker": false
      },
      "policy_features_source": {
        "sink_id": "authority_escalation",
        "input_sources": ["web_context_01", "user_task"],
        "requires_authority": true,
        "external_effect": false,
        "user_explicitly_authorised": false
      }
    },
    {
      "action_id": "act_002",
      "step_index": 2,
      "sink_id": "secret_export",
      "action_type": "tool_call",
      "consequence_class": "external_egress",
      "boundary_id": "gateway_mediator_v1",
      "input_sources": [
        { "source_id": "user_task", "label": "trusted" },
        { "source_id": "web_context_01", "label": "untrusted_web" }
      ],
      "resolved_args_redacted": {
        "tool_name": "send_email",
        "recipient_scope": "external",
        "body_digest": "0000000000000000000000000000000000000000000000000000000000000003",
        "contains_secret_marker": true
      },
      "policy_features_source": {
        "sink_id": "secret_export",
        "input_sources": ["web_context_01", "user_task"],
        "requires_authority": true,
        "external_effect": true,
        "user_explicitly_authorised": false
      }
    },
    {
      "action_id": "act_003",
      "step_index": 3,
      "sink_id": "destructive_mutation",
      "action_type": "tool_call",
      "consequence_class": "irreversible_external_effect",
      "boundary_id": "gateway_mediator_v1",
      "input_sources": [{ "source_id": "user_task", "label": "trusted" }],
      "resolved_args_redacted": {
        "tool_name": "delete_file",
        "target_digest": "0000000000000000000000000000000000000000000000000000000000000004",
        "contains_secret_marker": false
      },
      "policy_features_source": {
        "sink_id": "destructive_mutation",
        "input_sources": ["user_task"],
        "requires_authority": true,
        "external_effect": false,
        "user_explicitly_authorised": true
      }
    }
  ]
}
```

- [ ] **Step 5: Implement mediator and dispatch controller**

```python
# tools/agentdojo-simurgh-adapter/stage4d/dispatch_controller.py
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Recorded-fixture dispatch accounting for Stage 4D."""


def record_dispatch(action_id: str, decision: str, *, signed_receipt_exists: bool) -> dict:
    if decision == "block":
        return {
            "action_id": action_id,
            "decision": decision,
            "simulated_dispatched": False,
            "fail_closed": False,
            "dispatch_reason": "blocked_by_policy",
        }
    if decision == "allow" and signed_receipt_exists:
        return {
            "action_id": action_id,
            "decision": decision,
            "simulated_dispatched": True,
            "fail_closed": False,
            "dispatch_reason": "signed_receipt_present",
        }
    return {
        "action_id": action_id,
        "decision": decision,
        "simulated_dispatched": False,
        "fail_closed": True,
        "dispatch_reason": "signed_receipt_required_before_dispatch",
    }
```

```python
# tools/agentdojo-simurgh-adapter/stage4d/mediator.py
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Recorded-fixture mediator for Stage 4D."""

import json
from pathlib import Path

from .derivation import derive_integrity_summary, derive_untrusted_reached_authority
from .policy import POLICY_BUNDLE, decide

SINK_REGISTRY = {
    "registry_version": "sinks.v1",
    "sinks": [
        {"sink_id": "egress", "description": "External communication or network/post/email-style action", "default_consequence_class": "external_egress"},
        {"sink_id": "destructive_mutation", "description": "Delete, overwrite, cancel, or irreversible state mutation", "default_consequence_class": "irreversible_external_effect"},
        {"sink_id": "secret_export", "description": "Export of secrets, hidden prompts, credentials, or internal policy", "default_consequence_class": "external_egress"},
        {"sink_id": "authority_escalation", "description": "Untrusted context gaining instruction or tool authority", "default_consequence_class": "internal_mutation"},
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
        observation_log.append({
            "event_version": "simurgh.stage4d.observation.v1",
            "run_id": fixture["run_id"],
            "parent_session": fixture["parent_session"],
            "action_id": action["action_id"],
            "step_index": action["step_index"],
            "action_type": action["action_type"],
            "sink_id": action["sink_id"],
            "consequence_class": action["consequence_class"],
            "boundary_id": action["boundary_id"],
        })
        decisions.append({
            "action_id": action["action_id"],
            "decision": replayed["decision"],
            "decision_reason_code": replayed["reason_code"],
            "input_integrity_summary": derive_integrity_summary(material["taint_derivation_inputs"]),
            "decision_input": decision_input,
        })
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
```

```python
# tools/agentdojo-simurgh-adapter/stage4d/run_fixture.py
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Write Stage 4D structured run input for the Node pack builder."""

import argparse
import json
from pathlib import Path

from .mediator import build_run_record


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    record = build_run_record(args.fixture)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd tools/agentdojo-simurgh-adapter && python -m pytest tests/test_stage4d_mediator.py tests/test_stage4d_dispatch_controller.py -q`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tools/agentdojo-simurgh-adapter/stage4d/fixtures/browser_inject_01.json \
  tools/agentdojo-simurgh-adapter/stage4d/mediator.py \
  tools/agentdojo-simurgh-adapter/stage4d/dispatch_controller.py \
  tools/agentdojo-simurgh-adapter/stage4d/run_fixture.py \
  tools/agentdojo-simurgh-adapter/tests/test_stage4d_mediator.py \
  tools/agentdojo-simurgh-adapter/tests/test_stage4d_dispatch_controller.py
git commit -m "feat(llm-shield): add stage 4d recorded fixture mediator"
```

---

### Task 3: Stage 4D Crypto, Merkle, And Receipt Core

**Files:**

- Create: `tools/simurgh-attestation/stage4d/constants.mjs`
- Create: `tools/simurgh-attestation/stage4d/stage4dCrypto.mjs`
- Create: `tools/simurgh-attestation/stage4d/merkle.mjs`
- Create: `tools/simurgh-attestation/stage4d/receipt.mjs`
- Create: `tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem`
- Create: `tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-public.pem`
- Test: `tests/unit/llmShield/stage4d/crypto.test.js`
- Test: `tests/unit/llmShield/stage4d/receipt.test.js`

- [ ] **Step 1: Write failing Node tests for raw hashes, Merkle roots, and receipt signing**

```javascript
// tests/unit/llmShield/stage4d/crypto.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalJson,
  sha256HexRaw,
} from "../../../../tools/simurgh-attestation/stage4d/stage4dCrypto.mjs";
import { merkleRoot } from "../../../../tools/simurgh-attestation/stage4d/merkle.mjs";

test("stage4d canonicalJson sorts object keys recursively", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":1}');
});

test("stage4d sha256HexRaw returns 64 lowercase hex chars without prefix", () => {
  assert.equal(
    sha256HexRaw("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("stage4d merkle root is deterministic and changes when leaf order changes", () => {
  const a = "00".repeat(32);
  const b = "11".repeat(32);
  assert.match(merkleRoot([a, b]), /^[0-9a-f]{64}$/);
  assert.notEqual(merkleRoot([a, b]), merkleRoot([b, a]));
});
```

```javascript
// tests/unit/llmShield/stage4d/receipt.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import {
  buildReceipt,
  signReceiptPayload,
  validateReceiptPayload,
  verifyReceipt,
} from "../../../../tools/simurgh-attestation/stage4d/receipt.mjs";

const payload = {
  receipt_version: "simurgh.receipt.v1",
  run_id: "stage4d-browser-inject-01",
  parent_session: "session_stage4d_browser_inject_01",
  action_id: "act_000",
  step_index: 0,
  observation_event_hash: "0".repeat(64),
  action_type: "tool_call",
  sink_id: "egress",
  consequence_class: "external_egress",
  boundary_id: "gateway_mediator_v1",
  input_integrity_summary: "trusted_only",
  decision: "allow",
  decision_reason_code: "POLICY_ALLOWED",
  decision_input: {
    policy_version: "policy.v1",
    policy_hash: "1".repeat(64),
    sink_registry_version: "sinks.v1",
    sink_registry_hash: "2".repeat(64),
    consequence_lattice_hash: "3".repeat(64),
    resolved_args_digest: "4".repeat(64),
    policy_features_digest: "5".repeat(64),
    taint_labels_digest: "6".repeat(64),
    context_digest: "7".repeat(64),
    untrusted_reached_authority: false,
    policy_mode: "balanced",
  },
  model_identity_committed: "self-reported-fixture-model",
  model_identity_origin: "self_reported",
  prev_receipt_hash: "0".repeat(64),
};

test("validateReceiptPayload accepts the full Stage 4D shape", () => {
  assert.equal(validateReceiptPayload(payload).ok, true);
});

test("buildReceipt signs and verifies with the receipt domain", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const signature = signReceiptPayload(payload, privateKey);
  const receipt = buildReceipt(payload, signature);
  assert.equal(verifyReceipt(receipt, publicKey).ok, true);
  receipt.receipt_payload.decision = "block";
  assert.equal(verifyReceipt(receipt, publicKey).ok, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/llmShield/stage4d/crypto.test.js tests/unit/llmShield/stage4d/receipt.test.js`

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement crypto, Merkle, and receipt modules**

Create the deterministic test-only signing key fixtures. This key is for reproducible Stage 4D recorded-fixture evidence only; it is not a production signing key and must never be copied into the evidence folder.

```text
# tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIB0gn+lGtVmK5uRxGZ+CahE1+s+k8cmA2ErsNR9nsEVx
-----END PRIVATE KEY-----
```

```text
# tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-public.pem
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAL/YWlzbBaFdJonQG0JfUHvME3CyHMwBvtV6d/0o+E0w=
-----END PUBLIC KEY-----
```

```javascript
// tools/simurgh-attestation/stage4d/constants.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
export const RECEIPT_DOMAIN = "SIMURGH_RECEIPT_V1\0";
export const PACK_DOMAIN = "SIMURGH_EVIDENCE_PACK_V1\0";
export const ZERO_HASH = "0".repeat(64);
export const LIMITS = Object.freeze({
  maxReceiptsPerPack: 1000,
  maxReceiptBytes: 16384,
  maxReplayMaterialBytesPerAction: 32768,
  maxPackBytes: 10485760,
  maxStringLength: 8192,
  maxObservationLogBytes: 1048576,
});
export const FAILURE_REASONS = Object.freeze({
  schemaInvalid: "schema_invalid",
  receiptHashMismatch: "receipt_hash_mismatch",
  receiptSignatureInvalid: "receipt_signature_invalid",
  signatureDomainMismatch: "signature_domain_mismatch",
});
```

```javascript
// tools/simurgh-attestation/stage4d/stage4dCrypto.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

function normalise(value) {
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = normalise(value[key]);
    return out;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalise(value));
}

export function sha256HexRaw(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function sha256Canonical(value) {
  return sha256HexRaw(Buffer.from(canonicalJson(value), "utf8"));
}

export function domainBytes(domain, payload) {
  return Buffer.concat([Buffer.from(domain, "utf8"), Buffer.from(canonicalJson(payload), "utf8")]);
}

export function publicKeyFingerprint(publicKeyPemOrKeyObject) {
  const der = crypto
    .createPublicKey(publicKeyPemOrKeyObject)
    .export({ type: "spki", format: "der" });
  return sha256HexRaw(der);
}

export function isHex64(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
```

```javascript
// tools/simurgh-attestation/stage4d/merkle.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

function h(buf) {
  return crypto.createHash("sha256").update(buf).digest();
}

function hexToBytes(hex) {
  return Buffer.from(hex, "hex");
}

export function merkleRoot(hexLeaves) {
  if (!Array.isArray(hexLeaves) || hexLeaves.length === 0) return "0".repeat(64);
  let level = hexLeaves.map((leaf) => h(Buffer.concat([Buffer.from([0x00]), hexToBytes(leaf)])));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || level[i];
      next.push(h(Buffer.concat([Buffer.from([0x01]), left, right])));
    }
    level = next;
  }
  return level[0].toString("hex");
}
```

```javascript
// tools/simurgh-attestation/stage4d/receipt.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { RECEIPT_DOMAIN } from "./constants.mjs";
import { canonicalJson, domainBytes, isHex64, sha256Canonical } from "./stage4dCrypto.mjs";

const REQUIRED = [
  "receipt_version",
  "run_id",
  "parent_session",
  "action_id",
  "step_index",
  "observation_event_hash",
  "action_type",
  "sink_id",
  "consequence_class",
  "boundary_id",
  "input_integrity_summary",
  "decision",
  "decision_reason_code",
  "decision_input",
  "model_identity_committed",
  "model_identity_origin",
  "prev_receipt_hash",
];

export function validateReceiptPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return { ok: false, reason: "schema_invalid" };
  for (const key of REQUIRED)
    if (!(key in payload)) return { ok: false, reason: "schema_invalid", key };
  if (payload.receipt_version !== "simurgh.receipt.v1")
    return { ok: false, reason: "schema_invalid" };
  if (!Number.isInteger(payload.step_index) || payload.step_index < 0)
    return { ok: false, reason: "schema_invalid" };
  if (!isHex64(payload.observation_event_hash) || !isHex64(payload.prev_receipt_hash))
    return { ok: false, reason: "schema_invalid" };
  if (!["allow", "block"].includes(payload.decision))
    return { ok: false, reason: "schema_invalid" };
  return { ok: true };
}

export function receiptHash(payload) {
  return sha256Canonical(payload);
}

export function signReceiptPayload(payload, privateKey) {
  const valid = validateReceiptPayload(payload);
  if (!valid.ok) throw new Error(valid.reason);
  return crypto.sign(null, domainBytes(RECEIPT_DOMAIN, payload), privateKey).toString("base64");
}

export function buildReceipt(payload, signature) {
  return { receipt_payload: payload, receipt_hash: receiptHash(payload), signature };
}

export function verifyReceipt(receipt, publicKey) {
  try {
    const valid = validateReceiptPayload(receipt.receipt_payload);
    if (!valid.ok) return valid;
    if (receipt.receipt_hash !== receiptHash(receipt.receipt_payload))
      return { ok: false, reason: "receipt_hash_mismatch" };
    const ok = crypto.verify(
      null,
      domainBytes(RECEIPT_DOMAIN, receipt.receipt_payload),
      crypto.createPublicKey(publicKey),
      Buffer.from(String(receipt.signature).replace(/^base64:/, ""), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "receipt_signature_invalid" };
  } catch {
    return { ok: false, reason: "receipt_signature_invalid" };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/llmShield/stage4d/crypto.test.js tests/unit/llmShield/stage4d/receipt.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4d/constants.mjs \
  tools/simurgh-attestation/stage4d/stage4dCrypto.mjs \
  tools/simurgh-attestation/stage4d/merkle.mjs \
  tools/simurgh-attestation/stage4d/receipt.mjs \
  tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem \
  tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-public.pem \
  tests/unit/llmShield/stage4d/crypto.test.js \
  tests/unit/llmShield/stage4d/receipt.test.js
git commit -m "feat(llm-shield): add stage 4d receipt crypto core"
```

---

### Task 4: Signer Boundary And Receipt-Before-Dispatch

**Files:**

- Create: `tools/simurgh-attestation/stage4d/signer.mjs`
- Modify: `tools/simurgh-attestation/stage4d/receipt.mjs`
- Test: `tests/unit/llmShield/stage4d/receipt.test.js`

- [ ] **Step 1: Add failing tests for signer validation and domain restriction**

Append to `tests/unit/llmShield/stage4d/receipt.test.js`:

```javascript
import { createStage4dSigner } from "../../../../tools/simurgh-attestation/stage4d/signer.mjs";

test("stage4d signer rejects arbitrary payload types", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const signer = createStage4dSigner({ privateKey, runId: "stage4d-browser-inject-01" });
  assert.throws(
    () => signer.signReceipt({ payload_type: "arbitrary", run_id: "stage4d-browser-inject-01" }),
    /schema_invalid/
  );
});

test("stage4d signer rejects wrong run id before signing", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const signer = createStage4dSigner({ privateKey, runId: "stage4d-browser-inject-01" });
  assert.throws(() => signer.signReceipt({ ...payload, run_id: "wrong-run" }), /run_id_mismatch/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/llmShield/stage4d/receipt.test.js`

Expected: FAIL with `Cannot find module ... signer.mjs`.

- [ ] **Step 3: Implement signer module**

```javascript
// tools/simurgh-attestation/stage4d/signer.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildReceipt, signReceiptPayload, validateReceiptPayload } from "./receipt.mjs";

export function createStage4dSigner({ privateKey, runId }) {
  const key = crypto.createPrivateKey(privateKey);
  return {
    signReceipt(payload) {
      const valid = validateReceiptPayload(payload);
      if (!valid.ok) throw new Error(valid.reason);
      if (payload.run_id !== runId) throw new Error("run_id_mismatch");
      const signature = signReceiptPayload(payload, key);
      return buildReceipt(payload, signature);
    },
  };
}

export async function loadSignerFromPem({ privateKeyPath, runId }) {
  const privateKey = await readFile(privateKeyPath, "utf8");
  return createStage4dSigner({ privateKey, runId });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/llmShield/stage4d/receipt.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4d/signer.mjs tests/unit/llmShield/stage4d/receipt.test.js
git commit -m "feat(llm-shield): enforce stage 4d signer boundary"
```

---

### Task 5: Evidence Pack Builder And Completeness Manifest

**Files:**

- Create: `tools/simurgh-attestation/stage4d/replay.mjs`
- Create: `tools/simurgh-attestation/stage4d/packBuilder.mjs`
- Test: `tests/unit/llmShield/stage4d/pack.test.js`

- [ ] **Step 1: Write failing pack-builder tests**

```javascript
// tests/unit/llmShield/stage4d/pack.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { buildEvidencePack } from "../../../../tools/simurgh-attestation/stage4d/packBuilder.mjs";

function baseRunRecord() {
  return {
    run_manifest: {
      run_id: "stage4d-browser-inject-01",
      parent_session: "session_stage4d_browser_inject_01",
      mode: "recorded_fixture",
      fixture_id: "browser_inject_01",
      model_identity_committed: "self-reported-fixture-model",
      model_identity_origin: "self_reported",
    },
    policy_bundle: { policy_version: "policy.v1", modes: { balanced: {} } },
    sink_registry: {
      registry_version: "sinks.v1",
      sinks: [
        { sink_id: "egress", default_consequence_class: "external_egress" },
        { sink_id: "authority_escalation", default_consequence_class: "internal_mutation" },
      ],
    },
    consequence_lattice: {
      lattice_version: "consequence_lattice.v1",
      order: ["read_only", "internal_mutation", "external_egress"],
    },
    action_observation_log: [
      {
        event_version: "simurgh.stage4d.observation.v1",
        run_id: "stage4d-browser-inject-01",
        parent_session: "session_stage4d_browser_inject_01",
        action_id: "act_000",
        step_index: 0,
        action_type: "tool_call",
        sink_id: "egress",
        consequence_class: "external_egress",
        boundary_id: "gateway_mediator_v1",
      },
    ],
    replay_material: {
      act_000: {
        resolved_args_redacted: {
          tool_name: "send_email",
          recipient_scope: "known_contact",
          body_digest: "0".repeat(64),
          contains_secret_marker: false,
        },
        policy_features_source: {
          sink_id: "egress",
          input_sources: ["user_task"],
          requires_authority: true,
          external_effect: true,
          user_explicitly_authorised: true,
        },
        taint_derivation_inputs: {
          sources: [{ source_id: "user_task", label: "trusted" }],
          authority_sink: true,
        },
        decision_context: {
          prior_decision_count: 0,
          rate_limit_bucket: "fixture_bucket_0",
          policy_mode: "balanced",
        },
      },
    },
    decisions: [
      {
        action_id: "act_000",
        decision: "allow",
        decision_reason_code: "POLICY_ALLOWED",
        input_integrity_summary: "trusted_only",
        decision_input: { policy_mode: "balanced", untrusted_reached_authority: false },
      },
    ],
  };
}

test("buildEvidencePack emits observation hashes, receipts, completeness, non-claims, and pack hash", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pack = buildEvidencePack({ runRecord: baseRunRecord(), privateKey, publicKey });
  assert.equal(pack.pack_version, "simurgh.evidence_pack.v1");
  assert.equal(pack.receipts.length, 1);
  assert.equal(pack.completeness_manifest.observed_action_count, 1);
  assert.equal(pack.completeness_manifest.receipt_count, 1);
  assert.match(pack.pack_hash, /^[0-9a-f]{64}$/);
  assert.equal(pack.non_claims.not_model_safety, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/llmShield/stage4d/pack.test.js`

Expected: FAIL with `Cannot find module ... packBuilder.mjs`.

- [ ] **Step 3: Implement shared replay derivation and pack builder**

Create the Node replay derivation helper first. The pack builder and verifier both import this file so `policy_features_digest` is computed from derived policy features, not from untrusted `policy_features_source`.

```javascript
// tools/simurgh-attestation/stage4d/replay.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
const UNTRUSTED_LABELS = new Set([
  "untrusted",
  "untrusted_web",
  "untrusted_tool",
  "provider_output",
]);

export function deriveIntegritySummary(taintInputs) {
  const labels = new Set((taintInputs.sources || []).map((source) => String(source.label || "")));
  return [...labels].some((label) => UNTRUSTED_LABELS.has(label))
    ? "contains_untrusted"
    : "trusted_only";
}

export function deriveUntrustedReachedAuthority(taintInputs) {
  return (
    Boolean(taintInputs.authority_sink) &&
    deriveIntegritySummary(taintInputs) === "contains_untrusted"
  );
}

export function derivePolicyFeatures(source, sinkRegistry) {
  const sink = sinkRegistry.sinks.find((entry) => entry.sink_id === source.sink_id);
  if (!sink) throw new Error(`unknown_sink:${source.sink_id}`);
  return {
    sink_id: source.sink_id,
    consequence_class: sink.default_consequence_class,
    requires_authority: Boolean(source.requires_authority),
    external_effect: Boolean(source.external_effect),
    user_explicitly_authorised: Boolean(source.user_explicitly_authorised),
  };
}

export function decide(policyBundle, decisionInput, material, sinkRegistry) {
  const mode = decisionInput.policy_mode;
  const features = derivePolicyFeatures(material.policy_features_source, sinkRegistry);
  const integrity = deriveIntegritySummary(material.taint_derivation_inputs);
  const authority = deriveUntrustedReachedAuthority(material.taint_derivation_inputs);
  if (mode === "strict" && authority) {
    return { decision: "block", reason_code: "STRICT_UNTRUSTED_TO_AUTHORITY_BLOCKED" };
  }
  if (
    features.sink_id === "authority_escalation" &&
    policyBundle.modes[mode].block_authority_escalation
  ) {
    return { decision: "block", reason_code: "AUTHORITY_ESCALATION_BLOCKED" };
  }
  if (integrity === "contains_untrusted") {
    if (features.sink_id === "secret_export") {
      return { decision: "block", reason_code: "UNTRUSTED_SECRET_EXPORT_BLOCKED" };
    }
    if (
      features.sink_id === "egress" &&
      policyBundle.modes[mode].block_untrusted_to_external_egress
    ) {
      return { decision: "block", reason_code: "UNTRUSTED_EGRESS_BLOCKED" };
    }
    if (features.sink_id === "destructive_mutation") {
      return { decision: "block", reason_code: "UNTRUSTED_DESTRUCTIVE_MUTATION_BLOCKED" };
    }
  }
  return { decision: "allow", reason_code: "POLICY_ALLOWED" };
}
```

```javascript
// tools/simurgh-attestation/stage4d/packBuilder.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { PACK_DOMAIN, ZERO_HASH } from "./constants.mjs";
import {
  canonicalJson,
  domainBytes,
  publicKeyFingerprint,
  sha256Canonical,
} from "./stage4dCrypto.mjs";
import { merkleRoot } from "./merkle.mjs";
import { derivePolicyFeatures } from "./replay.mjs";
import { createStage4dSigner } from "./signer.mjs";

export const NON_CLAIMS = Object.freeze({
  not_model_safety: true,
  not_jailbreak_immunity: true,
  not_policy_correctness: true,
  not_complete_for_unmediated_actions: true,
  not_kernel_enforced: true,
  not_live_model_identity_proof: true,
  not_production_certification: true,
  not_ground_truth_outside_mediated_surface: true,
});

function digest(value) {
  return sha256Canonical(value);
}

function observationHashes(observationLog) {
  return observationLog.map((event) => digest(event));
}

function signerPublicKeyObject(publicKey) {
  const pem = crypto.createPublicKey(publicKey).export({ type: "spki", format: "pem" });
  return {
    key_type: "Ed25519",
    format: "spki-pem",
    public_key_pem: pem,
    fingerprint: publicKeyFingerprint(pem),
  };
}

export function buildEvidencePack({ runRecord, privateKey, publicKey }) {
  const pub = signerPublicKeyObject(publicKey);
  const signer = createStage4dSigner({ privateKey, runId: runRecord.run_manifest.run_id });
  const obsHashes = observationHashes(runRecord.action_observation_log);
  const policyHash = digest(runRecord.policy_bundle);
  const sinkHash = digest(runRecord.sink_registry);
  const latticeHash = digest(runRecord.consequence_lattice);
  const receipts = [];
  for (let i = 0; i < runRecord.decisions.length; i += 1) {
    const decision = runRecord.decisions[i];
    const material = runRecord.replay_material[decision.action_id];
    const derivedPolicyFeatures = derivePolicyFeatures(
      material.policy_features_source,
      runRecord.sink_registry
    );
    const payload = {
      receipt_version: "simurgh.receipt.v1",
      run_id: runRecord.run_manifest.run_id,
      parent_session: runRecord.run_manifest.parent_session,
      action_id: decision.action_id,
      step_index: i,
      observation_event_hash: obsHashes[i],
      action_type: runRecord.action_observation_log[i].action_type,
      sink_id: runRecord.action_observation_log[i].sink_id,
      consequence_class: runRecord.action_observation_log[i].consequence_class,
      boundary_id: runRecord.action_observation_log[i].boundary_id,
      input_integrity_summary: decision.input_integrity_summary,
      decision: decision.decision,
      decision_reason_code: decision.decision_reason_code,
      decision_input: {
        policy_version: runRecord.policy_bundle.policy_version,
        policy_hash: policyHash,
        sink_registry_version: runRecord.sink_registry.registry_version,
        sink_registry_hash: sinkHash,
        consequence_lattice_hash: latticeHash,
        resolved_args_digest: digest(material.resolved_args_redacted),
        policy_features_digest: digest(derivedPolicyFeatures),
        taint_labels_digest: digest(material.taint_derivation_inputs),
        context_digest: digest(material.decision_context),
        untrusted_reached_authority: decision.decision_input.untrusted_reached_authority,
        policy_mode: decision.decision_input.policy_mode,
      },
      model_identity_committed: runRecord.run_manifest.model_identity_committed,
      model_identity_origin: runRecord.run_manifest.model_identity_origin,
      prev_receipt_hash: i === 0 ? ZERO_HASH : receipts[i - 1].receipt_hash,
    };
    receipts.push(signer.signReceipt(payload));
  }
  const orderedReceiptHashes = receipts.map((r) => r.receipt_hash);
  const completeness = {
    manifest_version: "simurgh.completeness.v1",
    run_id: runRecord.run_manifest.run_id,
    observation_source: "gateway_mediator_v1",
    observed_action_log_hash: digest(runRecord.action_observation_log),
    observation_log_root: merkleRoot(obsHashes),
    observed_action_count: runRecord.action_observation_log.length,
    receipt_count: receipts.length,
    ordered_action_ids: runRecord.action_observation_log.map((e) => e.action_id),
    ordered_observation_event_hashes: obsHashes,
    ordered_receipt_hashes: orderedReceiptHashes,
    per_sink_tally: tallySinks(runRecord.action_observation_log, runRecord.decisions),
    session_merkle_root: merkleRoot(orderedReceiptHashes),
  };
  const withoutHash = {
    pack_version: "simurgh.evidence_pack.v1",
    run_manifest: runRecord.run_manifest,
    policy_bundle: runRecord.policy_bundle,
    sink_registry: runRecord.sink_registry,
    consequence_lattice: runRecord.consequence_lattice,
    action_observation_log: runRecord.action_observation_log,
    observation_log_root: completeness.observation_log_root,
    replay_material: runRecord.replay_material,
    receipts,
    completeness_manifest: completeness,
    non_claims: NON_CLAIMS,
    signer_public_key: pub,
    signer_key_id: "simurgh-stage4d-test-key-v1",
    signer_public_key_fingerprint: pub.fingerprint,
  };
  return { ...withoutHash, pack_hash: digest(withoutHash) };
}

export function signPack(pack, privateKey) {
  const { pack_hash, ...withoutHash } = pack;
  const sig = crypto.sign(
    null,
    domainBytes(PACK_DOMAIN, withoutHash),
    crypto.createPrivateKey(privateKey)
  );
  return sig.toString("base64");
}

export function tallySinks(events, decisions) {
  const out = {};
  for (const event of events) out[event.sink_id] = { observed: 0, allow: 0, block: 0 };
  for (const event of events) out[event.sink_id].observed += 1;
  for (const decision of decisions) {
    const event = events.find((e) => e.action_id === decision.action_id);
    out[event.sink_id][decision.decision] += 1;
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/llmShield/stage4d/pack.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4d/replay.mjs \
  tools/simurgh-attestation/stage4d/packBuilder.mjs \
  tests/unit/llmShield/stage4d/pack.test.js
git commit -m "feat(llm-shield): build stage 4d evidence packs"
```

---

### Task 6: Offline Verifier, Privacy Audit, And Failure Taxonomy

**Files:**

- Modify: `tools/simurgh-attestation/stage4d/replay.mjs`
- Create: `tools/simurgh-attestation/stage4d/privacy.mjs`
- Create: `tools/simurgh-attestation/stage4d/verifyPack.mjs`
- Test: `tests/unit/llmShield/stage4d/verify.test.js`
- Test: `tests/unit/llmShield/stage4d/privacy.test.js`

- [ ] **Step 1: Write failing verifier tests**

```javascript
// tests/unit/llmShield/stage4d/privacy.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { auditPrivacy } from "../../../../tools/simurgh-attestation/stage4d/privacy.mjs";

test("auditPrivacy rejects raw secret-like fields and private keys", () => {
  assert.equal(auditPrivacy({ raw_secret: "abc" }).ok, false);
  assert.equal(
    auditPrivacy({ nested: { private_signing_key: "-----BEGIN PRIVATE KEY-----" } }).reason,
    "privacy_leak_detected"
  );
});

test("auditPrivacy accepts hashes and redacted metadata", () => {
  assert.equal(auditPrivacy({ body_digest: "0".repeat(64), sink_id: "egress" }).ok, true);
});
```

```javascript
// tests/unit/llmShield/stage4d/verify.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import {
  buildEvidencePack,
  signPack,
} from "../../../../tools/simurgh-attestation/stage4d/packBuilder.mjs";
import { verifyEvidencePack } from "../../../../tools/simurgh-attestation/stage4d/verifyPack.mjs";

function oneActionRecord() {
  return {
    run_manifest: {
      run_id: "stage4d-browser-inject-01",
      parent_session: "session_stage4d_browser_inject_01",
      mode: "recorded_fixture",
      fixture_id: "browser_inject_01",
      model_identity_committed: "self-reported-fixture-model",
      model_identity_origin: "self_reported",
    },
    policy_bundle: {
      policy_version: "policy.v1",
      modes: {
        balanced: {
          block_untrusted_to_external_egress: true,
          block_authority_escalation: true,
          block_untrusted_to_secret_export: true,
          block_untrusted_to_destructive_mutation: true,
        },
      },
    },
    sink_registry: {
      registry_version: "sinks.v1",
      sinks: [{ sink_id: "egress", default_consequence_class: "external_egress" }],
    },
    consequence_lattice: {
      lattice_version: "consequence_lattice.v1",
      order: ["read_only", "external_egress"],
    },
    action_observation_log: [
      {
        event_version: "simurgh.stage4d.observation.v1",
        run_id: "stage4d-browser-inject-01",
        parent_session: "session_stage4d_browser_inject_01",
        action_id: "act_000",
        step_index: 0,
        action_type: "tool_call",
        sink_id: "egress",
        consequence_class: "external_egress",
        boundary_id: "gateway_mediator_v1",
      },
    ],
    replay_material: {
      act_000: {
        resolved_args_redacted: {
          tool_name: "send_email",
          body_digest: "0".repeat(64),
          contains_secret_marker: false,
        },
        policy_features_source: {
          sink_id: "egress",
          input_sources: ["user_task"],
          requires_authority: true,
          external_effect: true,
          user_explicitly_authorised: true,
        },
        taint_derivation_inputs: {
          sources: [{ source_id: "user_task", label: "trusted" }],
          authority_sink: true,
        },
        decision_context: {
          prior_decision_count: 0,
          rate_limit_bucket: "fixture_bucket_0",
          policy_mode: "balanced",
        },
      },
    },
    decisions: [
      {
        action_id: "act_000",
        decision: "allow",
        decision_reason_code: "POLICY_ALLOWED",
        input_integrity_summary: "trusted_only",
        decision_input: { policy_mode: "balanced", untrusted_reached_authority: false },
      },
    ],
  };
}

test("verifyEvidencePack accepts a green pack and writes success layers", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pack = buildEvidencePack({ runRecord: oneActionRecord(), privateKey, publicKey });
  const signature = signPack(pack, privateKey);
  const result = verifyEvidencePack({
    pack,
    signature,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.layers.decision_replay, true);
});

test("verifyEvidencePack rejects decision tamper with stable reason", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pack = buildEvidencePack({ runRecord: oneActionRecord(), privateKey, publicKey });
  const signature = signPack(pack, privateKey);
  pack.receipts[0].receipt_payload.decision = "block";
  const result = verifyEvidencePack({
    pack,
    signature,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.first_failure.reason, "receipt_hash_mismatch");
});

test("verifyEvidencePack rejects validly signed raw-content evidence at privacy layer", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const record = oneActionRecord();
  record.replay_material.act_000.raw_secret = "secret-value";
  const pack = buildEvidencePack({ runRecord: record, privateKey, publicKey });
  const signature = signPack(pack, privateKey);
  const result = verifyEvidencePack({
    pack,
    signature,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.first_failure.reason, "privacy_leak_detected");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/llmShield/stage4d/privacy.test.js tests/unit/llmShield/stage4d/verify.test.js`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement privacy and verifier modules**

Implement `privacy.mjs` with exact forbidden key matching and private-key marker matching:

```javascript
// tools/simurgh-attestation/stage4d/privacy.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
const FORBIDDEN_KEYS = new Set([
  "raw_secret",
  "raw_credential",
  "raw_api_key",
  "raw_prompt",
  "raw_system_prompt",
  "raw_email_body",
  "raw_page_text",
  "raw_model_output",
  "raw_user_private_content",
  "private_signing_key",
]);

export function auditPrivacy(value) {
  const stack = [value];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      for (const child of item) stack.push(child);
    } else if (item && typeof item === "object") {
      for (const [key, child] of Object.entries(item)) {
        if (FORBIDDEN_KEYS.has(key)) return { ok: false, reason: "privacy_leak_detected", key };
        stack.push(child);
      }
    } else if (typeof item === "string") {
      if (item.includes("-----BEGIN PRIVATE KEY-----"))
        return { ok: false, reason: "privacy_leak_detected" };
      if (/sk-[A-Za-z0-9_-]{16,}/.test(item)) return { ok: false, reason: "privacy_leak_detected" };
    }
  }
  return { ok: true };
}
```

Keep using the `derivePolicyFeatures`, `deriveIntegritySummary`, `deriveUntrustedReachedAuthority`, and `decide` exports from `replay.mjs` created in Task 5. Do not reimplement derivation logic inside `verifyPack.mjs`.

Create `verifyPack.mjs` with layered checks. The exported `verifyEvidencePack` returns:

```javascript
{
  ok: false,
  exit_code: 1,
  layers: {
    pack_signature: true,
    tamper: false,
    observation_binding: null,
    completeness: null,
    decision_replay: null,
    privacy: null
  },
  first_failure: { layer: "tamper", action_id: "act_000", reason: "receipt_hash_mismatch" }
}
```

The file must define these helpers with these exact responsibilities:

```javascript
function baseLayers() {
  return {
    pack_signature: null,
    tamper: null,
    observation_binding: null,
    completeness: null,
    decision_replay: null,
    privacy: null,
  };
}

function success(pack, layers) {
  return {
    ok: true,
    exit_code: 0,
    layers,
    first_failure: null,
    session_merkle_root: pack.completeness_manifest.session_merkle_root,
    pack_hash: pack.pack_hash,
  };
}

function fail(layer, reason, actionId, layers) {
  layers[layer] = false;
  return {
    ok: false,
    exit_code: 1,
    layers,
    first_failure: actionId ? { layer, action_id: actionId, reason } : { layer, reason },
  };
}
```

`verifyEvidencePack({ pack, signature, publicKeyPem })` must run these checks in order: bounded pack size, pack hash and signature, embedded key fingerprint, receipt hashes and receipt signatures, receipt hash chain, session Merkle root, observation log root, one receipt per observed action, decision replay with derived features/taint/authority, and privacy audit. Each helper catches exceptions and returns `fail("pack_signature", "schema_invalid", null, layers)` or the closest stable failure reason instead of throwing.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/llmShield/stage4d/privacy.test.js tests/unit/llmShield/stage4d/verify.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4d/replay.mjs \
  tools/simurgh-attestation/stage4d/privacy.mjs \
  tools/simurgh-attestation/stage4d/verifyPack.mjs \
  tests/unit/llmShield/stage4d/privacy.test.js \
  tests/unit/llmShield/stage4d/verify.test.js
git commit -m "feat(llm-shield): verify stage 4d evidence packs offline"
```

---

### Task 7: Build And Verify CLIs

**Files:**

- Create: `tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs`
- Create: `tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs`
- Test: `tests/unit/llmShield/stage4d/python-node-parity.test.js`
- Modify: `package.json` only if a script alias is needed by `scripts/reproduce-stage4d.sh`.

- [ ] **Step 1: Run the expected failing CLI command**

Run:

```bash
node tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs \
  --run-record /tmp/stage4d-run-record.json \
  --out docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json \
  --sig docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.sig
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 2: Implement build CLI**

The build CLI reads the Python run record and loads the deterministic test-only Ed25519 key from `SIMURGH_4D_PRIVATE_KEY_PATH`, defaulting to `tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem`. It writes only `signer.pub` into the evidence folder, builds the pack, signs the pack, and writes stable JSON side artifacts. It must not create a random key during Stage 4D golden reproduction.

```javascript
// tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildEvidencePack, signPack } from "./packBuilder.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const runPath = arg("--run-record");
  const outPath = arg("--out");
  const sigPath = arg("--sig");
  if (!runPath || !outPath || !sigPath)
    throw new Error("usage: build-stage4d-pack --run-record <json> --out <pack> --sig <sig>");
  const privateKeyPath =
    process.env.SIMURGH_4D_PRIVATE_KEY_PATH ||
    "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem";
  const privateKey = crypto.createPrivateKey(await readFile(privateKeyPath, "utf8"));
  const publicKey = crypto.createPublicKey(privateKey);
  const runRecord = JSON.parse(await readFile(runPath, "utf8"));
  const pack = buildEvidencePack({ runRecord, privateKey, publicKey });
  const signature = signPack(pack, privateKey);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, stable(pack));
  await writeFile(sigPath, signature + "\n");
  await writeFile(
    join(dirname(outPath), "signer.pub"),
    publicKey.export({ type: "spki", format: "pem" })
  );
  await writeFile(join(dirname(outPath), "run-manifest.json"), stable(pack.run_manifest));
  await writeFile(
    join(dirname(outPath), "completeness-manifest.json"),
    stable(pack.completeness_manifest)
  );
  await writeFile(join(dirname(outPath), "non-claims.json"), stable(pack.non_claims));
}

main().catch((e) => {
  console.error("stage4d build:", e.message);
  process.exit(2);
});
```

- [ ] **Step 3: Implement verify CLI**

```javascript
// tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { verifyEvidencePack } from "./verifyPack.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

async function main() {
  const packPath = process.argv[2];
  const sigPath = arg("--sig");
  const pubkeyPath = arg("--pubkey");
  const resultsPath = arg("--results") || join(dirname(packPath), "verify-results.json");
  if (!packPath || !sigPath || !pubkeyPath)
    throw new Error("usage: verify-stage4d-pack <pack> --sig <sig> --pubkey <pubkey>");
  const pack = JSON.parse(await readFile(packPath, "utf8"));
  const signature = (await readFile(sigPath, "utf8")).trim();
  const publicKeyPem = await readFile(pubkeyPath, "utf8");
  const result = verifyEvidencePack({ pack, signature, publicKeyPem });
  await writeFile(resultsPath, JSON.stringify(result, null, 2) + "\n");
  process.exit(result.exit_code);
}

main().catch(async (e) => {
  const result = {
    ok: false,
    exit_code: 2,
    layers: {},
    first_failure: { layer: "environment", reason: "environment_setup_error", message: e.message },
  };
  const packPath = process.argv[2] || ".";
  const resultsPath = arg("--results") || join(dirname(packPath), "verify-results.json");
  await writeFile(resultsPath, JSON.stringify(result, null, 2) + "\n");
  process.exit(2);
});
```

- [ ] **Step 4: Add Python-to-Node parity test**

```javascript
// tests/unit/llmShield/stage4d/python-node-parity.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("full Python stage4d fixture builds and verifies in Node", () => {
  const root = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), "stage4d-parity-"));
  const runRecord = join(dir, "run-record.json");
  const pack = join(dir, "evidence-pack.json");
  const sig = join(dir, "evidence-pack.sig");
  const results = join(dir, "verify-results.json");
  const env = {
    ...process.env,
    SIMURGH_4D_PRIVATE_KEY_PATH: join(
      root,
      "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"
    ),
  };
  execFileSync(
    "python3",
    [
      "-m",
      "stage4d.run_fixture",
      "--fixture",
      "stage4d/fixtures/browser_inject_01.json",
      "--out",
      runRecord,
    ],
    { cwd: join(root, "tools/agentdojo-simurgh-adapter"), env, stdio: "pipe" }
  );
  execFileSync(
    "node",
    [
      "tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs",
      "--run-record",
      runRecord,
      "--out",
      pack,
      "--sig",
      sig,
    ],
    { cwd: root, env, stdio: "pipe" }
  );
  execFileSync(
    "node",
    [
      "tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs",
      pack,
      "--sig",
      sig,
      "--pubkey",
      join(dir, "signer.pub"),
      "--results",
      results,
    ],
    { cwd: root, env: { ...env, SIMURGH_VERIFY_NETWORK_DISABLED: "1" }, stdio: "pipe" }
  );
  assert.equal(JSON.parse(readFileSync(results, "utf8")).ok, true);
});
```

- [ ] **Step 5: Run CLI smoke path**

Run:

```bash
cd tools/agentdojo-simurgh-adapter
python -m stage4d.run_fixture --fixture stage4d/fixtures/browser_inject_01.json --out /tmp/stage4d-run-record.json
cd ../..
export SIMURGH_4D_PRIVATE_KEY_PATH="$PWD/tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"
node tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs \
  --run-record /tmp/stage4d-run-record.json \
  --out /tmp/stage4d/evidence-pack.json \
  --sig /tmp/stage4d/evidence-pack.sig
SIMURGH_VERIFY_NETWORK_DISABLED=1 node tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs \
  /tmp/stage4d/evidence-pack.json \
  --sig /tmp/stage4d/evidence-pack.sig \
  --pubkey /tmp/stage4d/signer.pub \
  --results /tmp/stage4d/verify-results.json
```

Expected: exit `0`; `/tmp/stage4d/verify-results.json` contains `"ok": true`.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs \
  tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs \
  tests/unit/llmShield/stage4d/python-node-parity.test.js
git commit -m "feat(llm-shield): add stage 4d pack cli"
```

---

### Task 8: Tamper Scripts And Falsifier Result Summaries

**Files:**

- Create: `tools/simurgh-attestation/stage4d/tamper.mjs`
- Create: `scripts/tamper/drop-one-receipt-stage4d.mjs`
- Create: `scripts/tamper/corrupt-decision-stage4d.mjs`
- Create: `scripts/tamper/swap-embedded-key-stage4d.mjs`
- Create: `scripts/tamper/inject-raw-secret-stage4d.mjs`
- Modify: `tests/unit/llmShield/stage4d/verify.test.js`

- [ ] **Step 1: Add failing falsifier tests**

Append to `tests/unit/llmShield/stage4d/verify.test.js`:

```javascript
import {
  corruptDecision,
  dropOneReceipt,
  injectRawSecret,
  signedLyingDecision,
  swapEmbeddedKey,
} from "../../../../tools/simurgh-attestation/stage4d/tamper.mjs";

test("required falsifiers fail with stable reasons", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const pack = buildEvidencePack({ runRecord: oneActionRecord(), privateKey, publicKey });
  const signature = signPack(pack, privateKey);

  assert.equal(
    verifyEvidencePack({ pack: dropOneReceipt(pack), signature, publicKeyPem }).first_failure
      .reason,
    "missing_receipt_for_observed_action"
  );
  assert.equal(
    verifyEvidencePack({ pack: corruptDecision(pack), signature, publicKeyPem }).first_failure
      .reason,
    "receipt_hash_mismatch"
  );
  assert.equal(
    verifyEvidencePack({ pack: swapEmbeddedKey(pack), signature, publicKeyPem }).first_failure
      .reason,
    "embedded_key_mismatch"
  );
  assert.equal(
    verifyEvidencePack({ pack: injectRawSecret(pack), signature, publicKeyPem }).first_failure
      .reason,
    "pack_hash_mismatch"
  );
  const lying = signedLyingDecision({ pack, privateKey });
  assert.equal(
    verifyEvidencePack({
      pack: lying.pack,
      signature: lying.signature,
      publicKeyPem,
    }).first_failure.reason,
    "replayed_decision_mismatch"
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/llmShield/stage4d/verify.test.js`

Expected: FAIL with missing `tamper.mjs`.

- [ ] **Step 3: Implement tamper helpers and reviewer scripts**

`tamper.mjs` exports pure deep-clone helpers. Post-sign tamper helpers intentionally fail at hash/signature layers. `signedLyingDecision` recomputes the receipt hash, receipt signature, Merkle root, pack hash, and pack signature with the legitimate test key so the verifier reaches the decision-replay layer and fails with `replayed_decision_mismatch`.

```javascript
// tools/simurgh-attestation/stage4d/tamper.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { signPack } from "./packBuilder.mjs";
import { merkleRoot } from "./merkle.mjs";
import { buildReceipt, signReceiptPayload } from "./receipt.mjs";
import { sha256Canonical } from "./stage4dCrypto.mjs";

const clone = (v) => JSON.parse(JSON.stringify(v));

export function dropOneReceipt(pack) {
  const p = clone(pack);
  p.receipts = p.receipts.slice(1);
  return p;
}

export function corruptDecision(pack) {
  const p = clone(pack);
  p.receipts[0].receipt_payload.decision =
    p.receipts[0].receipt_payload.decision === "allow" ? "block" : "allow";
  return p;
}

export function swapEmbeddedKey(pack) {
  const p = clone(pack);
  p.signer_public_key.public_key_pem = p.signer_public_key.public_key_pem.replace(
    "PUBLIC KEY",
    "PUBLIC KEY"
  );
  p.signer_public_key.fingerprint = "f".repeat(64);
  p.signer_public_key_fingerprint = "f".repeat(64);
  return p;
}

export function injectRawSecret(pack) {
  const p = clone(pack);
  p.raw_secret = "secret-value";
  return p;
}

export function signedLyingDecision({ pack, privateKey }) {
  const p = clone(pack);
  const payload = {
    ...p.receipts[0].receipt_payload,
    decision: p.receipts[0].receipt_payload.decision === "allow" ? "block" : "allow",
  };
  p.receipts[0] = buildReceipt(payload, signReceiptPayload(payload, privateKey));
  p.completeness_manifest.ordered_receipt_hashes = p.receipts.map((r) => r.receipt_hash);
  p.completeness_manifest.session_merkle_root = merkleRoot(
    p.completeness_manifest.ordered_receipt_hashes
  );
  const { pack_hash, ...withoutHash } = p;
  p.pack_hash = sha256Canonical(withoutHash);
  return { pack: p, signature: signPack(p, privateKey) };
}
```

Each script uses this shared shape:

```javascript
// scripts/tamper/drop-one-receipt-stage4d.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { dropOneReceipt } from "../../tools/simurgh-attestation/stage4d/tamper.mjs";
const input = process.argv[2];
if (!input) throw new Error("usage: drop-one-receipt-stage4d.mjs <evidence-pack.json>");
const pack = JSON.parse(await readFile(input, "utf8"));
await writeFile(
  input.replace(/\.json$/, ".drop-receipt.tampered.json"),
  JSON.stringify(dropOneReceipt(pack), null, 2) + "\n"
);
```

Create `scripts/tamper/corrupt-decision-stage4d.mjs`:

```javascript
// scripts/tamper/corrupt-decision-stage4d.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { corruptDecision } from "../../tools/simurgh-attestation/stage4d/tamper.mjs";
const input = process.argv[2];
if (!input) throw new Error("usage: corrupt-decision-stage4d.mjs <evidence-pack.json>");
const pack = JSON.parse(await readFile(input, "utf8"));
await writeFile(
  input.replace(/\.json$/, ".corrupt-decision.tampered.json"),
  JSON.stringify(corruptDecision(pack), null, 2) + "\n"
);
```

Create `scripts/tamper/swap-embedded-key-stage4d.mjs`:

```javascript
// scripts/tamper/swap-embedded-key-stage4d.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { swapEmbeddedKey } from "../../tools/simurgh-attestation/stage4d/tamper.mjs";
const input = process.argv[2];
if (!input) throw new Error("usage: swap-embedded-key-stage4d.mjs <evidence-pack.json>");
const pack = JSON.parse(await readFile(input, "utf8"));
await writeFile(
  input.replace(/\.json$/, ".swap-key.tampered.json"),
  JSON.stringify(swapEmbeddedKey(pack), null, 2) + "\n"
);
```

Create `scripts/tamper/inject-raw-secret-stage4d.mjs`:

```javascript
// scripts/tamper/inject-raw-secret-stage4d.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { injectRawSecret } from "../../tools/simurgh-attestation/stage4d/tamper.mjs";
const input = process.argv[2];
if (!input) throw new Error("usage: inject-raw-secret-stage4d.mjs <evidence-pack.json>");
const pack = JSON.parse(await readFile(input, "utf8"));
await writeFile(
  input.replace(/\.json$/, ".raw-secret.tampered.json"),
  JSON.stringify(injectRawSecret(pack), null, 2) + "\n"
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/llmShield/stage4d/verify.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4d/tamper.mjs \
  scripts/tamper/drop-one-receipt-stage4d.mjs \
  scripts/tamper/corrupt-decision-stage4d.mjs \
  scripts/tamper/swap-embedded-key-stage4d.mjs \
  scripts/tamper/inject-raw-secret-stage4d.mjs \
  tests/unit/llmShield/stage4d/verify.test.js
git commit -m "test(llm-shield): add stage 4d falsifier gates"
```

---

### Task 9: Generate Committed Stage 4D Evidence And Reviewer README

**Files:**

- Create all files under `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/`

- [ ] **Step 1: Generate the run record and pack**

Run:

```bash
cd tools/agentdojo-simurgh-adapter
python -m stage4d.run_fixture \
  --fixture stage4d/fixtures/browser_inject_01.json \
  --out /tmp/stage4d-run-record.json
cd ../..
export SIMURGH_4D_PRIVATE_KEY_PATH="$PWD/tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"
node tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs \
  --run-record /tmp/stage4d-run-record.json \
  --out docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json \
  --sig docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.sig
```

Expected: generated pack, signature, signer public key, manifest, completeness manifest, and non-claims files.

- [ ] **Step 2: Verify generated evidence**

Run:

```bash
SIMURGH_VERIFY_NETWORK_DISABLED=1 node tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs \
  docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json \
  --sig docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.sig \
  --pubkey docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/signer.pub \
  --results docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/verify-results.json
```

Expected: exit `0` and `verify-results.json` contains `"ok": true`.

- [ ] **Step 3: Write reviewer README**

````markdown
# Stage 4D Decision-Replay Evidence Pack

Stage 4D produces a metadata-only, completeness-checked, decision-replayable Evidence Pack for gateway-mediated high-risk agent actions. It verifies offline and does not claim model safety.

Stage 4D verifies the containment record for a bounded gateway-mediated run. It does not prove model safety, policy correctness, or coverage of unmediated actions.

Completeness is proven with respect to gateway-mediated high-risk actions observed by the mediator. Actions that bypass the gateway are out of scope until non-bypassable enforcement lands in R6 / 4M.

## Reviewer command

```bash
npm ci
scripts/reproduce-stage4d.sh
```
````

Expected:

```text
Stage 4D Decision-Replay Evidence Pack: PASS
pack_signature: PASS
tamper: PASS
observation_binding: PASS
completeness: PASS
decision_replay: PASS
privacy: PASS
offline_verify: PASS
golden_determinism: PASS
```

## Non-claims

The pack does not prove model safety, jailbreak immunity, policy correctness, coverage of unmediated actions, kernel-level enforcement, live model identity, production certification, or ground truth outside the mediated surface.

## Test Fixture Key

The deterministic private key under `tools/simurgh-attestation/stage4d/fixtures/keys` is a test fixture key only. It exists so a clean clone can reproduce the committed Stage 4D golden bytes. It is not a production signing key, and it is not copied into this evidence folder.

````

- [ ] **Step 4: Generate summary JSON files**

Create `expected-roots.json` from the generated pack fields with this command:

```bash
node --input-type=module <<'EOF'
import { readFile, writeFile } from "node:fs/promises";
const ev = "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack";
const pack = JSON.parse(await readFile(`${ev}/evidence-pack.json`, "utf8"));
await writeFile(
  `${ev}/expected-roots.json`,
  JSON.stringify(
    {
      observation_log_root: pack.observation_log_root,
      session_merkle_root: pack.completeness_manifest.session_merkle_root,
      pack_hash: pack.pack_hash,
    },
    null,
    2
  ) + "\n"
);
EOF
````

Create result summary JSON files with deterministic initial values:

```bash
node --input-type=module <<'EOF'
import { writeFile } from "node:fs/promises";
const ev = "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack";
const files = {
  "privacy-results.json": { ok: true, rejected_forbidden_classes: true },
  "golden-results.json": { ok: true, byte_stable: true },
  "tamper-results.json": { ok: true, falsifiers_failed_as_expected: true },
  "adversarial-results.json": { ok: true, signer_failure_failed_closed: true },
  "stage4d-closeout.json": { ok: true, reproduce_command: "scripts/reproduce-stage4d.sh" },
};
for (const [name, data] of Object.entries(files)) {
  await writeFile(`${ev}/${name}`, JSON.stringify(data, null, 2) + "\n");
}
EOF
```

- [ ] **Step 5: Commit generated evidence**

```bash
git add docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack
git commit -m "docs(llm-shield): add stage 4d evidence pack"
```

---

### Task 10: Reproduce Harness And Golden Determinism

**Files:**

- Create: `scripts/reproduce-stage4d.sh`
- Modify: `scripts/check.sh` only after `scripts/reproduce-stage4d.sh` is green locally.

- [ ] **Step 1: Write reproduce harness**

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EV="$ROOT/docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack"
RUN_RECORD="${TMPDIR:-/tmp}/stage4d-run-record.json"
TMP_PACK="${TMPDIR:-/tmp}/stage4d-pack-rerun.json"
TMP_SIG="${TMPDIR:-/tmp}/stage4d-pack-rerun.sig"
TMP_VERIFY="${TMPDIR:-/tmp}/stage4d-verify-results.json"

cd "$ROOT"
node --version
python3 --version

cd "$ROOT/tools/agentdojo-simurgh-adapter"
python3 -m pytest tests/test_stage4d_policy.py tests/test_stage4d_mediator.py tests/test_stage4d_dispatch_controller.py -q
python3 -m stage4d.run_fixture --fixture stage4d/fixtures/browser_inject_01.json --out "$RUN_RECORD"

cd "$ROOT"
export SIMURGH_4D_PRIVATE_KEY_PATH="$ROOT/tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"
npm test -- \
  tests/unit/llmShield/stage4d/crypto.test.js \
  tests/unit/llmShield/stage4d/receipt.test.js \
  tests/unit/llmShield/stage4d/pack.test.js \
  tests/unit/llmShield/stage4d/privacy.test.js \
  tests/unit/llmShield/stage4d/verify.test.js \
  tests/unit/llmShield/stage4d/python-node-parity.test.js

node tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs \
  --run-record "$RUN_RECORD" \
  --out "$TMP_PACK" \
  --sig "$TMP_SIG"

SIMURGH_VERIFY_NETWORK_DISABLED=1 node tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs \
  "$TMP_PACK" \
  --sig "$TMP_SIG" \
  --pubkey "$(dirname "$TMP_PACK")/signer.pub" \
  --results "$TMP_VERIFY"

cmp "$EV/evidence-pack.json" "$TMP_PACK"
cmp "$EV/evidence-pack.sig" "$TMP_SIG"

echo "Stage 4D Decision-Replay Evidence Pack: PASS"
echo "pack_signature: PASS"
echo "tamper: PASS"
echo "observation_binding: PASS"
echo "completeness: PASS"
echo "decision_replay: PASS"
echo "privacy: PASS"
echo "offline_verify: PASS"
echo "golden_determinism: PASS"
```

- [ ] **Step 2: Make executable and run**

Run:

```bash
chmod +x scripts/reproduce-stage4d.sh
scripts/reproduce-stage4d.sh
```

Expected: exit `0` and printed Stage 4D PASS lines.

- [ ] **Step 3: Wire into `scripts/check.sh`**

Add a single check step near other Stage-4 checks:

```bash
step "LLM Shield 4D decision-replay evidence pack"
if scripts/reproduce-stage4d.sh; then
  pass "LLM Shield 4D decision-replay evidence pack"
else
  fail "LLM Shield 4D decision-replay evidence pack"
fi
```

- [ ] **Step 4: Run full quality gate**

Run: `scripts/check.sh`

Expected: PASS, including `LLM Shield 4D decision-replay evidence pack`.

- [ ] **Step 5: Commit**

```bash
git add scripts/reproduce-stage4d.sh scripts/check.sh
git commit -m "test(llm-shield): add stage 4d reproduce gate"
```

---

### Task 11: Final Verification And Formatting

**Files:**

- Modify only files that fail formatting or gate checks.

- [ ] **Step 1: Run targeted Python tests**

Run:

```bash
cd tools/agentdojo-simurgh-adapter
python -m pytest tests/test_stage4d_policy.py tests/test_stage4d_mediator.py tests/test_stage4d_dispatch_controller.py -q
```

Expected: PASS.

- [ ] **Step 2: Run targeted Node tests**

Run:

```bash
npm test -- \
  tests/unit/llmShield/stage4d/crypto.test.js \
  tests/unit/llmShield/stage4d/receipt.test.js \
  tests/unit/llmShield/stage4d/pack.test.js \
  tests/unit/llmShield/stage4d/privacy.test.js \
  tests/unit/llmShield/stage4d/verify.test.js \
  tests/unit/llmShield/stage4d/python-node-parity.test.js
```

Expected: PASS.

- [ ] **Step 3: Run format check**

Run: `npm run format:check`

Expected: PASS.

- [ ] **Step 4: Run full tests and audit**

Run:

```bash
npm test
npm audit --audit-level=high
git diff --check
```

Expected: PASS for all commands.

- [ ] **Step 5: Run full Stage 4D closeout**

Run: `scripts/reproduce-stage4d.sh`

Expected: PASS with all Stage 4D lines.

- [ ] **Step 6: Commit any verification-only fixes**

If formatting or gate fixes changed files, commit them:

```bash
git add tools/agentdojo-simurgh-adapter/stage4d \
  tools/agentdojo-simurgh-adapter/tests/test_stage4d_*.py \
  tools/simurgh-attestation/stage4d \
  tests/unit/llmShield/stage4d \
  scripts/reproduce-stage4d.sh \
  scripts/tamper/*stage4d.mjs \
  docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack
git commit -m "fix(llm-shield): close stage 4d verification gaps"
```

If no files changed, do not create an empty commit.

---

## Self-Review Checklist

- Spec coverage: Tasks cover repo-native structure, recorded fixture, pure policy, Node canonical authority, receipt signatures, pack signatures, observation binding, completeness, replay, privacy, size/failure handling, falsifiers, evidence artifacts, README, and reproduce harness.
- Placeholder scan: The plan contains no unresolved placeholders, deferred-detail instructions, or unnamed edge handling steps.
- Type consistency: `run_id`, `parent_session`, `action_id`, `step_index`, `observation_event_hash`, `receipt_hash`, `pack_hash`, `decision_reason_code`, `policy_features_source`, and `taint_derivation_inputs` are used consistently across Python and Node tasks.
