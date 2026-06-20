# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 3J full-run aggregator (pure) + opt-in all-suite orchestrator.

The aggregator is CI-safe and unit-tested. run_full_agentdojo drives the real
pinned benchmark via the Stage 3H/3I deterministic ground-truth pipeline and is
maintainer-operated (needs agentdojo==0.1.30); it is never imported by unit tests.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from .evidence_writer import write_json_artifacts
from .layer2_sanitise import sanitise_agentdojo_rows
from .stage3i_error_taxonomy import build_error_taxonomy
from .stage3j_metrics import compute_stage3j_metrics
from .stage3j_suite_breakdown import build_suite_breakdown


def build_stage3j_artifacts(
    baseline_rows: list[dict[str, Any]],
    defended_rows: list[dict[str, Any]],
    *,
    scope: str,
) -> dict[str, dict[str, Any]]:
    """scope is 'workspace' or 'all-suite'. Emits metadata-only artifacts."""
    b = sanitise_agentdojo_rows(baseline_rows)
    d = sanitise_agentdojo_rows(defended_rows)
    return {
        f"{scope}-metrics.json": compute_stage3j_metrics(b, d),
        f"{scope}-suite-breakdown.json": build_suite_breakdown(b, d),
        f"{scope}-taxonomy.json": {
            "stage": "3J",
            "scope": scope,
            "entries": build_error_taxonomy(d),
        },
    }


def run_full_agentdojo(
    *, suites: list[str], out_dir: str | Path, scope: str
) -> dict[str, Any]:  # pragma: no cover - opt-in, needs agentdojo
    """Drive the pinned benchmark for the given suites. Maintainer-operated."""
    from .layer2_runner import run_all_suites_collect_rows

    baseline_rows, defended_rows = run_all_suites_collect_rows(suites=suites)
    artifacts = build_stage3j_artifacts(baseline_rows, defended_rows, scope=scope)
    write_json_artifacts(out_dir, artifacts)
    return artifacts


def main(argv: list[str] | None = None) -> int:  # pragma: no cover - opt-in
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--scope", choices=["workspace", "all-suite"], required=True)
    parser.add_argument("--suites", nargs="+", required=True)
    args = parser.parse_args(argv)
    run_full_agentdojo(suites=args.suites, out_dir=args.out, scope=args.scope)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
