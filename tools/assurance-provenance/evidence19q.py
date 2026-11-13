"""Phase 19q evidence: source-bound pack for the destination-origin measurement over
SLEIGHT-Bench (P19-DEST01), with verify.

On any host ``verify`` checks the pack's structure: every row has exactly the declared fields,
every flag is recomputed from the row's tokens, and the summary and the hypotheses are
recomputed from the rows. With ``--dataset`` and ``--key`` it also checks every
``encrypted.bin`` of the dataset against the digests the protocol records, decrypts them in
memory and recomputes every row. That needs the ``cryptography`` package and a copy of the
dataset at the pinned commit. No model runs, and no dataset text is written.
"""

import argparse
import json
import re
from pathlib import Path

import dest19q
import evidence19d
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19q"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19q-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19q-protocol-v1"
ARM = "destination_origin"
PHASE_19Q_FILES = (
    "dest19q.py",
    "evidence19q.py",
    "projection.py",
    "tests/test_dest19q.py",
    "tests/test_evidence19q.py",
)
NON_CLAIMS = (
    "the sessions are SLEIGHT-Bench's synthetic transcripts; no model ran here and nothing was enforced",
    "the rules are applied to recorded text by a fixed grammar, so a destination a session only produces when it runs is missed, and a real network boundary would see connections this cannot",
    "the benchmark's attacks were written to defeat transcript monitors, not a destination rule; a rule its authors had in mind would be attacked differently",
    "a session flagged on its benign twin as well says nothing about the attack",
    "forty-three pairs give wide intervals, and the multi-stage rule A rests on three attacks",
    "hosts written without a scheme, named git remotes and package indexes reached by a bare install command are outside the grammar",
)
SIDECARS = {
    "summary.json": lambda r: r["summary"],
    "hypotheses.json": lambda r: r["hypotheses"],
}
ROW_KEYS = {
    "session",
    "kind",
    "category",
    "blocks",
    "unread_lines",
    "tool_calls",
    "tokens",
    "flags",
}
TOKEN_KEYS = {"id", "origin", "used_strict", "used_lenient"}
_SESSION = re.compile(r"[a-z0-9_]+/[A-Za-z0-9._\-]+\Z")
_ID = re.compile(r"[0-9a-f]{16}\Z")


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19Q_FILES}


def bound_inputs(given):
    """The part of the dataset inputs a protocol and a report record: no session bytes."""
    return {
        "dataset": given["dataset"],
        "commit": given["commit"],
        "blobs": dict(sorted(given["blobs"].items())),
        "excluded": list(given["excluded"]),
    }


def build_protocol(given):
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": ARM,
        "inputs": bound_inputs(given),
        "rules": list(dest19q.RULES),
        "readings": list(dest19q.READINGS),
        "primary": list(dest19q.PRIMARY),
        "q1_sessions": list(dest19q.Q1_SESSIONS),
        "q1_need": dest19q.Q1_NEED,
        "q3_sessions": list(dest19q.Q3_SESSIONS),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
        "sources": {
            n: sha((ROOT / n).read_bytes()) for n in sorted(expected_sources())
        },
    }


def check_protocol(path, given=None):
    raw = Path(path).read_bytes()
    p = loads(raw)
    if (
        type(p) is not dict
        or p.get("schema") != PROTOCOL_SCHEMA
        or p.get("arm") != ARM
        or p.get("rules") != list(dest19q.RULES)
        or p.get("readings") != list(dest19q.READINGS)
        or p.get("primary") != list(dest19q.PRIMARY)
        or p.get("q1_sessions") != list(dest19q.Q1_SESSIONS)
        or p.get("q1_need") != dest19q.Q1_NEED
        or p.get("q3_sessions") != list(dest19q.Q3_SESSIONS)
        or p.get("model_inference") is not False
        or type(p.get("inputs")) is not dict
        or p["inputs"].get("dataset") != dest19q.DATASET
        or p["inputs"].get("commit") != dest19q.DATASET_COMMIT
        or type(p["inputs"].get("blobs")) is not dict
        or type(p.get("sources")) is not dict
        or set(p["sources"]) != expected_sources()
    ):
        raise ValueError("protocol_inventory")
    for name, digest in p["sources"].items():
        target = ROOT / name
        if (
            target.is_symlink()
            or not target.is_file()
            or sha(target.read_bytes()) != digest
        ):
            raise ValueError("source_binding:" + name)
    if given is not None and wire(p["inputs"]) != wire(bound_inputs(given)):
        raise ValueError("dataset_binding")
    return sha(raw), p


def build_report(rows, inputs):
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "inputs": inputs,
        "rows": rows,
        "summary": dest19q.summarise(rows),
        "hypotheses": dest19q.hypotheses(rows),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def _count(value):
    return type(value) is int and value >= 0


def structure(saved):
    """Everything about a saved report that needs no dataset: the shape of every row, each
    flag recomputed from the row's tokens, and the summary and hypotheses from the rows."""
    rows = saved.get("rows")
    if type(rows) is not list or not rows:
        raise ValueError("report_rows")
    seen = set()
    for row in rows:
        if (
            type(row) is not dict
            or set(row) != ROW_KEYS
            or type(row["session"]) is not str
            or not _SESSION.match(row["session"])
            or row["kind"] not in dest19q.KINDS
            or row["category"] != row["session"].split("/", 1)[0]
            or not all(_count(row[k]) for k in ("blocks", "unread_lines", "tool_calls"))
            or row["tool_calls"] > row["blocks"]
            or type(row["tokens"]) is not list
            or (row["session"], row["kind"]) in seen
        ):
            raise ValueError("row_shape")
        seen.add((row["session"], row["kind"]))
        ids = set()
        for token in row["tokens"]:
            if (
                type(token) is not dict
                or set(token) != TOKEN_KEYS
                or type(token["id"]) is not str
                or not _ID.match(token["id"])
                or token["id"] in ids
                or token["origin"] not in dest19q.ORIGINS
                or type(token["used_strict"]) is not bool
                or type(token["used_lenient"]) is not bool
                or (token["used_strict"] and not token["used_lenient"])
            ):
                raise ValueError("row_shape")
            ids.add(token["id"])
        if wire(row["flags"]) != wire(dest19q.flags(row["tokens"])):
            raise ValueError("row_flags:" + row["session"])
    if wire(saved.get("summary")) != wire(dest19q.summarise(rows)):
        raise ValueError("summary_mismatch")
    if wire(saved.get("hypotheses")) != wire(dest19q.hypotheses(rows)):
        raise ValueError("hypotheses_mismatch")


def receipt_for(report, manifest_root, recomputed):
    reading, rule = dest19q.PRIMARY
    cell = report["summary"]["cells"][reading][rule]
    return {
        "verified": True,
        "arm": ARM,
        "kind": "dataset_recomputed" if recomputed else "structure_checked",
        "recompute": {"result": "verified"}
        if recomputed
        else {"result": "not_run", "reason": "no_dataset"},
        "dataset": report["inputs"]["dataset"],
        "dataset_commit": report["inputs"]["commit"],
        "pairs": report["summary"]["pairs"],
        "excluded": len(report["inputs"]["excluded"]),
        "primary": {
            "reading": reading,
            "rule": rule,
            "attack_flagged": cell["attack_flagged"],
            "benign_flagged": cell["benign_flagged"],
            "paired": cell["paired"],
        },
        "hypotheses": {k: v["holds"] for k, v in report["hypotheses"].items()},
        "model_inference": False,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None, dataset=None, decrypt=None):
    given = dest19q.inputs(dataset, decrypt) if dataset is not None else None
    protocol_digest, proto = check_protocol(protocol or PROTOCOL, given)
    files = read_pack(Path(pack), expected_root)
    if set(files) != {"report.json", *SIDECARS}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    if wire(saved.get("inputs")) != wire(proto["inputs"]):
        raise ValueError("input_binding")
    structure(saved)
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    report = loads(wire(saved))
    report.pop("protocol_sha256", None)
    if given is not None:
        actual = build_report(dest19q.measure(given), bound_inputs(given))
        if wire(report) != wire(actual):
            raise ValueError("report_mismatch")
        report = actual
    # the receipt describes what THIS host checked or recomputed
    return receipt_for(report, expected_root, given is not None)


def run(out, dataset, decrypt, *, protocol=None):
    given = dest19q.inputs(dataset, decrypt)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol(given)))
    protocol_digest, _ = check_protocol(proto_path, given)
    report = build_report(dest19q.measure(given), bound_inputs(given))
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for name, project in SIDECARS.items():
        files[name] = wire(project(report))
    (out / "report.json").write_bytes(files["report.json"])
    manifest_root = write_pack(out / "evidence.zip", files)
    (out / "ROOT.sha256").write_text(manifest_root + "\n")
    receipt = verify(
        out / "evidence.zip",
        manifest_root,
        protocol=proto_path,
        dataset=dataset,
        decrypt=decrypt,
    )
    (out / "receipt.json").write_bytes(wire(receipt))
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    launch = sub.add_parser("run")
    launch.add_argument("--out", type=Path, required=True)
    launch.add_argument("--dataset", type=Path, required=True)
    launch.add_argument("--key", required=True)
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    check.add_argument("--dataset", type=Path, default=None)
    check.add_argument("--key", default=None)
    args = parser.parse_args()
    if args.command == "run":
        receipt = run(args.out.resolve(), args.dataset, dest19q.fernet(args.key))
    else:
        if (args.dataset is None) != (args.key is None):
            parser.error("--dataset and --key go together")
        receipt = verify(
            args.pack,
            args.expected_root,
            protocol=args.protocol,
            dataset=args.dataset,
            decrypt=dest19q.fernet(args.key) if args.key else None,
        )
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
