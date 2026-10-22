"""Freeze-bound phase 5 evidence; verification includes fresh native replay."""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from experiment import (
    CASES,
    POLICIES,
    ROOT,
    projection,
    read_database,
    run_case,
    run_inflight,
    validate_rows,
)
from observer import decode
from reproduce import preflight, read_pack, sha, wire, write_pack

DOCS = ROOT / "docs/research/recovery-phase-5"
PROTOCOL = DOCS / "protocol.json"


def summarize(rows, drills):
    result = {}
    for policy in POLICIES:
        subset = [r for r in rows if r["policy"] == policy]
        from experiment import VIOLATIONS

        result[policy] = {
            "cases": len(subset),
            "useful": sum(r["useful"] for r in subset),
            "unauthorized": sum(r["unsafe"] for r in subset),
            "unknown": sum(r["result"]["status"] == "unknown" for r in subset),
            "declined": sum(r["result"]["status"] == "declined" for r in subset),
            "recovered": sum(r["result"]["recovery"] for r in subset),
            "detected": sum(
                any(e["type"] == "detected" for e in r["events"]) for r in subset
            ),
            "false_alarms": sum(
                r["case"] not in VIOLATIONS
                and any(e["type"] == "detected" for e in r["events"])
                for r in subset
            ),
            "declared_violation_cases": sum(r["case"] in VIOLATIONS for r in subset),
            "other_cases": sum(r["case"] not in VIOLATIONS for r in subset),
        }
    result["inflight"] = {
        "cases": len(drills),
        "committed_before_revoke": sum(r["useful"] for r in drills),
        "later_blocked": sum(r["result"]["status"] == "blocked" for r in drills),
    }
    return result


def execute(directory):
    directory.mkdir(parents=True, exist_ok=False)
    rows, drills, files = [], [], {}
    for case in (*CASES, "inflight"):
        for policy in POLICIES:
            name = case + "-" + policy
            child = directory / name
            row = (
                run_inflight(policy, child)
                if case == "inflight"
                else run_case(case, policy, child)
            )
            (child / "row.json").write_bytes(wire(row))
            (drills if case == "inflight" else rows).append(row)
            files["snapshots/" + name + ".sqlite"] = (
                child / "observed.sqlite"
            ).read_bytes()
    validate_rows(rows)
    validate_rows(drills, drills=True)
    return rows, drills, files


def check_files(files):
    report = decode(files["report.json"])
    if report["schema"] != "simurgh-phase5-report-v1":
        raise ValueError("report_schema")
    rows, drills = report["rows"], report["drills"]
    validate_rows(rows)
    validate_rows(drills, drills=True)
    if wire(report["summary"]) != wire(summarize(rows, drills)):
        raise ValueError("summary_mismatch")
    expected = {"report.json"}
    with tempfile.TemporaryDirectory(prefix="phase5-verify-") as d:
        path = Path(d) / "observed.sqlite"
        for row in rows + drills:
            name = "snapshots/" + row["case"] + "-" + row["policy"] + ".sqlite"
            expected.add(name)
            if name not in files:
                raise ValueError("missing_snapshot")
            path.write_bytes(files[name])
            actual = read_database(path)
            if wire(actual) != wire({"effects": row["effects"], "keys": row["keys"]}):
                raise ValueError("raw_effect_mismatch")
    if set(files) != expected:
        raise ValueError("pack_inventory")
    return report


def check_protocol():
    preflight()

    p = decode(PROTOCOL.read_bytes())
    if (
        p["schema"] != "simurgh-phase5-protocol-v1"
        or p["cases"] != list(CASES)
        or p["policies"] != list(POLICIES)
        or p["drills"] != ["inflight"]
        or not p["sources"]
    ):
        raise ValueError("protocol_mismatch")
    for name, digest in p["sources"].items():
        path = ROOT / name
        if path.is_symlink() or not path.is_file() or sha(path.read_bytes()) != digest:
            raise ValueError("source_binding:" + name)
    return p


def committed_protocol(commit):
    if (
        type(commit) is not str
        or len(commit) != 40
        or any(c not in "0123456789abcdef" for c in commit)
    ):
        raise ValueError("protocol_commit")
    raw = subprocess.check_output(
        ["git", "show", commit + ":" + str(PROTOCOL.relative_to(ROOT))], cwd=ROOT
    )
    if raw != PROTOCOL.read_bytes():
        raise ValueError("protocol_not_committed")


def verify(path, expected_root):
    check_protocol()
    files = read_pack(path, expected_root)
    report = check_files(files)
    if set(report) != {
        "schema",
        "protocol_sha256",
        "protocol_commit",
        "rows",
        "drills",
        "summary",
    } or report["protocol_sha256"] != sha(PROTOCOL.read_bytes()):
        raise ValueError("report_binding")
    committed_protocol(report["protocol_commit"])
    with tempfile.TemporaryDirectory(prefix="phase5-replay-") as d:
        rows, drills, _ = execute(Path(d) / "matrix")
    if wire(projection([report["rows"], report["drills"]])) != wire(
        projection([rows, drills])
    ):
        raise ValueError("fresh_replay_mismatch")
    return {
        "verified": True,
        "matrix_rows": len(rows),
        "inflight_drills": len(drills),
        "manifest_sha256": expected_root,
        "independence": "not-established",
    }


def run(output):
    check_protocol()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    committed_protocol(commit)
    output.mkdir(parents=True, exist_ok=False)
    try:
        rows, drills, files = execute(output / "matrix")
        report = {
            "schema": "simurgh-phase5-report-v1",
            "protocol_sha256": sha(PROTOCOL.read_bytes()),
            "protocol_commit": commit,
            "rows": rows,
            "drills": drills,
            "summary": summarize(rows, drills),
        }
        files["report.json"] = wire(report)
        check_files(files)
        (output / "report.json").write_bytes(wire(report))
        root = write_pack(output / "evidence.zip", files)
        receipt = verify(output / "evidence.zip", root)
        (output / "receipt.json").write_bytes(wire(receipt))
        print(json.dumps(receipt, sort_keys=True), flush=True)
    except BaseException as exc:
        (output / "failure.json").write_bytes(
            wire(
                {
                    "complete": False,
                    "error_type": type(exc).__name__,
                    "completed_case_files": len(list(output.glob("matrix/*/row.json"))),
                }
            )
        )
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    capture = sub.add_parser("run")
    capture.add_argument("--out", type=Path, required=True)
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    args = parser.parse_args()
    if args.command == "run":
        run(args.out.resolve())
    else:
        print(json.dumps(verify(args.pack, args.expected_root), sort_keys=True))


if __name__ == "__main__":
    main()
