"""Phase 19ac evidence: source-bound pack for sequences written by a model and one planted
fault (P19-PLANT01), with verify.

The pack holds the author's controls and the two seats' files as received, and one row per
attempt that was run, on the real gate and on the planted one. On any host ``verify`` reads
every file again, checks every row's identity against it (source, position, digest and count
of the steps, note), checks that each row's flag follows from its recorded outcome, and
recomputes the summary and the hypotheses. With ``--replay`` on Linux x86_64 in the
hash-locked environment it also runs every attempt again on both gates and compares the whole
report. No model runs here.
"""

import argparse
import json
from pathlib import Path

import evidence
import evidence19d
import planted19ac
import projection
import retry19aa
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19ac"
PROTOCOL = DOCS / "protocol.json"
SUBMISSIONS = DOCS / "submissions"
AUTHOR = DOCS / "attempts-author.json"
BRIEF = "docs/research/provenance-phase-19ac/BRIEF.md"
SCHEMA = "simurgh-phase19ac-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19ac-protocol-v1"
ARM = "planted_fault_control"
PHASE_19AC_FILES = (
    "planted19ac.py",
    "evidence19ac.py",
    "retry19aa.py",
    "seal19z.py",
    "repair19y.py",
    "projection.py",
    "rig.py",
    "gate19.py",
    "tests/test_planted19ac.py",
    "tests/test_evidence19ac.py",
)
NON_CLAIMS = (
    "one planted fault, chosen by the author; a seat that finds it is not shown to find faults of other kinds",
    "the seats are agents the author started; they are not a person and not an attacker in general",
    "the runner hid which gate was which from an agent that kept to its brief; it is not a sandbox",
    "the planted gate exists only in this lane's module and is used by nothing else",
    "the real gate is lane 19z's sealed, repaired gate beside the gate that lanes 19a to 19y measured",
    "no model is a target and no model's behaviour is measured; the seats are tools the author ran",
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
    *planted19ac.GATES,
}
OUT_KEYS = {*planted19ac.OUTCOME_KEYS, "gained"}


def host_can_replay():
    return evidence.host_can_replay()


def member(source):
    return "attempts-author.json" if source == "author" else f"submission-{source}.json"


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19AC_FILES} | {BRIEF}


def _declared(files):
    return {
        "arm": ARM,
        "sources_of_attempts": list(planted19ac.SOURCES),
        "gates": list(planted19ac.GATES),
        "limits": {
            "attempts": planted19ac.LIMIT,
            "steps": retry19aa.MAX_STEPS,
            "times": retry19aa.MAX_TIMES,
            "text": retry19aa.MAX_TEXT,
            "note": retry19aa.MAX_NOTE,
        },
        "attempt_files": {s: sha(files[s]) for s in planted19ac.SOURCES},
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
        for s in planted19ac.SOURCES
    }


def build_report(rows, files):
    got = planted19ac.received(files)
    summary = planted19ac.summarise(rows, got)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "attempt_files": _files_block(got),
        "rows": rows,
        "summary": summary,
        "hypotheses": planted19ac.hypotheses(summary),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def _outcome_ok(value, steps):
    return (
        type(value) is dict
        and set(value) == OUT_KEYS
        and type(value["dispatches"]) is list
        and all(
            type(d) is list and len(d) == 3 and all(type(x) is str for x in d)
            for d in value["dispatches"]
        )
        and type(value["effects"]) is int
        and type(value["reasons"]) is dict
        and all(type(v) is int for v in value["reasons"].values())
        and type(value["latched"]) is list
        and (value["raised"] is None or type(value["raised"]) is str)
        and value["gained"] is planted19ac.gained(steps, value)
    )


def structure(saved, files):
    """Everything about a saved report that needs no gate."""
    got = planted19ac.received(files)
    rows = saved.get("rows")
    if type(rows) is not list:
        raise ValueError("report_rows")
    want = [(s, a) for s in planted19ac.SOURCES for a in got[s]["attempts"]]
    if len(rows) != len(want):
        raise ValueError("report_rows")
    for row, (source, attempt) in zip(rows, want):
        label = f"{source}:{attempt['position']}"
        identity = {
            "source": source,
            "position": attempt["position"],
            "steps_sha256": planted19ac.steps_digest(attempt["steps"]),
            "steps_count": len(attempt["steps"]),
            "note": attempt["note"],
        }
        if (
            type(row) is not dict
            or set(row) != ROW_KEYS
            or any(row[k] != v for k, v in identity.items())
        ):
            raise ValueError("row_mismatch:" + label)
        for name in planted19ac.GATES:
            if not _outcome_ok(row[name], attempt["steps"]):
                raise ValueError("row_outcome:" + label)
    if wire(saved.get("attempt_files")) != wire(_files_block(got)):
        raise ValueError("file_binding")
    summary = planted19ac.summarise(rows, got)
    if wire(saved.get("summary")) != wire(summary):
        raise ValueError("summary_mismatch")
    if wire(saved.get("hypotheses")) != wire(planted19ac.hypotheses(summary)):
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
        "sources": s["sources"],
        "totals": s["totals"],
        "hypotheses": {k: v["holds"] for k, v in report["hypotheses"].items()},
        "model_inference": False,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None, replay=False, gate=None):
    files = read_pack(Path(pack), expected_root)
    names = {member(s) for s in planted19ac.SOURCES}
    if set(files) != {"report.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    given = {s: files[member(s)] for s in planted19ac.SOURCES}
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
    real = gate if gate is not None else planted19ac.Gate()
    try:
        return build_report(planted19ac.measure(given, real), given)
    finally:
        if gate is None:
            real.close()


def read_files(author=None, submissions=None):
    out = {"author": Path(author or AUTHOR).read_bytes()}
    for seat in planted19ac.SEATS:
        out[seat] = (Path(submissions or SUBMISSIONS) / (seat + ".json")).read_bytes()
    return out


def run(out, *, author=None, submissions=None, protocol=None, gate=None):
    if gate is None and not host_can_replay():
        raise ValueError("replay_requires_linux_x86_64")
    given = read_files(author, submissions)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol(given)))
    protocol_digest = check_protocol(proto_path, given)
    report = _build(given, gate)
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for source in planted19ac.SOURCES:
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
