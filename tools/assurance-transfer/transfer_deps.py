# ruff: noqa: E402
"""Reuse frozen mechanisms without modifying their source."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-model-composed"))
from deps import (
    Provider,
    MANIFEST,
    TOOLS,
    canonical,
    loads,
    parse,
    wire,
    write_pack,
    composed,
    native_delivery,
)
from contract import CONTROLS, action, messages, validate_tasks
from trial import run_branch, paths_for, observe
from audit import wilson

sys.path.insert(0, str(ROOT / "tools/assurance-reliability"))
from reliability import CASES, CONTROLS as REL_CONTROLS, REPETITIONS, run_case
from reliability_evidence import check_rows, summarize as reliability_summary

sys.path.insert(0, str(Path(__file__).resolve().parent))
DOCS = ROOT / "docs/research/transfer-phase-17"

__all__ = [
    "ROOT",
    "DOCS",
    "Provider",
    "MANIFEST",
    "TOOLS",
    "canonical",
    "loads",
    "parse",
    "wire",
    "write_pack",
    "composed",
    "native_delivery",
    "CONTROLS",
    "action",
    "messages",
    "validate_tasks",
    "run_branch",
    "paths_for",
    "observe",
    "wilson",
    "CASES",
    "REL_CONTROLS",
    "REPETITIONS",
    "run_case",
    "check_rows",
    "reliability_summary",
]
