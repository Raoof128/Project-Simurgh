"""Source-bound composed lifecycle evidence with complete raw state and fresh replay."""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from experiment import CASES, POLICIES, ROOT, TABLES, execute, observe, validate
from observer import decode
from reproduce import preflight, read_pack, sha, wire, write_pack

PROTOCOL = ROOT / "docs/research/composition-phase-9/protocol.json"


def summarize(rows):
    result = {}
    for policy in POLICIES:
        group = [r for r in rows if r["policy"] == policy]
        result[policy] = {
            "cases": len(group),
            **{
                status: sum(r["result"]["status"] == status for r in group)
                for status in ("observed", "denied", "blocked", "unknown")
            },
            "receiver_effects": sum(len(r["effects"]) for r in group),
        }
    return result


def check_files(files):
    report = decode(files["report.json"])
    if (
        type(report) is not dict
        or set(report)
        != {"schema", "protocol_sha256", "protocol_commit", "rows", "summary"}
        or report["schema"] != "simurgh-phase9-report-v1"
    ):
        raise ValueError("report_schema")
    validate(report["rows"])
    if wire(report["summary"]) != wire(summarize(report["rows"])):
        raise ValueError("summary_mismatch")
    inventory = {"report.json"}
    with tempfile.TemporaryDirectory(prefix="composition-check-") as directory:
        paths = {kind: Path(directory) / (kind + ".sqlite") for kind in TABLES}
        for row in report["rows"]:
            prefix = "snapshots/" + row["case"] + "-" + row["policy"] + "-"
            for kind, path in paths.items():
                member = prefix + kind + ".sqlite"
                inventory.add(member)
                path.write_bytes(files[member])
            if wire(observe(paths)) != wire(
                {
                    k: row[k]
                    for k in (
                        "storage",
                        "effects",
                        "effect_count",
                        "held",
                        "leaf_status",
                    )
                }
            ):
                raise ValueError("raw_snapshot_mismatch")
    if set(files) != inventory:
        raise ValueError("pack_inventory")
    return report


def expected_sources():
    inherited = set()
    for name in ("signals-phase-6", "context-phase-7", "credentials-phase-8"):
        protocol = ROOT / "docs/research" / name / "protocol.json"
        inherited.update(decode(protocol.read_bytes())["sources"])
        inherited.add(str(protocol.relative_to(ROOT)))
    own = {
        str(p.relative_to(ROOT))
        for p in (ROOT / "tools/assurance-composed").rglob("*.py")
    }
    return inherited | own


def check_protocol():
    preflight()
    p = decode(PROTOCOL.read_bytes())
    if (
        p["schema"] != "simurgh-phase9-protocol-v1"
        or p["cases"] != list(CASES)
        or p["policies"] != list(POLICIES)
        or set(p["sources"]) != expected_sources()
    ):
        raise ValueError("protocol_inventory")
    for name, d in p["sources"].items():
        path = ROOT / name
        if path.is_symlink() or not path.is_file() or sha(path.read_bytes()) != d:
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
    for name, d in decode(PROTOCOL.read_bytes())["sources"].items():
        if sha(read(name)) != d:
            raise ValueError("source_not_frozen:" + name)


def verify(path, expected_root):
    protocol_digest = check_protocol()
    report = check_files(read_pack(path, expected_root))
    if report["protocol_sha256"] != protocol_digest:
        raise ValueError("protocol_binding")
    committed_protocol(report["protocol_commit"])
    with tempfile.TemporaryDirectory(prefix="composition-replay-") as directory:
        rows, _ = execute(Path(directory) / "matrix")
    if wire(rows) != wire(report["rows"]):
        raise ValueError("fresh_replay_mismatch")
    return {
        "verified": True,
        "matrix_rows": 40,
        "raw_snapshots": 360,
        "manifest_sha256": expected_root,
        "model_inference": False,
        "independent_custody": False,
    }


def run(output):
    protocol_digest = check_protocol()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    committed_protocol(commit)
    output.mkdir(parents=True, exist_ok=False)
    try:
        rows, files = execute(output / "matrix")
        report = {
            "schema": "simurgh-phase9-report-v1",
            "protocol_sha256": protocol_digest,
            "protocol_commit": commit,
            "rows": rows,
            "summary": summarize(rows),
        }
        files["report.json"] = wire(report)
        check_files(files)
        (output / "report.json").write_bytes(files["report.json"])
        root = write_pack(output / "evidence.zip", files)
        receipt = verify(output / "evidence.zip", root)
        (output / "receipt.json").write_bytes(wire(receipt))
        (output / "ROOT.sha256").write_text(root + "\n")
        print(json.dumps(receipt, sort_keys=True), flush=True)
    except BaseException as exc:
        (output / "failure.json").write_bytes(
            wire(
                {
                    "complete": False,
                    "error_type": type(exc).__name__,
                    "retained_rows": len(list(output.glob("matrix/*/row.json"))),
                }
            )
        )
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    launch = sub.add_parser("run")
    launch.add_argument("--out", type=Path, required=True)
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
