"""Explicit import bridge to frozen model capture and composed control modules."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-eval"))
from capture import Provider
from spec import TOOLS, canonical, digest, loads, parse

sys.path.insert(0, str(ROOT / "tools/assurance-composed"))
import composition
import experiment as composed
from reproduce import read_pack, wire, write_pack
from transport import Service
from workflow import native_delivery

sys.path.insert(0, str(Path(__file__).resolve().parent))
DOCS = ROOT / "docs/research/model-composition-phase-10"
MANIFEST = (
    ROOT
    / "docs/assurance/safety-study/evidence/model-research/official-3b-prospective-manifest.json"
)
__all__ = [
    "DOCS",
    "MANIFEST",
    "ROOT",
    "TOOLS",
    "Provider",
    "Service",
    "canonical",
    "composed",
    "composition",
    "digest",
    "loads",
    "native_delivery",
    "parse",
    "read_pack",
    "wire",
    "write_pack",
]
