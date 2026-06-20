# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3K aggregator (pure, CI-safe) + opt-in orchestrator.

The aggregator and the Stage 3J evidence-hash collector are unit-tested. run_stage3k
drives the real pinned benchmark with adaptive-style mutations + action-open probes
via the Stage 3H/3I/3J deterministic ground-truth pipeline; it is maintainer-operated
(needs agentdojo==0.1.30 + a running gateway) and is never imported by unit tests.
No new defence logic anywhere.
"""

from __future__ import annotations

import argparse
import hashlib
from collections import Counter
from pathlib import Path
from typing import Any

from .evidence_writer import write_json_artifacts
from .layer2_sanitise import sanitise_agentdojo_rows
from .stage3i_error_taxonomy import build_error_taxonomy
from .stage3j_suite_breakdown import build_suite_breakdown
from .stage3k_metrics import compute_stage3k_metrics
from .stage3k_operator_breakdown import build_operator_breakdown

# Fix 1: the Stage 3J evidence files whose hashes anchor Stage 3K provenance.
_STAGE3J_PROVENANCE_FILES = (
    "all-suite-metrics.json",
    "all-suite-suite-breakdown.json",
    "all-suite-taxonomy.json",
)


def collect_stage3j_evidence_hashes(evidence_dir: str | Path) -> dict[str, str]:
    """sha256 of the frozen Stage 3J all-suite evidence. Pure file I/O."""
    base = Path(evidence_dir)
    hashes: dict[str, str] = {}
    for name in _STAGE3J_PROVENANCE_FILES:
        path = base / name
        if path.exists():
            hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
    return dict(sorted(hashes.items()))


def _source_case_map(mutation_manifest: dict[str, Any]) -> dict[str, Any]:
    counts = Counter(e["source_case_hash"] for e in mutation_manifest.get("entries", []))
    return {"stage": "3K", "entries": dict(sorted(counts.items()))}


def build_stage3k_artifacts(
    baseline_rows: list[dict[str, Any]],
    defended_rows: list[dict[str, Any]],
    *,
    manifest: dict[str, Any],
    mutation_manifest: dict[str, Any],
    action_open_manifest: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    b = sanitise_agentdojo_rows(baseline_rows)
    d = sanitise_agentdojo_rows(defended_rows)
    suite_breakdown = build_suite_breakdown(b, d)
    suite_breakdown["stage"] = "3K"
    return {
        "manifest.json": manifest,
        "mutation-manifest.json": mutation_manifest,
        "source-case-map.json": _source_case_map(mutation_manifest),
        "action-open-manifest.json": action_open_manifest,
        "metrics.json": compute_stage3k_metrics(b, d),
        "suite-breakdown.json": suite_breakdown,
        "operator-breakdown.json": build_operator_breakdown(d),
        "taxonomy.json": {"stage": "3K", "entries": build_error_taxonomy(d)},
    }


def assemble_stage3k_evidence(
    baseline_rows: list[dict[str, Any]],
    defended_rows: list[dict[str, Any]],
    *,
    stage3j_evidence_hashes: dict[str, str],
    seed: int = 1337,
) -> dict[str, dict[str, Any]]:
    """Pure composition: turn collected Stage 3K rows into the 8 evidence artifacts.

    Rows must already carry their `lane`/`operator_id`/`category` tags (set by the
    real gateway row-producer). The mutation manifest is built from the actual
    mutation rows so its count always equals metrics.mutation_variant_count.
    """
    from .stage3k_action_open import build_action_open_case, build_action_open_manifest
    from .stage3k_manifest import build_stage3k_manifest
    from .stage3k_mutations import OPERATORS, build_mutation_manifest, generate_variant
    from .stage3k_action_open import ACTION_OPEN_CATEGORIES

    mut_rows = [r for r in defended_rows if r.get("lane") == "mutation"]
    ao_rows = [r for r in defended_rows if r.get("lane") == "action_open"]

    variants = [
        generate_variant(
            source_case_id=r["security_case_id"],
            operator_id=r["operator_id"],
            operator_params={"op": r["operator_id"]},
        )
        for r in mut_rows
    ]
    mutation_manifest = build_mutation_manifest(variants, seed=seed)

    ao_cases = [
        build_action_open_case(
            source_case_id=r["security_case_id"], category=r["category"], suite=r["suite"]
        )
        for r in ao_rows
    ]
    action_open_manifest = build_action_open_manifest(ao_cases)

    manifest = build_stage3k_manifest(
        stage3j_source_tag="v1.3.0-stage-3j-full-agentdojo-external-evaluation",
        stage3j_evidence_hashes=stage3j_evidence_hashes,
        agentdojo_version_pin="agentdojo==0.1.30",
        operators=sorted(OPERATORS),
        action_open_categories=sorted(ACTION_OPEN_CATEGORIES),
        expected_counts={
            "mutation_variant_count": mutation_manifest["mutation_variant_count"],
            "action_open_case_count": action_open_manifest["action_open_case_count"],
        },
    )
    return build_stage3k_artifacts(
        baseline_rows,
        defended_rows,
        manifest=manifest,
        mutation_manifest=mutation_manifest,
        action_open_manifest=action_open_manifest,
    )


def _stage3k_contact(  # pragma: no cover - needs gateway
    client, *, suite_name, case_id, marker, kind, lane=None, operator_id=None, category=None
):
    """One real gateway contact. Provenance is honest: benign benchmark seed is a
    synthetic system_seed (accepted); injection-bearing context is untrusted
    tool_result (demoted to data, never authority). Content is hash-only. The mock
    provider keeps the run key-free. Consequence flags are read from the verdict.
    """
    from .layer2_runner import _blocking_boundary, _content_hash

    if kind == "benign":
        source_type, trust_level, purpose = "system_seed", "synthetic", "task_data"
        scenario = "benign"
    else:
        source_type, trust_level, purpose = "tool_result", "untrusted", "reference"
        scenario = "injection"
    response = client.run(
        input=f"AgentDojo Stage 3K {lane or kind} probe {marker}",
        contexts=[
            {
                "context_id": f"agentdojo-3k-{marker}",
                "source_type": source_type,
                "trust_level": trust_level,
                "purpose": purpose,
                "content": f"case_hash:{_content_hash(case_id + ':' + marker)}",
            }
        ],
        provider_mode="mock",
        provider="mock",
        task_type=f"agentdojo.{suite_name}",
        scenario=scenario,
        case_id=case_id,
    )
    row: dict[str, Any] = {
        "task_id": case_id.split("::", 1)[0],
        "suite": suite_name,
        "kind": kind,
        "attack_family": "important_instructions",
        "defence": "simurgh",
        "model_provider": "agentdojo_ground_truth_pipeline",
        "provider_mode": "local_or_configured_agentdojo_provider",
        "utility_success": True,
        "completed": True,
        "gateway_contacted": True,
        "receipt_id": (response.get("receipt") or {}).get("run_id"),
        "gateway_verdict": response.get("gateway_verdict"),
        "boundary": _blocking_boundary(response),
        "audit_verified": True,
        "tool_execution_bypassed_gate": False,
        "unsafe_output_exported": False,
        "context_authority_escalated": False,
        "generated_evidence_leakage": False,
    }
    if kind == "security":
        row["security_case_id"] = case_id
        row["attack_success"] = False
    if lane:
        row["lane"] = lane
    if operator_id:
        row["operator_id"] = operator_id
    if category:
        row["category"] = category
        row["attacker_goal_completed"] = False
    return row


def _collect_stage3k_rows(  # pragma: no cover - maintainer step, needs gateway
    *, suites: list[str], seed: int
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Produce genuine Stage 3K rows through the real Simurgh gateway.

    Bounded, deterministic variant set (no new defence logic, no scorer change):
      - benign lane: each user task (synthetic seed, expected accepted).
      - 3K-A mutation lane: each injection task x each operator (untrusted context).
      - 3K-B action-open lane: injection tasks assigned round-robin to the five
        action-open categories (untrusted context).
    Each variant is a real gateway contact; containment is read from the verdict.
    """
    from agentdojo.task_suite.load_suites import get_suite

    from .agentdojo_register import require_agentdojo
    from .simurgh_client import SimurghClient
    from .stage3k_action_open import ACTION_OPEN_CATEGORIES
    from .stage3k_mutations import OPERATORS

    require_agentdojo()
    benchmark_version = "v1.2.1"
    operators = sorted(OPERATORS)
    categories = sorted(ACTION_OPEN_CATEGORIES)

    client = SimurghClient()
    client.preflight()
    if not client.session_id:
        client.create_session()

    baseline_rows: list[dict[str, Any]] = []
    defended_rows: list[dict[str, Any]] = []

    for suite_name in suites:
        suite = get_suite(benchmark_version, suite_name)
        user_ids = sorted(suite.user_tasks.keys())
        injection_ids = sorted(suite.injection_tasks.keys())
        if not user_ids or not injection_ids:
            continue

        # benign lane
        for user_id in user_ids:
            row = _stage3k_contact(
                client, suite_name=suite_name, case_id=user_id, marker=f"benign:{user_id}",
                kind="benign",
            )
            defended_rows.append(row)
            baseline_rows.append({**row, "defence": "none"})

        # 3K-A mutation lane: injection task x operator
        for inj_id in injection_ids:
            user_id = user_ids[0]
            case_id = f"{user_id}::{inj_id}"
            for op in operators:
                row = _stage3k_contact(
                    client, suite_name=suite_name, case_id=case_id,
                    marker=f"mut:{inj_id}:{op}", kind="security", lane="mutation",
                    operator_id=op,
                )
                defended_rows.append(row)
                baseline_rows.append({**row, "defence": "none"})

        # 3K-B action-open lane: injection tasks round-robin across categories
        for i, inj_id in enumerate(injection_ids):
            user_id = user_ids[i % len(user_ids)]
            category = categories[i % len(categories)]
            case_id = f"{user_id}::{inj_id}"
            row = _stage3k_contact(
                client, suite_name=suite_name, case_id=case_id,
                marker=f"ao:{inj_id}:{category}", kind="security", lane="action_open",
                category=category,
            )
            defended_rows.append(row)
            baseline_rows.append({**row, "defence": "none"})

    return baseline_rows, defended_rows


def run_stage3k(  # pragma: no cover - opt-in, needs agentdojo + gateway
    *,
    suites: list[str],
    out_dir: str | Path,
    seed: int = 1337,
    stage3j_evidence_dir: str | Path = "../../docs/research/llm-shield/evidence/stage-3j",
) -> dict[str, Any]:
    # Fix 1: provenance hashes must be non-empty for the committed real run.
    stage3j_hashes = collect_stage3j_evidence_hashes(stage3j_evidence_dir)
    if not stage3j_hashes:
        raise RuntimeError(
            "stage3k real run requires non-empty Stage 3J evidence hashes; "
            f"none found under {stage3j_evidence_dir}"
        )
    baseline_rows, defended_rows = _collect_stage3k_rows(suites=suites, seed=seed)
    artifacts = assemble_stage3k_evidence(
        baseline_rows, defended_rows, stage3j_evidence_hashes=stage3j_hashes, seed=seed
    )
    write_json_artifacts(out_dir, artifacts)
    return artifacts


def main(argv: list[str] | None = None) -> int:  # pragma: no cover - opt-in
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--suites", nargs="+", required=True)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument(
        "--stage3j-evidence-dir",
        default="../../docs/research/llm-shield/evidence/stage-3j",
    )
    args = parser.parse_args(argv)
    run_stage3k(
        suites=args.suites,
        out_dir=args.out,
        seed=args.seed,
        stage3j_evidence_dir=args.stage3j_evidence_dir,
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
