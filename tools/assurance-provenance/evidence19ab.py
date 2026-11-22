"""Phase 19ab evidence: source-bound pack for changed bodies of a delegated or approved action
(P19-BODY01), with verify.

The pack holds the author's attempts and one row per attempt that was run. On any host
``verify`` reads the file again, checks every row's identity against it (position, route,
digest of the body as written, note), recomputes each row's facts from its recorded outcome
and the fixture the report names, and recomputes the summary and the hypotheses. With
``--replay`` on Linux x86_64 in the hash-locked environment it also runs every attempt again
and compares the whole report. No model runs here.
"""

import argparse
import json
from pathlib import Path

import body19ab
import evidence
import evidence19d
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19ab"
PROTOCOL = DOCS / "protocol.json"
AUTHOR = DOCS / "attempts-author.json"
SCHEMA = "simurgh-phase19ab-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19ab-protocol-v1"
ARM = "changed_bodies"
PHASE_19AB_FILES = (
    "body19ab.py",
    "evidence19ab.py",
    "seal19z.py",
    "repair19y.py",
    "projection.py",
    "rig.py",
    "gate19.py",
    "tests/test_body19ab.py",
    "tests/test_evidence19ab.py",
)
NON_CLAIMS = (
    "the gate binds what the body is and cannot judge what it means: an allowed body that does harm is outside this lane",
    "a third party that acts on an allowed request, which is the rest of what laundering names, is not measured",
    "a list of bodies the author wrote, on a fixture with two actions; nothing here is evidence about what a model or an attacker would try",
    "the bodies are JSON objects handed to the gate by the host; a caller that builds the action some other way is outside it",
    "the gate is lane 19z's sealed, repaired gate beside the gate that lanes 19a to 19y measured",
    "no model is a target and no model's behaviour is measured",
)
SIDECARS = {
    "summary.json": lambda r: r["summary"],
    "hypotheses.json": lambda r: r["hypotheses"],
}
ROW_KEYS = {"source", "position", "route", "body_sha256", "note", "outcome", "facts"}


def host_can_replay():
    return evidence.host_can_replay()


def member(source):
    return "attempts-" + source + ".json"


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19AB_FILES}


def _declared(files):
    return {
        "arm": ARM,
        "sources_of_attempts": list(body19ab.SOURCES),
        "routes": list(body19ab.ROUTES),
        "limits": {
            "attempts": body19ab.LIMIT,
            "body": body19ab.MAX_BODY,
            "note": body19ab.MAX_NOTE,
        },
        "attempt_files": {s: sha(files[s]) for s in body19ab.SOURCES},
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
        for s in body19ab.SOURCES
    }


def build_report(rows, files, fixture):
    got = body19ab.received(files)
    summary = body19ab.summarise(rows, got, fixture)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "attempt_files": _files_block(got),
        "rows": rows,
        "summary": summary,
        "hypotheses": body19ab.hypotheses(summary),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def _digest(value):
    return (
        type(value) is str
        and len(value) == 64
        and set(value) <= set("0123456789abcdef")
    )


def _fixture_ok(value):
    return (
        type(value) is dict
        and set(value) == {"actions", "payload_sha256"}
        and type(value["actions"]) is dict
        and set(value["actions"]) == set(body19ab.ROUTES)
        and all(type(v) is dict for v in value["actions"].values())
        and type(value["payload_sha256"]) is dict
        and set(value["payload_sha256"]) == set(body19ab.ROUTES)
        and all(_digest(v) for v in value["payload_sha256"].values())
    )


def _outcome_ok(value):
    return (
        type(value) is dict
        and set(value) == set(body19ab.OUTCOME_KEYS)
        and all(value[k] is None or type(value[k]) is str for k in ("first", "second"))
        and type(value["effects"]) is int
        and type(value["payloads"]) is list
        and all(_digest(p) for p in value["payloads"])
        and value["effects"] == len(value["payloads"])
        and type(value["blocked_events"]) is int
        and type(value["reasons"]) is dict
        and all(type(v) is int for v in value["reasons"].values())
        and type(value["latched"]) is list
        and (value["raised"] is None or type(value["raised"]) is str)
    )


def structure(saved, files):
    """Everything about a saved report that needs no gate."""
    got = body19ab.received(files)
    rows = saved.get("rows")
    summary = saved.get("summary")
    if type(summary) is not dict or not _fixture_ok(summary.get("fixture")):
        raise ValueError("summary_mismatch")
    fixture = summary["fixture"]
    if type(rows) is not list:
        raise ValueError("report_rows")
    want = [(s, a) for s in body19ab.SOURCES for a in got[s]["attempts"]]
    if len(rows) != len(want):
        raise ValueError("report_rows")
    for row, (source, attempt) in zip(rows, want):
        label = f"{source}:{attempt['position']}"
        identity = {
            "source": source,
            "position": attempt["position"],
            "route": attempt["route"],
            "body_sha256": sha(body19ab.as_written(attempt["body"])),
            "note": attempt["note"],
        }
        if (
            type(row) is not dict
            or set(row) != ROW_KEYS
            or any(row[k] != v for k, v in identity.items())
        ):
            raise ValueError("row_mismatch:" + label)
        if not _outcome_ok(row["outcome"]) or wire(row["facts"]) != wire(
            body19ab.facts(attempt["route"], attempt["body"], row["outcome"], fixture)
        ):
            raise ValueError("row_outcome:" + label)
    if wire(saved.get("attempt_files")) != wire(_files_block(got)):
        raise ValueError("file_binding")
    if wire(summary) != wire(body19ab.summarise(rows, got, fixture)):
        raise ValueError("summary_mismatch")
    if wire(saved.get("hypotheses")) != wire(body19ab.hypotheses(summary)):
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
    names = {member(s) for s in body19ab.SOURCES}
    if set(files) != {"report.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    given = {s: files[member(s)] for s in body19ab.SOURCES}
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
    real = gate if gate is not None else body19ab.Gate()
    try:
        fixture = real.fixture()
        return build_report(body19ab.measure(given, real, fixture), given, fixture)
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
    for source in body19ab.SOURCES:
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
