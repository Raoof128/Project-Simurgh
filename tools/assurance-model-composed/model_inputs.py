"""Lightweight model inputs usable without application SDK dependencies."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-eval"))
from spec import TOOLS, canonical, loads, parse

DOCS = ROOT / "docs/research/model-composition-phase-10"
MANIFEST = (
    ROOT
    / "docs/assurance/safety-study/evidence/model-research/official-3b-prospective-manifest.json"
)


def wire(value):
    return (canonical(value) + "\n").encode()


__all__ = ["DOCS", "MANIFEST", "ROOT", "TOOLS", "canonical", "loads", "parse", "wire"]
