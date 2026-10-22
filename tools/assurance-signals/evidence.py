"""Source-bound phase 6 evidence with raw receiver/controller records and fresh replay."""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from experiment import CASES, POLICIES, ROOT, execute, read_storage, validate
from observer import connection, decode, read_database
from reproduce import preflight, read_pack, sha, wire, write_pack

PROTOCOL = ROOT / "docs/research/signals-phase-6/protocol.json"


def summarize(rows):
    result = {}
    for policy in POLICIES:
        group = [r for r in rows if r["policy"] == policy and r["case"] != "inflight"]
        result[policy] = {
            "cases": len(group),
            "blocked": sum(r["result"]["status"] == "blocked" for r in group),
            "observed": sum(r["result"]["status"] == "observed" for r in group),
            "unknown": sum(r["result"]["status"] == "unknown" for r in group),
            "receiver_effects": sum(len(r["effects"]) for r in group),
            "pending_alerts": sum(r["state"]["pending"] for r in group),
        }
    result["inflight"] = {
        r["policy"]: {
            "prior_effects": len(r["effects"]),
            "later_status": r["result"]["status"],
        }
        for r in rows
        if r["case"] == "inflight"
    }
    return result


def read_control(path):
    db = connection(path)
    try:
        expected = [
            ("table", name)
            for name in ("config", "decisions", "events", "inbox", "state")
        ]
        objects = db.execute(
            "SELECT type,name FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' ORDER BY name"
        ).fetchall()
        if objects != expected or db.execute("PRAGMA quick_check").fetchall() != [
            ("ok",)
        ]:
            raise ValueError("controller_schema")
        rows = db.execute("SELECT revision,terminal,paused FROM state").fetchall()
        if len(rows) != 1 or rows[0][1] not in (0, 1) or rows[0][2] not in (0, 1):
            raise ValueError("controller_state")
        revision, terminal, paused = rows[0]
        pending = db.execute(
            "SELECT count(*) FROM inbox WHERE status='pending'"
        ).fetchone()[0]
        events = [
            dict(seq=seq, **decode(payload))
            for seq, payload in db.execute(
                "SELECT seq,payload FROM events ORDER BY seq"
            )
        ]
        return {
            "events": events,
            "storage": read_storage(path),
            "state": {
                "revision": revision,
                "terminal": bool(terminal),
                "paused": bool(paused),
                "pending": pending,
            },
        }
    finally:
        db.close()


def check_files(files):
    report = decode(files["report.json"])
    if (
        type(report) is not dict
        or set(report)
        != {"schema", "protocol_sha256", "protocol_commit", "rows", "summary"}
        or report["schema"] != "simurgh-phase6-report-v1"
    ):
        raise ValueError("report_schema")
    rows = report["rows"]
    validate(rows)
    if wire(report["summary"]) != wire(summarize(rows)):
        raise ValueError("summary_mismatch")
    inventory = {"report.json"}
    with tempfile.TemporaryDirectory(prefix="signals-check-") as directory:
        path = Path(directory) / "snapshot.sqlite"
        for row in rows:
            prefix = "snapshots/" + row["case"] + "-" + row["policy"] + "-"
            for name, checker, fields in [
                ("observed.sqlite", read_database, ("effects", "keys")),
                ("control.sqlite", read_control, ("events", "state", "storage")),
            ]:
                member = prefix + name
                inventory.add(member)
                path.write_bytes(files[member])
                if wire(checker(path)) != wire({k: row[k] for k in fields}):
                    raise ValueError("raw_snapshot_mismatch")
    if set(files) != inventory:
        raise ValueError("pack_inventory")
    return report


def check_protocol():
    preflight()
    p = decode(PROTOCOL.read_bytes())
    if (
        p["schema"] != "simurgh-phase6-protocol-v1"
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
    for name, digest in decode(PROTOCOL.read_bytes())["sources"].items():
        if sha(read(name)) != digest:
            raise ValueError("source_not_frozen:" + name)


def verify(path, expected_root):
    digest = check_protocol()
    report = check_files(read_pack(path, expected_root))
    if report["protocol_sha256"] != digest:
        raise ValueError("protocol_binding")
    committed_protocol(report["protocol_commit"])
    with tempfile.TemporaryDirectory(prefix="signals-replay-") as directory:
        rows, _ = execute(Path(directory) / "matrix")
    if wire(rows) != wire(report["rows"]):
        raise ValueError("fresh_replay_mismatch")
    return {
        "verified": True,
        "matrix_rows": 42,
        "inflight_drills": 2,
        "raw_snapshots": 88,
        "manifest_sha256": expected_root,
        "provider_delivery": "synthetic-only",
        "independent_custody": False,
    }


def run(output):
    digest = check_protocol()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    committed_protocol(commit)
    output.mkdir(parents=True, exist_ok=False)
    try:
        rows, files = execute(output / "matrix")
        report = {
            "schema": "simurgh-phase6-report-v1",
            "protocol_sha256": digest,
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
