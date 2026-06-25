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

# important_instructions (Debenedetti et al.): AgentDojo's canonical, strongest
# stock prompt-injection attack. It is the right baseline; injecagent is kept as a
# weaker-attack option. See make_modern_model_compatible() for why both now run on
# arbitrary (post-2024) model strings.
ATTACK = "important_instructions"
SUITE = "workspace"
BENCHMARK_VERSION = "v1.2"


def make_modern_model_compatible(model: str) -> None:
    """Make pinned AgentDojo 0.1.30 work correctly with current OpenAI models.

    Two upstream incompatibilities silently corrupt live runs with post-2024 models
    (both verified live on 2026-06-25 with gpt-5.4-mini); we repair them without
    touching benchmark scoring, environments, tasks, or attack payloads:

    1. Tool-output serialization. AgentDojo's `_message_to_openai` sends tool results
       as its internal content blocks `[{"type":"text","content": ...}]`. OpenAI's
       schema requires the key `text`, not `content`. Older chat models tolerated the
       malformed part; modern reasoning models (e.g. gpt-5.4-mini) read it as an EMPTY
       tool result and refuse ("I couldn't retrieve ..."), collapsing benign utility to
       ~0. We flatten tool content to a plain string (the data the model should see).
       Effect on gpt-5.4-mini workspace benign utility: 0/5 -> 5/5.

    2. Attack model-name lookup. The canonical important_instructions attack resolves a
       human-readable model name via MODEL_NAMES, which only lists 2024-era names and
       hard-fails on unknown strings. We register the live model so the attack can name
       it. This only fills the `{model}` slot of the jailbreak text; it changes no other
       attack content.
    """
    import agentdojo.agent_pipeline.llms.openai_llm as _oai
    import agentdojo.attacks.base_attacks as _ba
    import agentdojo.attacks.important_instructions_attacks as _iia
    import agentdojo.models as _models
    from agentdojo.agent_pipeline.llms.openai_llm import ChatCompletionToolMessageParam

    for mod in (_models, _ba, _iia):
        mod.MODEL_NAMES.setdefault(model, "GPT-4")

    if getattr(_oai, "_simurgh_tool_serialization_patched", False):
        return
    _orig = _oai._message_to_openai

    def _patched(message, model_name):  # pragma: no cover - exercised only in live runs
        if message["role"] == "tool":
            content = message["error"]
            if content is None:
                blocks = message["content"]
                content = (
                    "\n".join((b.get("content") or b.get("text") or "") for b in blocks)
                    if isinstance(blocks, list)
                    else str(blocks)
                )
            return ChatCompletionToolMessageParam(
                content=content,
                tool_call_id=message["tool_call_id"],
                role="tool",
                name=message["tool_call"].function,
            )
        return _orig(message, model_name)

    _oai._message_to_openai = _patched
    _oai._simurgh_tool_serialization_patched = True


def force_greedy_decoding() -> None:
    """Force deterministic (greedy) sampling so an offline run is byte-reproducible.

    AgentDojo's request helper drops ``temperature=0.0`` (``0.0 or NOT_GIVEN`` is falsy),
    so the server falls back to its own sampling default and runs are non-deterministic.
    For a frozen offline capture (the Stage 3V-B methodology: capture-once -> freeze ->
    replay) we want greedy decoding. This patch sends ``temperature=0``, ``top_p=1`` and a
    fixed ``seed`` explicitly, keeping a small retry so long runs survive transient errors.
    Intended for self-hosted endpoints (e.g. vLLM on RunPod); a no-op for OpenAI-hosted
    reasoning models that reject these params (callers simply omit ``--greedy`` there).
    """
    import agentdojo.agent_pipeline.llms.openai_llm as _oai
    from openai._types import NOT_GIVEN

    if getattr(_oai, "_simurgh_greedy_patched", False):
        return

    def _greedy(client, model, messages, tools, reasoning_effort, temperature=0.0):  # pragma: no cover - live only
        last = None
        for _ in range(3):
            try:
                return client.chat.completions.create(
                    model=model,
                    messages=messages,
                    tools=tools or NOT_GIVEN,
                    tool_choice="auto" if tools else NOT_GIVEN,
                    temperature=0,
                    top_p=1,
                    seed=0,
                    reasoning_effort=reasoning_effort or NOT_GIVEN,
                )
            except Exception as exc:  # noqa: BLE001 - transient endpoint errors
                last = exc
        raise last

    _oai.chat_completion_request = _greedy
    _oai._simurgh_greedy_patched = True


def _rows_from_results(
    results, *, defence: str, model: str, provider_label: str = "openai"
) -> list[dict[str, Any]]:  # pragma: no cover - opt-in
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
            "model_provider": f"{provider_label}:{model}",
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
    base_url: str | None = None,
    api_key: str | None = None,
    greedy: bool = False,
) -> dict[str, Any]:  # pragma: no cover - opt-in, needs a live endpoint
    # An OpenAI-compatible self-hosted endpoint (e.g. vLLM on RunPod) needs only a
    # base_url and accepts a dummy key; OpenAI-hosted runs still require a real key.
    if base_url is None and not (api_key or os.environ.get("OPENAI_API_KEY")):
        raise SystemExit("No OPENAI_API_KEY and no --base-url; this is an opt-in live run.")

    # Self-hosted endpoint -> tag provenance as the serving stack, not "openai".
    provider_label = "vllm" if base_url else "openai"

    # Lazy imports so the module is import-safe without agentdojo/openai installed.
    from agentdojo.agent_pipeline import AgentPipeline, PipelineConfig
    from agentdojo.attacks.attack_registry import load_attack
    from agentdojo.benchmark import (
        benchmark_suite_with_injections,
        benchmark_suite_without_injections,
    )
    from agentdojo.logging import OutputLogger
    from agentdojo.task_suite.load_suites import get_suite

    # Repair pinned-AgentDojo incompatibilities with current models (see docstring).
    make_modern_model_compatible(model)
    if greedy:
        force_greedy_decoding()

    suite = get_suite(BENCHMARK_VERSION, SUITE)
    user_tasks = list(suite.user_tasks.keys())
    if max_user_tasks:
        user_tasks = user_tasks[:max_user_tasks]
    injection_tasks = list(suite.injection_tasks.keys())
    if max_injection_tasks:
        injection_tasks = injection_tasks[:max_injection_tasks]

    # Per-tool-output gateway decisions recorded by the defended pipeline's mediator.
    mediation_sink: list[dict[str, Any]] = []

    def build_pipeline() -> Any:
        # Build the OpenAI LLM element directly with the RAW model string. This
        # bypasses AgentDojo 0.1.30's ModelsEnum (which only knows 2024-era names),
        # so any current/future OpenAI model (e.g. a gpt-5.x reasoning model) works,
        # and lets us pass reasoning_effort. PipelineConfig(llm=<element>) skips the enum.
        import openai
        from agentdojo.agent_pipeline.llms.openai_llm import OpenAILLM

        client_kwargs: dict[str, Any] = {}
        if base_url:
            client_kwargs["base_url"] = base_url
        key = api_key or os.environ.get("OPENAI_API_KEY") or ("EMPTY" if base_url else None)
        if key:
            client_kwargs["api_key"] = key
        llm = OpenAILLM(openai.OpenAI(**client_kwargs), model, reasoning_effort=reasoning_effort or None)
        if not getattr(llm, "name", None):
            llm.name = model
        if not defended:
            return AgentPipeline.from_config(
                PipelineConfig(llm=llm, defense=None, system_message_name=None, system_message=None)
            )
        # Defended: route every tool output through the REAL gateway context-provenance
        # guard and rewrite it per verdict (demoted -> wrapped as data; rejected -> withheld)
        # BEFORE the model sees it. The gateway is authoritative; we only transport + apply.
        from agentdojo.agent_pipeline.agent_pipeline import load_system_message

        from .live_defence import build_defended_pipeline
        from .simurgh_client import SimurghClient

        client = SimurghClient()
        client.create_session()  # raises GatewayUnavailable if the local gateway is down
        return build_defended_pipeline(llm, load_system_message(None), client, mediation_sink)

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
    rows = _rows_from_results(
        benign, defence=defence_label, model=model, provider_label=provider_label
    ) + _rows_from_results(security, defence=defence_label, model=model, provider_label=provider_label)

    # When only one arm is run, both baseline/defended inputs are the same arm; the
    # aggregator still emits valid metadata-only metrics for the arm we have.
    artifacts = build_stage3j_artifacts(rows, rows, scope="workspace-live")
    # Record the endpoint HOST only (never the key or full URL with credentials).
    endpoint = "api.openai.com"
    if base_url:
        from urllib.parse import urlparse

        endpoint = urlparse(base_url).hostname or base_url
    artifacts["live-manifest.json"] = {
        "stage": "1-LIVE",
        "model": f"{provider_label}:{model}",
        "provider_mode": "live",
        "endpoint_host": endpoint,
        "decoding": "greedy" if greedy else "default",
        "suite": SUITE,
        "attack": ATTACK,
        "benchmark_version": BENCHMARK_VERSION,
        "defence": defence_label,
        "user_tasks_run": len(user_tasks),
        "mediation": {
            "tool_outputs_mediated": len(mediation_sink),
            "demoted": sum(1 for s in mediation_sink if s["decision"] == "demoted"),
            "rejected": sum(1 for s in mediation_sink if s["decision"] == "rejected"),
            "accepted": sum(1 for s in mediation_sink if s["decision"] == "accepted"),
        }
        if defended
        else None,
        "note": (
            "Live keyed run; metadata-only. Baseline ASR may be zero when the live model "
            "natively resists the attack (e.g. gpt-5.4-mini scored 0 ASR on the workspace "
            "suite). A zero baseline means there is no successful attack for a downstream "
            "containment layer to catch; it is reported honestly, never as a defence win."
        ),
    }
    write_json_artifacts(out_dir, artifacts)
    return artifacts


def main(argv: list[str] | None = None) -> int:  # pragma: no cover - opt-in
    p = argparse.ArgumentParser(
        description="Stage 1-LIVE AgentDojo with a real agent (OpenAI-hosted or a self-hosted "
        "OpenAI-compatible endpoint such as vLLM on RunPod). Opt-in."
    )
    p.add_argument("--model", default="gpt-4o-mini-2024-07-18", help="model id (e.g. meta-llama/Llama-3.3-70B-Instruct)")
    p.add_argument("--out", required=True)
    p.add_argument("--max-user-tasks", type=int, default=5, help="cost control")
    p.add_argument("--max-injection-tasks", type=int, default=None, help="cost control")
    p.add_argument(
        "--reasoning-effort",
        default=None,
        choices=["none", "low", "medium", "high", "xhigh"],
        help="for reasoning models (e.g. gpt-5.x); omit for open models",
    )
    p.add_argument(
        "--base-url",
        default=None,
        help="OpenAI-compatible endpoint, e.g. https://<pod>-8000.proxy.runpod.net/v1 (vLLM). "
        "When set, a real OpenAI key is not required.",
    )
    p.add_argument(
        "--api-key",
        default=None,
        help="API key for the endpoint; defaults to OPENAI_API_KEY, or 'EMPTY' for a self-hosted "
        "endpoint. Prefer the OPENAI_API_KEY env var so the key never lands in shell history.",
    )
    p.add_argument(
        "--greedy",
        action="store_true",
        help="force deterministic greedy decoding (temperature=0, seed=0) for byte-reproducible "
        "offline replay; recommended for self-hosted endpoints, not OpenAI reasoning models",
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
        base_url=args.base_url,
        api_key=args.api_key,
        greedy=args.greedy,
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
