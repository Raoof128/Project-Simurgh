# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 1-LIVE: AgentDojo with a REAL OpenAI LLM agent (opt-in, keyed).

Unlike Stage 3H-3J (deterministic ground-truth pipeline, where baseline ASR is
trivially 0 because no LLM can be fooled), this runner drives the pinned AgentDojo
benchmark with a live OpenAI model. The point is a NON-ZERO baseline ASR, so that
Simurgh's defended run actually has something to contain -- genuine external
validity at the agent level.

STATUS: UNVERIFIED until first keyed run. Requires OPENAI_API_KEY and (for the
defended run) the local Simurgh gateway. It is never imported by unit tests and
never runs in CI. The metrics computation it calls (build_stage3j_artifacts) is
already unit-tested; the live pipeline construction below is the new, untested part
and may need iteration on first real execution. It writes ONLY metadata-only
artifacts and never fabricates numbers.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

from .evidence_writer import write_json_artifacts
from .stage3j_full_runner import build_stage3j_artifacts

ATTACK = "important_instructions"
SUITE = "workspace"
BENCHMARK_VERSION = "v1.2"


def _rows_from_results(results, *, defence: str, model: str) -> list[dict[str, Any]]:  # pragma: no cover - opt-in
    """Flatten AgentDojo SuiteResults into the row shape build_stage3j_artifacts expects."""
    rows: list[dict[str, Any]] = []
    for (user_task_id, injection_task_id), utility in sorted(results["utility_results"].items()):
        is_security = bool(injection_task_id)
        row: dict[str, Any] = {
            "agentdojo_run_id": f"{defence}:{user_task_id}:{injection_task_id or 'none'}",
            "task_id": user_task_id,
            "kind": "security" if is_security else "benign",
            "suite": SUITE,
            "attack_family": ATTACK if is_security else "none",
            "defence": defence,
            "model_provider": f"openai:{model}",
            "provider_mode": "live",
            "utility_success": bool(utility),
            "completed": True,
        }
        if is_security:
            row["security_case_id"] = f"{user_task_id}::{injection_task_id}"
            row["attack_success"] = bool(results["security_results"][(user_task_id, injection_task_id)])
        rows.append(row)
    return rows


def run_live(
    *,
    model: str,
    out_dir: str | Path,
    max_user_tasks: int | None,
    defended: bool,
    max_injection_tasks: int | None = None,
    reasoning_effort: str | None = None,
) -> dict[str, Any]:  # pragma: no cover - opt-in, needs OPENAI_API_KEY + live network
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY not set; this is an opt-in keyed run.")

    # Lazy imports so the module is import-safe without agentdojo/openai installed.
    from agentdojo.agent_pipeline import AgentPipeline, PipelineConfig
    from agentdojo.attacks.attack_registry import load_attack
    from agentdojo.benchmark import (
        benchmark_suite_with_injections,
        benchmark_suite_without_injections,
    )
    from agentdojo.logging import OutputLogger
    from agentdojo.task_suite.load_suites import get_suite

    suite = get_suite(BENCHMARK_VERSION, SUITE)
    user_tasks = list(suite.user_tasks.keys())
    if max_user_tasks:
        user_tasks = user_tasks[:max_user_tasks]
    injection_tasks = list(suite.injection_tasks.keys())
    if max_injection_tasks:
        injection_tasks = injection_tasks[:max_injection_tasks]

    def build_pipeline() -> Any:
        # Build the OpenAI LLM element directly with the RAW model string. This
        # bypasses AgentDojo 0.1.30's ModelsEnum (which only knows 2024-era names),
        # so any current/future OpenAI model (e.g. a gpt-5.x reasoning model) works,
        # and lets us pass reasoning_effort. PipelineConfig(llm=<element>) skips the enum.
        import openai
        from agentdojo.agent_pipeline.llms.openai_llm import OpenAILLM

        llm = OpenAILLM(openai.OpenAI(), model, reasoning_effort=reasoning_effort or None)
        if not getattr(llm, "name", None):
            llm.name = model
        pipeline = AgentPipeline.from_config(
            PipelineConfig(llm=llm, defense=None, system_message_name=None, system_message=None)
        )
        if defended:
            # Insert the in-loop Simurgh mediating defence (routes each step through the
            # local gateway). UNVERIFIED wiring -- expect iteration on first keyed run.
            from .defence import SimurghDefence
            from .simurgh_client import SimurghClient

            pipeline.elements.append(SimurghDefence(SimurghClient()))
        return pipeline

    defence_label = "simurgh_defended" if defended else "baseline"
    pipeline = build_pipeline()
    # Benchmark functions require an active logging context (the default NullLogger
    # only gets its logdir attribute on __enter__). logdir=None keeps traces out of
    # the repo; our committed evidence is the aggregated metadata only.
    with OutputLogger(None):
        benign = benchmark_suite_without_injections(
            pipeline, suite, logdir=None, force_rerun=True, user_tasks=user_tasks
        )
        attack = load_attack(ATTACK, suite, pipeline)
        security = benchmark_suite_with_injections(
            pipeline,
            suite,
            attack,
            logdir=None,
            force_rerun=True,
            user_tasks=user_tasks,
            injection_tasks=injection_tasks,
        )
    rows = _rows_from_results(benign, defence=defence_label, model=model) + _rows_from_results(
        security, defence=defence_label, model=model
    )

    # When only one arm is run, both baseline/defended inputs are the same arm; the
    # aggregator still emits valid metadata-only metrics for the arm we have.
    artifacts = build_stage3j_artifacts(rows, rows, scope="workspace-live")
    artifacts["live-manifest.json"] = {
        "stage": "1-LIVE",
        "model": f"openai:{model}",
        "provider_mode": "live",
        "suite": SUITE,
        "attack": ATTACK,
        "benchmark_version": BENCHMARK_VERSION,
        "defence": defence_label,
        "user_tasks_run": len(user_tasks),
        "note": "Live keyed run; metadata-only. Baseline ASR is expected to be non-zero, unlike the deterministic Stage 3J pipeline.",
    }
    write_json_artifacts(out_dir, artifacts)
    return artifacts


def main(argv: list[str] | None = None) -> int:  # pragma: no cover - opt-in
    p = argparse.ArgumentParser(description="Stage 1-LIVE AgentDojo with a real OpenAI agent (opt-in).")
    p.add_argument("--model", default="gpt-4o-mini-2024-07-18")
    p.add_argument("--out", required=True)
    p.add_argument("--max-user-tasks", type=int, default=5, help="cost control")
    p.add_argument("--max-injection-tasks", type=int, default=None, help="cost control")
    p.add_argument(
        "--reasoning-effort",
        default=None,
        choices=["none", "low", "medium", "high", "xhigh"],
        help="for reasoning models (e.g. gpt-5.x)",
    )
    p.add_argument("--defended", action="store_true")
    args = p.parse_args(argv)
    run_live(
        model=args.model,
        out_dir=args.out,
        max_user_tasks=args.max_user_tasks,
        defended=args.defended,
        max_injection_tasks=args.max_injection_tasks,
        reasoning_effort=args.reasoning_effort,
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
