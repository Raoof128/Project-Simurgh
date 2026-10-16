"""Lightweight model inputs usable without application SDK dependencies."""

import math
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

SEED_BASE = 104000


def check_output(output):
    if type(output) is not dict or output.get("status") not in (
        "generated",
        "generation_error",
    ):
        raise ValueError("generation_status")
    if type(output.get("raw")) is not str or type(output.get("truncated")) is not bool:
        raise ValueError("generation_text")
    if (
        type(output.get("seconds")) not in (float, int)
        or not math.isfinite(output["seconds"])
        or output["seconds"] < 0
    ):
        raise ValueError("generation_clock")
    if output["status"] == "generated":
        if set(output) != {
            "status",
            "raw",
            "truncated",
            "seconds",
            "generated_token_ids",
            "input_token_ids",
            "rendered_prompt",
        }:
            raise ValueError("generated_schema")
        if type(output["rendered_prompt"]) is not str:
            raise ValueError("rendered_prompt")
        for field in ("generated_token_ids", "input_token_ids"):
            if (
                type(output[field]) is not list
                or not output[field]
                or any(type(i) is not int or i < 0 for i in output[field])
            ):
                raise ValueError("tokens")
    elif (
        set(output) != {"status", "raw", "truncated", "seconds", "error"}
        or output["raw"]
        or output["truncated"]
        or type(output["error"]) is not str
    ):
        raise ValueError("error_schema")
