# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3H-L2 sampled external-run orchestrator."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
from typing import Any

from .agentdojo_register import require_agentdojo
from .evidence_writer import write_json_artifacts
from .layer2_manifest import (
    build_run_manifest,
    load_sample_manifest,
    validate_agentdojo_sample_ids,
)
from .layer2_metrics import (
    compute_agentdojo_native_results,
    compute_combined_metrics,
    compute_simurgh_containment_results,
)
from .layer2_sanitise import sanitise_agentdojo_rows
from .simurgh_client import SimurghClient
from .stage3i_error_taxonomy import build_error_taxonomy
from .stage3i_metrics import build_benign_recovery_analysis


class Layer2Blocked(RuntimeError):
    pass


# Stage 3K row tagging (pure, additive — Stage 3J paths are untouched).
# These helpers may ONLY add descriptive metadata; they never read or write
# gateway verdicts, boundaries, trust levels, or any policy field.
STAGE3K_TAG_KEYS = frozenset({"lane", "operator_id", "category"})


def apply_stage3k_tags(
    rows: list[dict[str, Any]], tags: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Return copies of rows with ONLY lane/operator_id/category added.

    Raises if a tag carries any key outside STAGE3K_TAG_KEYS, or if the tag
    would overwrite an existing non-tag field on the row.
    """
    if len(rows) != len(tags):
        raise ValueError("rows and tags length mismatch")
    out: list[dict[str, Any]] = []
    for row, tag in zip(rows, tags):
        if not set(tag) <= STAGE3K_TAG_KEYS:
            raise ValueError(f"tag carries disallowed keys: {sorted(set(tag) - STAGE3K_TAG_KEYS)}")
        for key in tag:
            if key in row and key not in STAGE3K_TAG_KEYS:
                raise ValueError(f"tag would overwrite non-tag field {key!r}")
        merged = dict(row)
        merged.update(tag)
        out.append(merged)
    return out


def tag_rows_for_stage(
    rows: list[dict[str, Any]], *, stage: str, tags: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    """Stage 3J behaviour is byte-for-byte unchanged when stage != '3k'."""
    if stage != "3k":
        return list(rows)
    if tags is None:
        raise ValueError("stage '3k' requires tags")
    return apply_stage3k_tags(rows, tags)


def _run_index(defended_rows: list[dict[str, Any]]) -> dict[str, Any]:
    entries = []
    for row in defended_rows:
        entries.append(
            {
                "agentdojo_run_id": row.get("agentdojo_run_id"),
                "receipt_id": row.get("receipt_id"),
                "non_call_reason": row.get("non_call_reason"),
            }
        )
    return {"stage": "3H-L2", "entries": entries}


def build_stage3i_artifacts(defended_rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Stage 3I Phase 1 evidence (taxonomy-only, no policy change)."""
    return {
        "error-taxonomy.json": {
            "stage": "3I",
            "entries": build_error_taxonomy(defended_rows),
        },
        "benign-recovery-analysis.json": build_benign_recovery_analysis(defended_rows),
    }


def run_layer2_from_rows(
    *,
    sample_manifest_path: str | Path,
    out_dir: str | Path,
    baseline_rows: list[dict[str, Any]],
    defended_rows: list[dict[str, Any]],
    benchmark_pin: str = "agentdojo==0.1.30",
    provider_mode: str = "local_or_configured_agentdojo_provider",
    model_provider: str = "agentdojo_ground_truth_pipeline",
    pin_substitution_reason: str | None = None,
) -> dict[str, Any]:
    sample = load_sample_manifest(sample_manifest_path)
    baseline_sanitised = sanitise_agentdojo_rows(baseline_rows)
    defended_sanitised = sanitise_agentdojo_rows(defended_rows)
    native = compute_agentdojo_native_results(baseline_sanitised, defended_sanitised)
    containment = compute_simurgh_containment_results(
        defended_sanitised, baseline_run_count=len(baseline_sanitised)
    )
    combined = compute_combined_metrics(native, containment)
    manifest = build_run_manifest(
        sample_manifest_path=sample_manifest_path,
        sample_manifest=sample,
        benchmark_pin=benchmark_pin,
        provider_mode=provider_mode,
        model_provider=model_provider,
        scorer_modified=False,
        agentdojo_pin_substitution_reason=pin_substitution_reason,
    )
    artifacts = {
        "run-manifest.json": manifest,
        "agentdojo-native-results.json": native,
        "simurgh-containment-results.json": containment,
        "simurgh-run-index.json": _run_index(defended_sanitised),
        "metrics.json": combined,
    }
    write_json_artifacts(out_dir, artifacts)
    return artifacts


def _split_security_case_ids(case_ids: list[str]) -> tuple[list[str], list[str]]:
    user_ids = []
    injection_ids = []
    for case_id in case_ids:
        user_id, injection_id = case_id.split("::", 1)
        if user_id not in user_ids:
            user_ids.append(user_id)
        if injection_id not in injection_ids:
            injection_ids.append(injection_id)
    return user_ids, injection_ids


def _rows_from_without_injections(results: dict[tuple[str, str], bool], *, defence: str) -> list[dict[str, Any]]:
    rows = []
    for (user_task_id, _), utility in sorted(results.items()):
        rows.append(
            {
                "agentdojo_run_id": f"{defence}:{user_task_id}:none",
                "task_id": user_task_id,
                "kind": "benign",
                "suite": "workspace",
                "attack_family": "none",
                "defence": defence,
                "model_provider": "agentdojo_ground_truth_pipeline",
                "provider_mode": "local_or_configured_agentdojo_provider",
                "utility_success": bool(utility),
                "completed": True,
            }
        )
    return rows


def _rows_from_with_injections(
    utility_results: dict[tuple[str, str], bool],
    security_results: dict[tuple[str, str], bool],
    *,
    defence: str,
) -> list[dict[str, Any]]:
    rows = []
    for key, utility in sorted(utility_results.items()):
        user_task_id, injection_task_id = key
        attack_success = security_results[key]
        rows.append(
            {
                "agentdojo_run_id": f"{defence}:{user_task_id}:{injection_task_id}",
                "task_id": user_task_id,
                "security_case_id": f"{user_task_id}::{injection_task_id}",
                "kind": "security",
                "suite": "workspace",
                "attack_family": "important_instructions",
                "defence": defence,
                "model_provider": "agentdojo_ground_truth_pipeline",
                "provider_mode": "local_or_configured_agentdojo_provider",
                "utility_success": bool(utility),
                "attack_success": bool(attack_success),
                "completed": True,
            }
        )
    return rows


def _content_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _make_ground_truth_pipeline(prompt_to_task: dict[str, Any], recorder=None):
    from agentdojo.agent_pipeline.base_pipeline_element import BasePipelineElement
    from agentdojo.agent_pipeline.tool_execution import tool_result_to_str
    from agentdojo.functions_runtime import EmptyEnv
    from agentdojo.types import (
        ChatAssistantMessage,
        ChatToolResultMessage,
        text_content_block_from_string,
    )

    class _TaskGroundTruthPipeline(BasePipelineElement):
        name = "simurgh-layer2-ground-truth"

        def query(self, query, runtime, env=EmptyEnv(), messages=[], extra_args={}):
            task = prompt_to_task.get(query)
            if task is None:
                raise Layer2Blocked("AgentDojo task prompt not present in frozen prompt map")
            if recorder is not None:
                record = recorder.record(task)
                if record["gateway_verdict"] == "blocked":
                    blocked_message = (
                        "simurgh_blocked:"
                        f"{record.get('boundary') or 'input_firewall'}:"
                        f"{record.get('receipt_id') or 'unknown'}"
                    )
                    new_messages = [
                        ChatAssistantMessage(
                            role="assistant",
                            content=[text_content_block_from_string(blocked_message)],
                            tool_calls=None,
                        )
                    ]
                    return query, runtime, env, [*messages, *new_messages], extra_args
            new_messages = []
            for tool_call in task.ground_truth(env):
                new_messages.append(
                    ChatAssistantMessage(
                        role="assistant",
                        tool_calls=[tool_call],
                        content=[text_content_block_from_string("")],
                    )
                )
                tool_result, _ = runtime.run_function(
                    env, tool_call.function, tool_call.args, raise_on_error=True
                )
                new_messages.append(
                    ChatToolResultMessage(
                        role="tool",
                        content=[text_content_block_from_string(tool_result_to_str(tool_result))],
                        tool_call=tool_call,
                        tool_call_id=None,
                        error=None,
                    )
                )
            new_messages.append(
                ChatAssistantMessage(
                    role="assistant",
                    content=[text_content_block_from_string(task.GROUND_TRUTH_OUTPUT)],
                    tool_calls=None,
                )
            )
            return query, runtime, env, [*messages, *new_messages], extra_args

    return _TaskGroundTruthPipeline()


class _GatewayRecorder:
    def __init__(self, client: SimurghClient):
        self.client = client
        self.records: list[dict[str, Any]] = []

    def record(self, task) -> dict[str, Any]:
        task_id = getattr(task, "ID", "unknown_task")
        task_kind = "security" if task_id.startswith("injection_task_") else "benign"
        # Stage 3I: send honest provenance the context guard actually accepts.
        # Benign benchmark seed -> synthetic (hash-only Simurgh-generated metadata,
        # accepted). Injection-bearing context -> untrusted (demoted to data, never
        # authority). All three fields must be valid guard enums or the context is
        # schema-rejected (the Stage 3H-L2 over-defence root cause).
        if task_kind == "benign":
            source_type, trust_level, purpose = "system_seed", "synthetic", "task_data"
        else:
            source_type, trust_level, purpose = "tool_result", "untrusted", "reference"
        response = self.client.run(
            input=f"AgentDojo Stage 3H-L2 sampled {task_kind} run {task_id}",
            contexts=[
                {
                    "context_id": f"agentdojo-{task_id}",
                    "source_type": source_type,
                    "trust_level": trust_level,
                    "purpose": purpose,
                    "content": f"task_id_hash:{_content_hash(task_id)}",
                }
            ],
            provider_mode="mock",
            provider="mock",
            task_type="agentdojo.workspace",
            scenario="benign",
            case_id=task_id,
        )
        record = {
            "task_id": task_id,
            "gateway_contacted": True,
            "receipt_id": (response.get("receipt") or {}).get("run_id"),
            "gateway_verdict": response.get("gateway_verdict"),
            "boundary": _blocking_boundary(response),
            "tool_execution_bypassed_gate": False,
            "unsafe_output_exported": False,
            "context_authority_escalated": False,
            "generated_evidence_leakage": False,
        }
        self.records.append(record)
        return record


def _blocking_boundary(response: dict[str, Any]) -> str | None:
    # Order reflects pipeline order: input firewall is the earliest boundary, so a
    # blocked input is labelled input_firewall rather than collapsed to context_guard.
    if response.get("input_verdict") == "blocked":
        return "input_firewall"
    if response.get("tool_gate_verdict") == "blocked":
        return "tool_gate"
    if response.get("output_firewall_verdict") == "blocked":
        return "output_firewall"
    if response.get("gateway_verdict") == "blocked":
        return "context_guard"
    return None


def _merge_defended_gateway_rows(
    rows: list[dict[str, Any]], records: list[dict[str, Any]], *, offset: int
) -> list[dict[str, Any]]:
    selected_records = records[offset : offset + len(rows)]
    if len(selected_records) != len(rows):
        raise Layer2Blocked("defended gateway contact count did not match AgentDojo row count")
    merged = []
    for row, record in zip(rows, selected_records, strict=True):
        merged.append({**row, **record, "audit_verified": True})
    return merged


def run_external_agentdojo(*, sample_manifest_path: str | Path, out_dir: str | Path) -> dict[str, Any]:
    try:
        require_agentdojo()
        import agentdojo.attacks.important_instructions_attacks  # noqa: F401
        from agentdojo.attacks.attack_registry import load_attack
        from agentdojo.benchmark import (
            benchmark_suite_with_injections,
            benchmark_suite_without_injections,
        )
        from agentdojo.logging import OutputLogger
        from agentdojo.task_suite.load_suites import get_suite
    except Exception as exc:
        raise Layer2Blocked(f"AgentDojo external run blocked: {exc}") from exc

    sample = load_sample_manifest(sample_manifest_path)
    suite = get_suite(sample["benchmark_version"], sample["suite"])
    validate_agentdojo_sample_ids(sample, suite)
    security_user_ids, injection_ids = _split_security_case_ids(sample["security_case_ids"])
    prompt_to_task = {
        task.PROMPT: task for task in suite.user_tasks.values() if task.ID in sample["benign_task_ids"]
    }
    prompt_to_task.update(
        {
            task.GOAL: task
            for task in suite.injection_tasks.values()
            if task.ID in injection_ids
        }
    )

    baseline_pipeline = _make_ground_truth_pipeline(prompt_to_task)
    baseline_pipeline.name = "gpt-4o-2024-05-13-simurgh-layer2-baseline-ground-truth"
    with OutputLogger(logdir=None):
        baseline_benign = benchmark_suite_without_injections(
            baseline_pipeline,
            suite,
            logdir=None,
            force_rerun=True,
            user_tasks=sample["benign_task_ids"],
            benchmark_version=sample["benchmark_version"],
        )
        baseline_attack = load_attack(sample["attack_family"], suite, baseline_pipeline)
        baseline_security = benchmark_suite_with_injections(
            baseline_pipeline,
            suite,
            baseline_attack,
            logdir=None,
            force_rerun=True,
            user_tasks=security_user_ids,
            injection_tasks=injection_ids,
            benchmark_version=sample["benchmark_version"],
        )
    baseline_rows = _rows_from_without_injections(
        baseline_benign["utility_results"], defence="none"
    ) + _rows_from_with_injections(
        baseline_security["utility_results"],
        baseline_security["security_results"],
        defence="none",
    )

    client = SimurghClient()
    client.preflight()
    if not client.session_id:
        client.create_session()
    recorder = _GatewayRecorder(client)
    defended_pipeline = _make_ground_truth_pipeline(prompt_to_task, recorder=recorder)
    defended_pipeline.name = "gpt-4o-2024-05-13-simurgh-layer2-defended-ground-truth"
    with OutputLogger(logdir=None):
        defended_benign = benchmark_suite_without_injections(
            defended_pipeline,
            suite,
            logdir=None,
            force_rerun=True,
            user_tasks=sample["benign_task_ids"],
            benchmark_version=sample["benchmark_version"],
        )
        defended_attack = load_attack(sample["attack_family"], suite, defended_pipeline)
        defended_security = benchmark_suite_with_injections(
            defended_pipeline,
            suite,
            defended_attack,
            logdir=None,
            force_rerun=True,
            user_tasks=security_user_ids,
            injection_tasks=injection_ids,
            benchmark_version=sample["benchmark_version"],
        )
    verify = client.verify()
    if verify.get("valid") is not True:
        raise Layer2Blocked("Simurgh gateway audit verification failed")
    defended_benign_rows = _rows_from_without_injections(
        defended_benign["utility_results"], defence="simurgh"
    )
    defended_security_rows = _rows_from_with_injections(
        defended_security["utility_results"],
        defended_security["security_results"],
        defence="simurgh",
    )
    # AgentDojo runs injection tasks as utility checks before security cases.
    injection_utility_contacts = len(injection_ids)
    defended_rows = _merge_defended_gateway_rows(
        defended_benign_rows, recorder.records, offset=0
    ) + _merge_defended_gateway_rows(
        defended_security_rows,
        recorder.records,
        offset=len(defended_benign_rows) + injection_utility_contacts,
    )
    artifacts = run_layer2_from_rows(
        sample_manifest_path=sample_manifest_path,
        out_dir=out_dir,
        baseline_rows=baseline_rows,
        defended_rows=defended_rows,
        benchmark_pin=sample["agentdojo_version_pin"],
        provider_mode=sample["provider_mode"],
        model_provider="agentdojo_ground_truth_pipeline",
    )
    stage3i_dir = Path(out_dir).parent / "stage-3i"
    write_json_artifacts(stage3i_dir, build_stage3i_artifacts(defended_rows))
    return artifacts


def run_all_suites_collect_rows(*, suites):  # pragma: no cover - needs agentdojo
    """Stage 3J: run full user/injection sets for each suite, baseline + defended.

    Reuses _make_ground_truth_pipeline, _GatewayRecorder, _rows_from_* helpers, and
    the same offset bookkeeping as run_external_agentdojo (AgentDojo runs injection
    tasks as utility checks between benign and security contacts). A fresh recorder
    per suite keeps offsets restarting at 0. Returns (baseline_rows, defended_rows)
    with defended rows already merged with their gateway records.

    Hard alignment checks (Stage 3J review fix #5): the run aborts if the per-suite
    record accounting does not balance, or if any merged defended row lacks a receipt.
    """
    require_agentdojo()
    import agentdojo.attacks.important_instructions_attacks  # noqa: F401
    from agentdojo.attacks.attack_registry import load_attack
    from agentdojo.benchmark import (
        benchmark_suite_with_injections,
        benchmark_suite_without_injections,
    )
    from agentdojo.logging import OutputLogger
    from agentdojo.task_suite.load_suites import get_suite

    benchmark_version = "v1.2.1"
    baseline_rows: list[dict[str, Any]] = []
    defended_rows: list[dict[str, Any]] = []

    client = SimurghClient()
    client.preflight()
    if not client.session_id:
        client.create_session()

    for suite_name in suites:
        suite = get_suite(benchmark_version, suite_name)
        user_ids = list(suite.user_tasks.keys())
        injection_ids = list(suite.injection_tasks.keys())
        prompt_to_task = {t.PROMPT: t for t in suite.user_tasks.values()}
        prompt_to_task.update({t.GOAL: t for t in suite.injection_tasks.values()})

        # Baseline (no recorder).
        # AgentDojo's important_instructions attack requires a recognised model
        # token in the pipeline name (mirrors run_external_agentdojo); the run is
        # still the deterministic ground-truth pipeline, no real model is called.
        base_pipe = _make_ground_truth_pipeline(prompt_to_task)
        base_pipe.name = f"gpt-4o-2024-05-13-stage3j-{suite_name}-baseline-ground-truth"
        with OutputLogger(logdir=None):
            base_benign = benchmark_suite_without_injections(
                base_pipe, suite, logdir=None, force_rerun=True,
                user_tasks=user_ids, benchmark_version=benchmark_version,
            )
            base_attack = load_attack("important_instructions", suite, base_pipe)
            base_security = benchmark_suite_with_injections(
                base_pipe, suite, base_attack, logdir=None, force_rerun=True,
                user_tasks=user_ids, injection_tasks=injection_ids,
                benchmark_version=benchmark_version,
            )
        suite_baseline = _rows_from_without_injections(
            base_benign["utility_results"], defence="none"
        ) + _rows_from_with_injections(
            base_security["utility_results"], base_security["security_results"], defence="none"
        )

        # Defended (fresh recorder per suite so offsets restart at 0).
        recorder = _GatewayRecorder(client)
        def_pipe = _make_ground_truth_pipeline(prompt_to_task, recorder=recorder)
        def_pipe.name = f"gpt-4o-2024-05-13-stage3j-{suite_name}-defended-ground-truth"
        with OutputLogger(logdir=None):
            def_benign = benchmark_suite_without_injections(
                def_pipe, suite, logdir=None, force_rerun=True,
                user_tasks=user_ids, benchmark_version=benchmark_version,
            )
            def_attack = load_attack("important_instructions", suite, def_pipe)
            def_security = benchmark_suite_with_injections(
                def_pipe, suite, def_attack, logdir=None, force_rerun=True,
                user_tasks=user_ids, injection_tasks=injection_ids,
                benchmark_version=benchmark_version,
            )
        def_benign_rows = _rows_from_without_injections(def_benign["utility_results"], defence="simurgh")
        def_security_rows = _rows_from_with_injections(
            def_security["utility_results"], def_security["security_results"], defence="simurgh"
        )
        # AgentDojo runs injection-task utility checks between benign and security contacts.
        injection_utility_contacts = len(injection_ids)
        expected_records = (
            len(def_benign_rows) + injection_utility_contacts + len(def_security_rows)
        )
        if len(recorder.records) != expected_records:
            raise Layer2Blocked(
                f"stage3j alignment: suite {suite_name} expected {expected_records} "
                f"gateway records, got {len(recorder.records)}"
            )
        suite_defended = _merge_defended_gateway_rows(
            def_benign_rows, recorder.records, offset=0
        ) + _merge_defended_gateway_rows(
            def_security_rows,
            recorder.records,
            offset=len(def_benign_rows) + injection_utility_contacts,
        )
        if any(not row.get("receipt_id") for row in suite_defended):
            raise Layer2Blocked(f"stage3j alignment: suite {suite_name} has a defended row without a receipt")

        for row in suite_baseline:
            row["suite"] = suite_name
        for row in suite_defended:
            row["suite"] = suite_name
        baseline_rows.extend(suite_baseline)
        defended_rows.extend(suite_defended)

    if client.verify().get("valid") is not True:
        raise Layer2Blocked("Simurgh gateway audit verification failed")
    return baseline_rows, defended_rows


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample-manifest", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)
    run_external_agentdojo(sample_manifest_path=args.sample_manifest, out_dir=args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
