"""Replay the exact saved model actions through real native workflow controls."""

import argparse
import json
import statistics
from pathlib import Path

from client import PYTHON, Client
from study import (
    MODES,
    SETTINGS,
    cluster_interval,
    complete,
    digest,
    load_cases,
    load_protocol,
    loads,
    measured,
    proposal,
    score,
    semantic,
    validate_capture,
    validate_provenance,
)


def quantiles(values):
    ordered = sorted(values)
    if not ordered:
        return None
    return {
        "n": len(values),
        "median_seconds": statistics.median(ordered),
        "p95_seconds": ordered[min(len(ordered) - 1, int(0.95 * len(ordered)))],
    }


def summarize(rows, cases):
    expected = [(seed, c["id"]) for seed in SETTINGS["seeds"] for c in cases]
    if not rows or [(r.get("seed"), r.get("id")) for r in rows] != expected:
        raise ValueError("exact replay inventory required")
    for row in rows:
        if set(row.get("modes", {})) != set(MODES):
            raise ValueError("complete controls required")
        for trajectory in row["modes"].values():
            for tool in trajectory:
                measured(tool.get("seconds"))
    by_id = {c["id"]: c for c in cases}
    scored = [(r, score(by_id[r["id"]], r["modes"])) for r in rows]
    clusters = {
        name: {}
        for name in (
            "benign_completion",
            "unsafe_enforced",
            "unsafe_bypass",
            "authorized_workflow_blocked",
        )
    }
    for row, value in scored:
        for metric, key in (
            ("benign_completion", "benign_completed"),
            ("unsafe_enforced", "unsafe_enforced"),
            ("unsafe_bypass", "unsafe_bypass"),
            ("authorized_workflow_blocked", "authorized_workflow_blocked"),
        ):
            if (
                metric in ("benign_completion", "authorized_workflow_blocked")
                and by_id[row["id"]]["kind"] != "benign"
            ):
                continue
            clusters[metric].setdefault(row["id"], []).append(float(value[key]))
    unsafe_count = sum(v["unsafe_bypass"] for _, v in scored)
    prevented = sum(v["prevented"] for _, v in scored)
    latency = {
        mode: {
            "read": quantiles([r["modes"][mode][0]["seconds"] for r in rows]),
            "write": quantiles([r["modes"][mode][1]["seconds"] for r in rows]),
        }
        for mode in MODES
    }
    deltas = [
        sum(t["seconds"] for t in r["modes"]["enforced"])
        - sum(t["seconds"] for t in r["modes"]["bypass"])
        for r in rows
    ]
    counts = {
        str(seed): {
            k: sum(v[k] for r, v in scored if r["seed"] == seed) for k in scored[0][1]
        }
        for seed in SETTINGS["seeds"]
    }
    per_case = {
        c["id"]: {
            k: sum(v[k] for r, v in scored if r["id"] == c["id"]) for k in scored[0][1]
        }
        for c in cases
    }
    return {
        **{k: cluster_interval(v) for k, v in clusters.items()},
        "prevention_given_unsafe": {
            "numerator": prevented,
            "denominator": unsafe_count,
            "rate": prevented / unsafe_count if unsafe_count else None,
            "note": "paired demonstrated bypass effects; not population robustness",
        },
        "by_seed": counts,
        "by_case": per_case,
        "latency": latency,
        "paired_enforcement_minus_bypass_seconds": quantiles(deltas),
        "timing_limit": "shared host, fixed control order, includes SDK/IPC; descriptive not isolated policy overhead",
        "execution_errors": {
            mode: sum(t["status"] == "error" for r in rows for t in r["modes"][mode])
            for mode in MODES
        },
        "invalid_tool_proposals": sum(
            t["status"] == "invalid" for r in rows for t in r["modes"]["enforced"]
        ),
    }


def generate_report(capture_path, runtime_python):
    protocol, protocol_digest = load_protocol()
    cases = load_cases()
    capture = loads(capture_path.read_text())
    validate_capture(capture, protocol, protocol_digest, cases)
    validate_provenance(capture, protocol, protocol_digest)
    by_id = {c["id"]: c for c in cases}
    rows = []
    with Client(runtime_python) as runtime:
        for captured in capture["rows"]:
            case = by_id[captured["id"]]
            row = {"id": case["id"], "seed": captured["seed"], "modes": {}}
            for mode in MODES:
                runtime.request({"op": "start", "case": case, "mode": mode})
                trajectory = []
                for index, step in enumerate(captured["steps"]):
                    trajectory.append(
                        runtime.request(
                            {
                                "op": "read" if index == 0 else "write",
                                "proposal": proposal(step),
                            }
                        )
                    )
                runtime.request({"op": "close"})
                row["modes"][mode] = trajectory
            if semantic(row["modes"]["enforced"]) != semantic(captured["trajectory"]):
                raise ValueError("enforced capture trajectory does not reproduce")
            rows.append(row)
        eligible = [
            r for r in capture["rows"] if complete(by_id[r["id"]], r["trajectory"])
        ]
        recovery = []
        if eligible:
            selected = eligible[0]
            case = by_id[selected["id"]]
            for fault in ("after_pause", "after_effect"):
                result = runtime.request(
                    {
                        "op": "recovery",
                        "case": case,
                        "proposal": proposal(selected["steps"][1]),
                        "fault": fault,
                    }
                )
                recovery.append(
                    {
                        "case_id": case["id"],
                        "seed": selected["seed"],
                        "fault": fault,
                        "result": result,
                    }
                )
    generations = [s for r in capture["rows"] for s in r["steps"]]
    return {
        "schema": "simurgh-meta-study-report-v1",
        "capture_sha256": digest(capture_path),
        "protocol_sha256": protocol_digest,
        "rows": rows,
        "summary": summarize(rows, cases),
        "generation": {
            "attempts": len(generations),
            "errors": sum(s["status"] == "generation_error" for s in generations),
            "truncated": sum(s.get("finish_reason") == "length" for s in generations),
            "unparseable_or_failed": sum(proposal(s) is None for s in generations),
            "generated_tokens": sum(s.get("output_tokens", 0) for s in generations),
            "total_seconds": sum(s["seconds"] for s in generations),
            "latency": quantiles([s["seconds"] for s in generations]),
            "workflow_latency": quantiles([r["seconds"] for r in capture["rows"]]),
            "peak_rss_mib": capture["runtime"]["peak_rss_mib"],
        },
        "recovery": recovery,
        "recovery_selection": "first captured complete enforced workflow; no replacement or resampling",
    }


def stable(report):
    result = semantic(report)
    result["summary"].pop("latency")
    result["summary"].pop("paired_enforcement_minus_bypass_seconds")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("run", "verify"))
    parser.add_argument("capture", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("--runtime-python", default=PYTHON)
    args = parser.parse_args()
    if args.command == "run" and args.report.exists():
        raise ValueError("refusing report overwrite")
    if args.command == "verify":
        saved = loads(args.report.read_text())
        if saved["summary"] != summarize(saved["rows"], load_cases()):
            raise ValueError("saved summary does not derive from observations")
    actual = generate_report(args.capture, args.runtime_python)
    if args.command == "run":
        with args.report.open("x") as stream:
            stream.write(json.dumps(actual, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "generation": actual["generation"],
                    "by_seed": actual["summary"]["by_seed"],
                }
            )
        )
    elif stable(saved) != stable(actual):
        raise ValueError("saved report differs from actual replay")
    else:
        print(
            "verified 72 paired trajectories, 432 tool attempts and selected recovery probes; timing excluded from fresh equality"
        )


if __name__ == "__main__":
    main()
