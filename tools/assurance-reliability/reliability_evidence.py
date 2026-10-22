"""Complete raw reliability evidence and fresh schedule-invariant validation."""

import argparse
import hashlib
import math
import sqlite3
import statistics
import subprocess
import tempfile
from collections import Counter
from pathlib import Path

from reliability import CASES, CONTROLS, REPETITIONS, execute, validate_row
from reliability_deps import (
    DOCS,
    ROOT,
    loads,
    observe,
    paths_for,
    preflight,
    read_pack,
    wire,
    write_pack,
)

PROTOCOL = DOCS / "protocol.json"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def schedule_inventory():
    return [
        (case, rep, control)
        for rep in REPETITIONS
        for case in CASES
        for control in CONTROLS
    ]


def check_rows(rows, files, *, inventory=None):
    expected = schedule_inventory() if inventory is None else inventory
    if not expected or type(rows) is not list or len(rows) != len(expected):
        raise ValueError("row_inventory")
    names = set()
    with tempfile.TemporaryDirectory(prefix="reliability-raw-") as td:
        d = Path(td)
        (d / "controls").mkdir()
        for row, identity in zip(rows, expected):
            if (row["case"], row["repetition"], row["control"]) != identity:
                raise ValueError("row_order")
            validate_row(row)
            paths = paths_for(d)
            paths["service-before"] = d / "service-before.sqlite"
            for kind, path in paths.items():
                name = (
                    f"snapshots/{identity[0]}-{identity[1]}-{identity[2]}-{kind}.sqlite"
                )
                names.add(name)
                path.write_bytes(files[name])
            try:
                raw = observe(d)
            except sqlite3.DatabaseError as exc:
                raise ValueError("raw_database") from exc
            if set(row) != set(raw) | {
                "case",
                "repetition",
                "control",
                "calls",
                "initial",
                "transition",
            } or wire(raw) != wire({k: row[k] for k in raw}):
                raise ValueError("raw_state_mismatch")
    if set(files) != names:
        raise ValueError("snapshot_inventory")


def summarize(rows):
    if not rows:
        raise ValueError("empty_results")
    for row in rows:
        validate_row(row)
    result = {
        "fixtures": len(rows),
        "final_calls": sum(len(r["calls"]) for r in rows),
        "initial_calls": sum(r["initial"] is not None for r in rows),
        "controls": {},
    }
    for control in CONTROLS:
        group = [r for r in rows if r["control"] == control]
        calls = [c for r in group for c in r["calls"]]
        durations = sorted(c["finished"] - c["started"] for c in calls)
        result["controls"][control] = {
            "fixtures": len(group),
            "final_calls": len(calls),
            "statuses": dict(Counter(c["native"]["status"] for c in calls)),
            "new_effects": sum(len(r["new_effects"]) for r in group),
            "prior_effects": sum(len(r["before_effects"]) for r in group),
            "held_fixtures": sum(r["held"] for r in group),
            "latency": {
                "n": len(durations),
                "median_seconds": statistics.median(durations) if durations else None,
                "p95_seconds": durations[math.ceil(0.95 * len(durations)) - 1]
                if durations
                else None,
            },
            "schedules": {
                case: {
                    "fixtures": sum(r["case"] == case for r in group),
                    "new_effects": sum(
                        len(r["new_effects"]) for r in group if r["case"] == case
                    ),
                    "statuses": dict(
                        Counter(
                            c["native"]["status"]
                            for r in group
                            if r["case"] == case
                            for c in r["calls"]
                        )
                    ),
                }
                for case in CASES
            },
        }
    return result


def expected_sources():
    inherited = ROOT / "docs/research/model-composition-phase-10/protocol.json"
    return (
        set(loads(inherited.read_bytes())["sources"])
        | {str(inherited.relative_to(ROOT))}
        | {
            str(p.relative_to(ROOT))
            for p in (ROOT / "tools/assurance-reliability").rglob("*.py")
        }
    )


def check_protocol():
    preflight()
    p = loads(PROTOCOL.read_bytes())
    expected = {
        "schema": "simurgh-phase13-protocol-v1",
        "cases": list(CASES),
        "controls": list(CONTROLS),
        "repetitions": list(REPETITIONS),
        "workers": 4,
        "fixture_clock": 100,
        "fixtures": 60,
        "final_calls": 210,
        "initial_calls": 10,
        "raw_snapshots": 600,
        "replay_semantics": "fresh-schedule-invariants-not-timing-or-winner-equality",
    }
    if (
        set(p) != set(expected) | {"sources"}
        or any(p[k] != v for k, v in expected.items())
        or set(p["sources"]) != expected_sources()
    ):
        raise ValueError("protocol_inventory")
    for name, h in p["sources"].items():
        path = ROOT / name
        if path.is_symlink() or not path.is_file() or sha(path.read_bytes()) != h:
            raise ValueError("source_binding:" + name)
    return sha(PROTOCOL.read_bytes())


def committed_protocol(commit):
    if (
        type(commit) is not str
        or len(commit) != 40
        or any(c not in "0123456789abcdef" for c in commit)
    ):
        raise ValueError("protocol_commit")

    def read(name):
        return subprocess.check_output(["git", "show", commit + ":" + name], cwd=ROOT)

    if read(str(PROTOCOL.relative_to(ROOT))) != PROTOCOL.read_bytes():
        raise ValueError("protocol_not_committed")
    for name, h in loads(PROTOCOL.read_bytes())["sources"].items():
        if sha(read(name)) != h:
            raise ValueError("source_not_frozen:" + name)


def verify(path, expected_root):
    digest = check_protocol()
    files = read_pack(path, expected_root)
    report = loads(files.pop("report.json"))
    if (
        set(report)
        != {"schema", "protocol_sha256", "protocol_commit", "rows", "summary"}
        or report["schema"] != "simurgh-phase13-report-v1"
        or report["protocol_sha256"] != digest
    ):
        raise ValueError("report_schema")
    committed_protocol(report["protocol_commit"])
    check_rows(report["rows"], files)
    if wire(report["summary"]) != wire(summarize(report["rows"])):
        raise ValueError("summary_mismatch")
    with tempfile.TemporaryDirectory(prefix="reliability-fresh-") as td:
        fresh, raw = execute(Path(td) / "run")
        check_rows(fresh, raw)
    return {
        "verified": True,
        "fixtures": 60,
        "final_calls": 210,
        "initial_calls": 10,
        "raw_snapshots": 600,
        "manifest_sha256": expected_root,
        "fresh_schedule_invariants": True,
        "byte_identical_replay": False,
        "timing_attestation": False,
        "independent_custody": False,
    }


def run(out):
    digest = check_protocol()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    committed_protocol(commit)
    out.mkdir(parents=True, exist_ok=False)
    try:
        rows, files = execute(out / "matrix")
        report = {
            "schema": "simurgh-phase13-report-v1",
            "protocol_sha256": digest,
            "protocol_commit": commit,
            "rows": rows,
            "summary": summarize(rows),
        }
        check_rows(rows, files)
        files["report.json"] = wire(report)
        (out / "report.json").write_bytes(files["report.json"])
        root = write_pack(out / "evidence.zip", files)
        (out / "ROOT.sha256").write_text(root + "\n")
        receipt = verify(out / "evidence.zip", root)
        (out / "receipt.json").write_bytes(wire(receipt))
        print(wire(receipt).decode(), end="")
    except BaseException as exc:
        (out / "failure.json").write_bytes(
            wire(
                {
                    "complete": False,
                    "error_type": type(exc).__name__,
                    "retained_rows": len(list(out.glob("matrix/*/row.json"))),
                }
            )
        )
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    r = sub.add_parser("run")
    r.add_argument("--out", type=Path, required=True)
    v = sub.add_parser("verify")
    v.add_argument("pack", type=Path)
    v.add_argument("--expected-root", required=True)
    a = parser.parse_args()
    if a.command == "run":
        run(a.out)
    else:
        print(wire(verify(a.pack, a.expected_root)).decode(), end="")


if __name__ == "__main__":
    main()
