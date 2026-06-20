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


def run_stage3k(  # pragma: no cover - opt-in, needs agentdojo + gateway
    *,
    suites: list[str],
    out_dir: str | Path,
    seed: int = 1337,
    stage3j_evidence_dir: str | Path = "../../docs/research/llm-shield/evidence/stage-3j",
) -> dict[str, Any]:
    from .layer2_runner import run_all_suites_collect_rows
    from .stage3k_action_open import (
        ACTION_OPEN_CATEGORIES,
        build_action_open_case,
        build_action_open_manifest,
    )
    from .stage3k_manifest import build_stage3k_manifest
    from .stage3k_mutations import OPERATORS, build_mutation_manifest, generate_mutation_set

    baseline_rows, defended_rows = run_all_suites_collect_rows(
        suites=suites, stage="3k", seed=seed
    )
    source_case_ids = sorted(
        {r["security_case_id"] for r in defended_rows if r.get("lane") == "mutation"}
    )
    variants = generate_mutation_set(
        source_case_ids=source_case_ids,
        operators=sorted(OPERATORS),
        params_by_operator={op: {"op": op} for op in OPERATORS},
    )
    mutation_manifest = build_mutation_manifest(variants, seed=seed)
    ao_cases = [
        build_action_open_case(
            source_case_id=r["security_case_id"], category=r["category"], suite=r["suite"]
        )
        for r in defended_rows
        if r.get("lane") == "action_open"
    ]
    action_open_manifest = build_action_open_manifest(ao_cases)

    # Fix 1: provenance hashes must be non-empty for the committed real run.
    stage3j_hashes = collect_stage3j_evidence_hashes(stage3j_evidence_dir)
    if not stage3j_hashes:
        raise RuntimeError(
            "stage3k real run requires non-empty Stage 3J evidence hashes; "
            f"none found under {stage3j_evidence_dir}"
        )

    manifest = build_stage3k_manifest(
        stage3j_source_tag="v1.3.0-stage-3j-full-agentdojo-external-evaluation",
        stage3j_evidence_hashes=stage3j_hashes,
        agentdojo_version_pin="agentdojo==0.1.30",
        operators=sorted(OPERATORS),
        action_open_categories=sorted(ACTION_OPEN_CATEGORIES),
        expected_counts={
            "mutation_variant_count": mutation_manifest["mutation_variant_count"],
            "action_open_case_count": action_open_manifest["action_open_case_count"],
        },
    )
    artifacts = build_stage3k_artifacts(
        baseline_rows,
        defended_rows,
        manifest=manifest,
        mutation_manifest=mutation_manifest,
        action_open_manifest=action_open_manifest,
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
