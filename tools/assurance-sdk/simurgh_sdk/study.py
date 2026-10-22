# SPDX-License-Identifier: AGPL-3.0-or-later
"""Run actual SDK lifecycles against the unchanged local effects baseline."""

import argparse
import asyncio
import hashlib
import json
import re
import sys
import tempfile
from copy import deepcopy
from importlib.metadata import version
from pathlib import Path

from . import langgraph_adapter, openai_adapter
from .bridge import ROOT, Bridge, load_scenarios, parse_json
from .network import deny_network

BASELINE = ROOT / "docs/assurance/evidence/report.json"
MODES = ("bypass", "exact-policy", "deny-all")
ADAPTERS = {
    "openai-agents": openai_adapter.run_actions,
    "langgraph": langgraph_adapter.run_actions,
}
PROJECTION = (
    "authority",
    "trace",
    "observation",
    "attackApplied",
    "benignCompleted",
    "verdict",
)
SCHEMA = "simurgh.assurance-sdk.v1"


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def manifest():
    own = ROOT / "tools/assurance-sdk"
    paths = list(own.rglob("*.py")) + [
        own / "bridge.mjs",
        own / "requirements.in",
        own / "requirements.lock",
    ]
    paths += list((ROOT / "tools/assurance-lab").glob("*.mjs")) + [BASELINE]
    return {
        str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(paths)
    }


def check_versions():
    lock = (ROOT / "tools/assurance-sdk/requirements.lock").read_text()
    for name, pinned in re.findall(
        r"^([A-Za-z0-9_.-]+)==([^\s\\]+)", lock, re.MULTILINE
    ):
        if version(name) != pinned:
            raise RuntimeError(f"dependency_version_mismatch:{name}")
    return {name: version(name) for name in ADAPTERS}


async def invoke(adapter, scenario, mode, decisions=None):
    actual_actions, actual_results, observed = [], [], []
    with Bridge(scenario["id"], mode) as bridge:

        async def execute(action):
            result = bridge.execute(action)
            actual_actions.append(deepcopy(action))
            actual_results.append(deepcopy(result))
            return result

        async def observe():
            result = bridge.snapshot()
            observed.append(deepcopy(result))
            return result

        try:
            runtime = await adapter(
                scenario["proposals"], execute, observe, decisions=decisions
            )
        except NotImplementedError as error:
            if str(error) != "in_place_edit_unsupported" or actual_actions or observed:
                raise
            return {
                "status": "unsupported",
                "reason": str(error),
                "runtime": None,
                "actualActions": [],
                "observation": bridge.snapshot(),
            }
        if canonical(runtime["tool_results"]) != canonical(actual_results) or canonical(
            runtime["pause_observations"]
        ) != canonical(observed):
            raise RuntimeError("adapter_evidence_mismatch")
        count = len(scenario["proposals"])
        if (
            runtime["interruptions"] != count
            or runtime["resumptions"] != count
            or len(observed) != count
        ):
            raise RuntimeError("missing_native_lifecycle")
        choices = decisions or [{"type": "approve"} for _ in scenario["proposals"]]
        expected_actions = [
            choice.get("action", action)
            for action, choice in zip(scenario["proposals"], choices, strict=True)
            if choice["type"] != "reject"
        ]
        if canonical(actual_actions) != canonical(expected_actions):
            raise RuntimeError("tool_arguments_or_callback_count_changed")
        prefix, cursor = [], 0
        for observation, choice in zip(observed, choices, strict=True):
            if observation["available"] and canonical(
                observation["effects"]
            ) != canonical(prefix):
                raise RuntimeError("effect_before_approval")
            if choice["type"] != "reject":
                result = actual_results[cursor]
                cursor += 1
                if result["status"] == "executed":
                    prefix.append(result["event"])
        finished = bridge.finish()
        return {
            "status": "exercised",
            "runtime": runtime,
            "actualActions": actual_actions,
            "observation": finished["observation"],
            "result": finished,
        }


def summarize(rows):
    result = {}
    for mode in MODES:
        selected = [row for row in rows if row["mode"] == mode]
        effects = [row["projection"] for row in selected]
        result[mode] = {
            "cases": len(selected),
            "forbiddenEffects": sum(
                row["verdict"]["forbiddenEffects"] or 0 for row in effects
            ),
            "benignCompleted": sum(row["benignCompleted"] for row in effects),
            "unknown": sum(
                row["verdict"]["reconciled"] == "unknown" for row in effects
            ),
            "appliedEvidenceMutations": sum(
                row["kind"] == "evidence" and row["projection"]["attackApplied"] is True
                for row in selected
            ),
            "invalidMutations": sum(row["attackApplied"] is False for row in effects),
            "checkpointMismatches": sum(
                row["verdict"]["checkpoint"] == "mismatch" for row in effects
            ),
            "reconciledMismatches": sum(
                row["verdict"]["reconciled"] == "mismatch" for row in effects
            ),
        }
    return result


async def _study():
    versions = check_versions()
    scenarios = load_scenarios()
    baseline = parse_json(BASELINE.read_bytes())
    expected = {(row["id"], row["mode"]): row for row in baseline["cases"]}
    identities = {(scenario["id"], mode) for scenario in scenarios for mode in MODES}
    if len(scenarios) != 17 or len(expected) != 51 or identities != set(expected):
        raise RuntimeError("baseline_inventory_mismatch")
    for relative, digest in baseline["sourceManifest"].items():
        if hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() != digest:
            raise RuntimeError("baseline_source_changed")
    cases, lifecycle, summary = [], [], {}
    for framework, adapter in ADAPTERS.items():
        for mode in MODES:
            for scenario in scenarios:
                captured = await invoke(adapter, scenario, mode)
                if captured["status"] != "exercised":
                    raise RuntimeError("unexpected_unsupported_case")
                projection = {key: captured["result"][key] for key in PROJECTION}
                reference = {
                    key: expected[(scenario["id"], mode)][key] for key in PROJECTION
                }
                if canonical(projection) != canonical(reference):
                    raise RuntimeError(
                        f"baseline_mismatch:{framework}:{mode}:{scenario['id']}"
                    )
                cases.append(
                    {
                        "framework": framework,
                        "id": scenario["id"],
                        "kind": scenario["kind"],
                        "mode": mode,
                        "baselineMatches": True,
                        "projection": projection,
                        "actualActions": captured["actualActions"],
                        "runtime": captured["runtime"],
                    }
                )
        benign = next(
            scenario for scenario in scenarios if scenario["id"] == "benign-patch"
        )
        edited = {**benign["proposals"][0], "content": "changed after approval pause"}
        for case_id, decision in [
            ("native-reject", {"type": "reject"}),
            ("native-edit", {"type": "edit", "action": edited}),
        ]:
            captured = await invoke(
                adapter, benign, "exact-policy", decisions=[decision]
            )
            lifecycle.append({"framework": framework, "id": case_id, **captured})
        summary[framework] = summarize(
            [row for row in cases if row["framework"] == framework]
        )
    return {
        "schema": SCHEMA,
        "scope": "Actual SDK runtimes with scripted proposals and local disk effects; one host/operator; no live model or durable restart claim.",
        "frameworkVersions": versions,
        "sourceManifest": manifest(),
        "cases": cases,
        "lifecycle": lifecycle,
        "summary": summary,
    }


def run_study():
    with deny_network():
        return asyncio.run(_study())


def verify_report(report):
    required = {
        "schema",
        "scope",
        "frameworkVersions",
        "sourceManifest",
        "cases",
        "lifecycle",
        "summary",
    }
    if (
        type(report) is not dict
        or set(report) != required
        or report["schema"] != SCHEMA
        or canonical(report["sourceManifest"]) != canonical(manifest())
        or type(report["cases"]) is not list
        or len(report["cases"]) != 102
    ):
        raise ValueError("report_mismatch: schema, inventory or source manifest")
    if canonical(report) != canonical(run_study()):
        raise ValueError("report_mismatch: fresh execution differs")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("run")
    create.add_argument("--out", type=Path)
    verify = commands.add_parser("verify")
    verify.add_argument("report", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "run":
            path = (
                args.out
                or Path(tempfile.mkdtemp(prefix="simurgh-sdk-report-")) / "report.json"
            )
            report = run_study()
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("x") as stream:
                json.dump(report, stream, indent=2, allow_nan=False)
                stream.write("\n")
            print(
                json.dumps(
                    {"report": str(path), "summary": report["summary"]}, indent=2
                )
            )
        else:
            if args.report.stat().st_size > 2_000_000:
                raise ValueError("report_too_large")
            verify_report(parse_json(args.report.read_bytes()))
            print(
                "Verified: complete SDK matrix matches fresh local execution and source hashes."
            )
    except (ValueError, RuntimeError, OSError) as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
