"""Source-bound context/lineage evidence with complete raw state and fresh replay."""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from experiment import CASES, POLICIES, ROOT, execute, read_storage, validate
from observer import connection, decode, read_database
from reproduce import CONTRACT, preflight, read_pack, sha, wire, write_pack

PROTOCOL = ROOT / "docs/research/context-phase-7/protocol.json"


def summarize(rows):
    return {
        p: {
            "cases": len(group),
            "observed": sum(r["result"]["status"] == "observed" for r in group),
            "blocked": sum(r["result"]["status"] == "blocked" for r in group),
            "unknown": sum(r["result"]["status"] == "unknown" for r in group),
            "receiver_effects": sum(r["effect_count"] for r in group),
            "summary_discrepancies": sum(bool(r["audit"]) for r in group),
        }
        for p in POLICIES
        for group in [[r for r in rows if r["policy"] == p]]
    }


def read_control(path):
    storage = read_storage(path)
    db = connection(path)
    try:
        config_rows = db.execute("SELECT payload FROM config").fetchall()
        state_rows = db.execute(
            "SELECT source,revision FROM state WHERE id=1"
        ).fetchall()
        if len(config_rows) != 1 or len(state_rows) != 1:
            raise ValueError("controller_state")
        config = decode(config_rows[0][0])
        source, revision = state_rows[0]
        grants = [
            {
                "actor": a,
                "parent": p,
                "actions": decode(s),
                "depth": d,
                "source": v,
                "revoked": bool(r),
            }
            for a, p, s, d, v, r in db.execute("SELECT * FROM grants ORDER BY actor")
        ]
        facts = [
            {"id": i, "kind": k, "detail": d, "blocking": bool(b)}
            for i, k, d, b in db.execute("SELECT * FROM facts ORDER BY id")
        ]
        attempts = [
            {"action_id": a, "actor": p, "status": s}
            for a, p, s in db.execute("SELECT * FROM attempts ORDER BY action_id")
        ]
        projection = {
            "task": config["task"],
            "source": source,
            "revision": revision,
            "grants": grants,
            "facts": facts,
            "attempts": attempts,
            "budget": {"limit": config["budget"], "reserved": len(attempts)},
        }
        return {"storage": storage, "projection": projection}
    finally:
        db.close()


def check_files(files):
    report = decode(files["report.json"])
    if (
        type(report) is not dict
        or set(report)
        != {"schema", "protocol_sha256", "protocol_commit", "rows", "summary"}
        or report["schema"] != "simurgh-phase7-report-v1"
    ):
        raise ValueError("report_schema")
    validate(report["rows"])
    if wire(report["summary"]) != wire(summarize(report["rows"])):
        raise ValueError("summary_mismatch")
    inventory = {"report.json"}
    with tempfile.TemporaryDirectory(prefix="context-check-") as directory:
        path = Path(directory) / "snapshot.sqlite"
        for row in report["rows"]:
            prefix = "snapshots/" + row["case"] + "-" + row["policy"] + "-"
            for k in ("a", "b"):
                name = prefix + k + ".sqlite"
                inventory.add(name)
                path.write_bytes(files[name])
                if wire(read_database(path)) != wire(row["receivers"][k]):
                    raise ValueError("raw_receiver_mismatch")
            name = prefix + "context.sqlite"
            inventory.add(name)
            path.write_bytes(files[name])
            if wire(read_control(path)) != wire(
                {k: row[k] for k in ("storage", "projection")}
            ):
                raise ValueError("raw_controller_mismatch")
    if set(files) != inventory:
        raise ValueError("pack_inventory")
    return report


def expected_sources():
    inherited = set(decode(CONTRACT.read_bytes())["sources"]) | {
        str(CONTRACT.relative_to(ROOT))
    }
    own = {
        str(p.relative_to(ROOT))
        for p in (ROOT / "tools/assurance-context").rglob("*.py")
    }
    return inherited | own


def check_protocol():
    preflight()
    p = decode(PROTOCOL.read_bytes())
    if (
        p["schema"] != "simurgh-phase7-protocol-v1"
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
    with tempfile.TemporaryDirectory(prefix="context-replay-") as directory:
        rows, _ = execute(Path(directory) / "matrix")
    if wire(rows) != wire(report["rows"]):
        raise ValueError("fresh_replay_mismatch")
    return {
        "verified": True,
        "matrix_rows": 36,
        "raw_snapshots": 108,
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
            "schema": "simurgh-phase7-report-v1",
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
