"""Phase 19z evidence: source-bound pack for the seal over the gate's own stores (P19-SEAL01),
with verify.

The pack holds the author's attempts and the two seats' files as received, and one row per
attempt that was run. On any host ``verify`` reads every file again, checks every row's
identity against it (source, position, digest and count of the operations, note), checks that
each row's flags follow from its recorded outcome, and recomputes the summary and the
hypotheses. With ``--replay`` on Linux x86_64 in the hash-locked environment it also runs
every attempt again on the open gate and on the sealed gate and compares the whole report. No
model runs here.
"""

import argparse
import json
from pathlib import Path

import evidence
import evidence19d
import projection
import tamper19z
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19z"
PROTOCOL = DOCS / "protocol.json"
SUBMISSIONS = DOCS / "submissions"
AUTHOR = DOCS / "attempts-author.json"
BRIEF = "docs/research/provenance-phase-19z/BRIEF.md"
SCHEMA = "simurgh-phase19z-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19z-protocol-v1"
ARM = "sealed_control_plane"
PHASE_19Z_FILES = (
    "seal19z.py",
    "tamper19z.py",
    "evidence19z.py",
    "repair19y.py",
    "projection.py",
    "rig.py",
    "gate19.py",
    "tests/test_seal19z.py",
    "tests/test_tamper19z.py",
    "tests/test_evidence19z.py",
)
NON_CLAIMS = (
    "detection after the fact, not isolation: the lane does not show that an agent cannot write the stores, only what the gate does when one has",
    "the seal lives in the host process; an agent that can run code there, or change a store between the check and the frozen gate's own read, is outside it",
    "a sealed gate that detects a change refuses the delegated action too, so an agent that can write the stores can stop work",
    "the script is a file whose digest is checked; nothing here runs it, and nothing shows it is the file a real runner would execute",
    "the seal is beside the gate that lanes 19a to 19y measured; a caller that does not use it has none of this",
    "the attempts are the author's list and two agents' files; nothing here is evidence about attackers in general or about a person",
    "no model is a target and no model's behaviour is measured; the attackers are tools the author ran",
)
SIDECARS = {
    "summary.json": lambda r: r["summary"],
    "hypotheses.json": lambda r: r["hypotheses"],
}
ROW_KEYS = {"source", "position", "ops_sha256", "ops_count", "note", *tamper19z.GATES}
OUT_KEYS = {*tamper19z.OUTCOME_KEYS, "gained", "ran_changed", "denied"}


def host_can_replay():
    return evidence.host_can_replay()


def member(source):
    return "attempts-author.json" if source == "author" else f"submission-{source}.json"


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19Z_FILES} | {BRIEF}


def _declared(files):
    return {
        "arm": ARM,
        "sources_of_attempts": list(tamper19z.SOURCES),
        "stores": list(tamper19z.STORES),
        "gates": list(tamper19z.GATES),
        "limits": {
            "attempts": tamper19z.LIMIT,
            "ops": tamper19z.MAX_OPS,
            "sql": tamper19z.MAX_SQL,
            "text": tamper19z.MAX_TEXT,
            "note": tamper19z.MAX_NOTE,
            "sql_steps": tamper19z.STEP_LIMIT,
        },
        "attempt_files": {s: sha(files[s]) for s in tamper19z.SOURCES},
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
        for s in tamper19z.SOURCES
    }


def build_report(rows, files, baseline):
    got = tamper19z.received(files)
    summary = tamper19z.summarise(rows, got, baseline)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "attempt_files": _files_block(got),
        "rows": rows,
        "summary": summary,
        "hypotheses": tamper19z.hypotheses(summary),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def _outcome_ok(value):
    return (
        type(value) is dict
        and set(value) == OUT_KEYS
        and type(value["verdicts"]) is dict
        and type(value["effects"]) is int
        and (value["raised"] is None or type(value["raised"]) is str)
        and type(value["script_changed"]) is bool
        and all(
            type(value[k]) is list and all(type(x) is str for x in value[k])
            for k in ("latched", "touched", "ops")
        )
        and value["gained"] is tamper19z.gained(value)
        and value["ran_changed"] is tamper19z.ran_changed(value)
        and value["denied"] is tamper19z.denied(value)
    )


def structure(saved, files):
    """Everything about a saved report that needs no gate."""
    got = tamper19z.received(files)
    rows = saved.get("rows")
    if type(rows) is not list:
        raise ValueError("report_rows")
    want = [(s, a) for s in tamper19z.SOURCES for a in got[s]["attempts"]]
    if len(rows) != len(want):
        raise ValueError("report_rows")
    for row, (source, attempt) in zip(rows, want):
        label = f"{source}:{attempt['position']}"
        identity = {
            "source": source,
            "position": attempt["position"],
            "ops_sha256": tamper19z.ops_digest(attempt["ops"]),
            "ops_count": len(attempt["ops"]),
            "note": attempt["note"],
        }
        if (
            type(row) is not dict
            or set(row) != ROW_KEYS
            or any(row[k] != v for k, v in identity.items())
        ):
            raise ValueError("row_mismatch:" + label)
        for name in tamper19z.GATES:
            out = row[name]
            if not _outcome_ok(out) or len(out["ops"]) != len(attempt["ops"]):
                raise ValueError("row_outcome:" + label)
        if row["open"]["latched"]:
            raise ValueError("row_outcome:" + label)
    if wire(saved.get("attempt_files")) != wire(_files_block(got)):
        raise ValueError("file_binding")
    summary = saved.get("summary")
    if type(summary) is not dict or type(summary.get("baseline")) is not dict:
        raise ValueError("summary_mismatch")
    baseline = summary["baseline"]
    if set(baseline) != set(tamper19z.GATES) or not all(
        type(v) is dict and set(v) == set(tamper19z.OUTCOME_KEYS)
        for v in baseline.values()
    ):
        raise ValueError("summary_mismatch")
    if wire(summary) != wire(tamper19z.summarise(rows, got, baseline)):
        raise ValueError("summary_mismatch")
    if wire(saved.get("hypotheses")) != wire(tamper19z.hypotheses(summary)):
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
        "hypotheses": {k: v["holds"] for k, v in report["hypotheses"].items()},
        "model_inference": False,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None, replay=False, gate=None):
    files = read_pack(Path(pack), expected_root)
    names = {member(s) for s in tamper19z.SOURCES}
    if set(files) != {"report.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    given = {s: files[member(s)] for s in tamper19z.SOURCES}
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
    real = gate if gate is not None else tamper19z.Gate()
    try:
        baseline = real.baseline()
        return build_report(tamper19z.measure(given, real), given, baseline)
    finally:
        if gate is None:
            real.close()


def read_files(author=None, submissions=None):
    out = {"author": Path(author or AUTHOR).read_bytes()}
    for seat in tamper19z.SEATS:
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
    for source in tamper19z.SOURCES:
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
