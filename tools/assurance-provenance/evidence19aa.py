"""Phase 19aa evidence: source-bound pack for the sequences at the gate's front door
(P19-RETRY01), with verify.

The pack holds the author's sequences and one row per sequence that was run. On any host
``verify`` reads the file again, checks every row's identity against it (position, digest and
count of the steps, note), recomputes each row's facts from its recorded outcome, and
recomputes the summary and the hypotheses. With ``--replay`` on Linux x86_64 in the
hash-locked environment it also runs every sequence again and compares the whole report. No
model runs here.
"""

import argparse
import json
from pathlib import Path

import evidence
import evidence19d
import projection
import retry19aa
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19aa"
PROTOCOL = DOCS / "protocol.json"
AUTHOR = DOCS / "attempts-author.json"
SCHEMA = "simurgh-phase19aa-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19aa-protocol-v1"
ARM = "front_door_sequences"
PHASE_19AA_FILES = (
    "retry19aa.py",
    "evidence19aa.py",
    "seal19z.py",
    "repair19y.py",
    "projection.py",
    "rig.py",
    "gate19.py",
    "tests/test_retry19aa.py",
    "tests/test_evidence19aa.py",
)
NON_CLAIMS = (
    "a list of sequences the author wrote, on a fixture with two actions, one actor and a budget of one; nothing here is evidence about what a model or an attacker would try",
    "a model that writes its own approval is represented by the text, not by a model",
    "nothing here measures a human approver: how often a person approves what should be refused is outside it",
    "credentials left within reach and requests laundered through a permitted route are not measured; both need a receiver this fixture does not have",
    "the gate is lane 19z's sealed, repaired gate beside the gate that lanes 19a to 19y measured",
    "no model is a target and no model's behaviour is measured",
)
SIDECARS = {
    "summary.json": lambda r: r["summary"],
    "hypotheses.json": lambda r: r["hypotheses"],
}
ROW_KEYS = {
    "source",
    "position",
    "steps_sha256",
    "steps_count",
    "note",
    "outcome",
    "facts",
}


def host_can_replay():
    return evidence.host_can_replay()


def member(source):
    return "attempts-" + source + ".json"


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19AA_FILES}


def _declared(files):
    return {
        "arm": ARM,
        "sources_of_attempts": list(retry19aa.SOURCES),
        "channels": list(retry19aa.CHANNELS),
        "limits": {
            "attempts": retry19aa.LIMIT,
            "steps": retry19aa.MAX_STEPS,
            "times": retry19aa.MAX_TIMES,
            "text": retry19aa.MAX_TEXT,
            "note": retry19aa.MAX_NOTE,
        },
        "attempt_files": {s: sha(files[s]) for s in retry19aa.SOURCES},
        "model_inference": False,
    }


def build_protocol(files):
    return {
        "schema": PROTOCOL_SCHEMA,
        **_declared(files),
        "non_claims": list(NON_CLAIMS),
        "sources": {
            n: sha((ROOT / n).read_bytes()) for n in sorted(expected_sources())
        },
    }


def check_protocol(path, files):
    raw = Path(path).read_bytes()
    p = loads(raw)
    if (
        type(p) is not dict
        or p.get("schema") != PROTOCOL_SCHEMA
        or any(wire(p.get(k)) != wire(v) for k, v in _declared(files).items())
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
    return sha(raw)


def _files_block(got):
    return {
        s: {k: got[s][k] for k in ("sha256", "received", "rejected")}
        for s in retry19aa.SOURCES
    }


def build_report(rows, files):
    got = retry19aa.received(files)
    summary = retry19aa.summarise(rows, got)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "attempt_files": _files_block(got),
        "rows": rows,
        "summary": summary,
        "hypotheses": retry19aa.hypotheses(summary),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def _outcome_ok(value):
    return (
        type(value) is dict
        and set(value) == set(retry19aa.OUTCOME_KEYS)
        and type(value["dispatches"]) is list
        and all(
            type(d) is list and len(d) == 3 and all(type(x) is str for x in d)
            for d in value["dispatches"]
        )
        and type(value["effects"]) is int
        and type(value["blocked_events"]) is int
        and type(value["reasons"]) is dict
        and all(type(v) is int for v in value["reasons"].values())
        and type(value["latched"]) is list
        and (value["raised"] is None or type(value["raised"]) is str)
    )


def structure(saved, files):
    """Everything about a saved report that needs no gate."""
    got = retry19aa.received(files)
    rows = saved.get("rows")
    if type(rows) is not list:
        raise ValueError("report_rows")
    want = [(s, a) for s in retry19aa.SOURCES for a in got[s]["attempts"]]
    if len(rows) != len(want):
        raise ValueError("report_rows")
    for row, (source, attempt) in zip(rows, want):
        label = f"{source}:{attempt['position']}"
        identity = {
            "source": source,
            "position": attempt["position"],
            "steps_sha256": retry19aa.steps_digest(attempt["steps"]),
            "steps_count": len(attempt["steps"]),
            "note": attempt["note"],
        }
        if (
            type(row) is not dict
            or set(row) != ROW_KEYS
            or any(row[k] != v for k, v in identity.items())
        ):
            raise ValueError("row_mismatch:" + label)
        if not _outcome_ok(row["outcome"]) or wire(row["facts"]) != wire(
            retry19aa.facts(attempt["steps"], row["outcome"])
        ):
            raise ValueError("row_outcome:" + label)
    if wire(saved.get("attempt_files")) != wire(_files_block(got)):
        raise ValueError("file_binding")
    summary = retry19aa.summarise(rows, got)
    if wire(saved.get("summary")) != wire(summary):
        raise ValueError("summary_mismatch")
    if wire(saved.get("hypotheses")) != wire(retry19aa.hypotheses(summary)):
        raise ValueError("hypotheses_mismatch")


def receipt_for(report, manifest_root, replayed):
    s = report["summary"]
    return {
        "verified": True,
        "arm": ARM,
        "kind": "gate_recomputed" if replayed else "structure_checked",
        "replay": {"result": "verified"}
        if replayed
        else {
            "result": "not_run",
            "reason": "not_requested" if host_can_replay() else "host_not_linux_x86_64",
        },
        "attempt_files": {k: v["sha256"] for k, v in report["attempt_files"].items()},
        "sources": {
            k: {x: v[x] for x in ("received", "rejected", "run")}
            for k, v in s["sources"].items()
        },
        "totals": s["totals"],
        "reasons": s["reasons"],
        "hypotheses": {k: v["holds"] for k, v in report["hypotheses"].items()},
        "model_inference": False,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None, replay=False, gate=None):
    files = read_pack(Path(pack), expected_root)
    names = {member(s) for s in retry19aa.SOURCES}
    if set(files) != {"report.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    given = {s: files[member(s)] for s in retry19aa.SOURCES}
    protocol_digest = check_protocol(protocol or PROTOCOL, given)
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    structure(saved, given)
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    report = loads(wire(saved))
    report.pop("protocol_sha256", None)
    if replay:
        if gate is None and not host_can_replay():
            raise ValueError("replay_requires_linux_x86_64")
        actual = _build(given, gate)
        if wire(report) != wire(actual):
            raise ValueError("report_mismatch")
        report = actual
    # the receipt describes what THIS host checked or recomputed
    return receipt_for(report, expected_root, replay)


def _build(given, gate):
    real = gate if gate is not None else retry19aa.Gate()
    try:
        return build_report(retry19aa.measure(given, real), given)
    finally:
        if gate is None:
            real.close()


def read_files(author=None):
    return {"author": Path(author or AUTHOR).read_bytes()}


def run(out, *, author=None, protocol=None, gate=None):
    if gate is None and not host_can_replay():
        raise ValueError("replay_requires_linux_x86_64")
    given = read_files(author)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol(given)))
    protocol_digest = check_protocol(proto_path, given)
    report = _build(given, gate)
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for source in retry19aa.SOURCES:
        files[member(source)] = given[source]
    for name, project in SIDECARS.items():
        files[name] = wire(project(report))
    (out / "report.json").write_bytes(files["report.json"])
    manifest_root = write_pack(out / "evidence.zip", files)
    (out / "ROOT.sha256").write_text(manifest_root + "\n")
    receipt = verify(
        out / "evidence.zip", manifest_root, protocol=proto_path, replay=True, gate=gate
    )
    (out / "receipt.json").write_bytes(wire(receipt))
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    launch = sub.add_parser("run")
    launch.add_argument("--out", type=Path, required=True)
    check = sub.add_parser("verify")
    check.add_argument("pack", type=Path)
    check.add_argument("--expected-root", required=True)
    check.add_argument("--protocol", type=Path, default=None)
    check.add_argument("--replay", action="store_true")
    args = parser.parse_args()
    if args.command == "run":
        receipt = run(args.out.resolve())
    else:
        receipt = verify(
            args.pack, args.expected_root, protocol=args.protocol, replay=args.replay
        )
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
