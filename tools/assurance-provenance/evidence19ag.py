"""Phase 19ag evidence: source-bound pack for the repaired approval check (P19-GUARD01), with
verify.

The pack holds every file of attempts the lane reads, as committed by the lane that owns it,
and the three fresh seats' files as received; and one row per attempt. A recorded attempt has
an outcome on lane 19ae's full gate and on the guarded gate; a fresh seat's attempt has one on
the guarded gate. On any host ``verify`` reads every file again, converts it by lane 19ae's
rule, checks every row's identity against it, checks that each row's flags follow from its
recorded outcome, and recomputes the summary and the hypotheses. With ``--replay`` on Linux
x86_64 in the hash-locked environment it also runs every attempt again and compares the whole
report. No model runs here.
"""

import argparse
import json
from pathlib import Path

import evidence
import evidence19d
import guard19ag
import projection
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19ag"
PROTOCOL = DOCS / "protocol.json"
BRIEF = "docs/research/provenance-phase-19ag/BRIEF.md"
SCHEMA = "simurgh-phase19ag-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19ag-protocol-v1"
ARM = "approval_check_guarded"
PHASE_19AG_FILES = (
    "guard19ag.py",
    "evidence19ag.py",
    "full19ae.py",
    "bind19ad.py",
    "planted19ac.py",
    "body19ab.py",
    "retry19aa.py",
    "tamper19z.py",
    "redteam19y.py",
    "redteam19t.py",
    "seal19z.py",
    "repair19y.py",
    "projection.py",
    "rig.py",
    "gate19.py",
    "tests/test_guard19ag.py",
    "tests/test_evidence19ag.py",
)
FILES = {
    **guard19ag.RECORDED,
    **{
        s: f"docs/research/provenance-phase-19ag/submissions/{s}.json"
        for s in guard19ag.SEATS
    },
}
NON_CLAIMS = (
    "the frozen gate and every earlier lane's gate still raise; a caller that does not use the new class has none of this",
    "the seats are agents of Claude models the author started; they are not a person and not an attacker from another vendor",
    "a check that fails closed turns an unknown error into a refusal, which can hide a fault of another kind behind a refusal; the lane counts raises and does not look for those",
    "there is no planted fault in this round, so a zero from the seats carries only the weight that the same kind of seat found the last two faults",
    "the earlier lanes' packs are not replaced: they record what the gate of their day did",
    "no model is a target and no model's behaviour is measured; the seats are tools the author ran",
)
SIDECARS = {
    "summary.json": lambda r: r["summary"],
    "hypotheses.json": lambda r: r["hypotheses"],
}
IDENTITY = ("source", "position", "steps_sha256", "steps_count", "note")
FLAGS = ("gained", "unrecorded", "long_runs")


def host_can_replay():
    return evidence.host_can_replay()


def member(source):
    return "attempts-" + source + ".json"


def expected_sources():
    return {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19AG_FILES} | {BRIEF}


def _declared(files):
    return {
        "arm": ARM,
        "sources_of_attempts": list(guard19ag.SOURCES),
        "gates": list(guard19ag.GATES),
        "limits": {
            "retry_mark": guard19ag.LIMIT,
            "seat_attempts": guard19ag.SEAT_LIMIT,
            "steps": guard19ag.MAX_STEPS,
            "batch": guard19ag.BATCH,
        },
        "attempt_files": {s: sha(files[s]) for s in guard19ag.SOURCES},
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
        for s in guard19ag.SOURCES
    }


def build_report(rows, files, fixture):
    got = guard19ag.received(files)
    summary = guard19ag.summarise(rows, got, fixture)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "attempt_files": _files_block(got),
        "rows": rows,
        "summary": summary,
        "hypotheses": guard19ag.hypotheses(summary),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def _digest(value):
    return (
        type(value) is str
        and len(value) == 64
        and set(value) <= set("0123456789abcdef")
    )


def _outcome_ok(value, steps, fixture):
    if type(value) is not dict or set(value) != {*guard19ag.OUTCOME_KEYS, *FLAGS}:
        return False
    marks = value["marks"]
    ok = (
        type(value["dispatches"]) is list
        and all(
            type(d) is list
            and len(d) == 4
            and all(type(x) is str for x in d[:3])
            and d[3] in (True, False, None)
            for d in value["dispatches"]
        )
        and type(value["effects"]) is int
        and type(value["payloads"]) is list
        and all(_digest(p) for p in value["payloads"])
        and value["effects"] == len(value["payloads"])
        and type(marks) is dict
        and set(marks) == {"refused", "retry_limit"}
        and type(marks["refused"]) is int
        and type(marks["retry_limit"]) is list
        and all(type(x) is str for x in marks["retry_limit"])
        and type(value["latched"]) is list
        and (value["raised"] is None or type(value["raised"]) is str)
    )
    if not ok:
        return False
    raw = {k: value[k] for k in guard19ag.OUTCOME_KEYS}
    return wire(value) == wire(guard19ag.flags(steps, raw, fixture))


def structure(saved, files):
    """Everything about a saved report that needs no gate."""
    got = guard19ag.received(files)
    rows = saved.get("rows")
    summary = saved.get("summary")
    if (
        type(summary) is not dict
        or type(summary.get("fixture")) is not dict
        or set(summary["fixture"]) != {"a", "b"}
        or not all(_digest(v) for v in summary["fixture"].values())
    ):
        raise ValueError("summary_mismatch")
    fixture = summary["fixture"]
    if type(rows) is not list:
        raise ValueError("report_rows")
    want = [(s, a) for s in guard19ag.SOURCES for a in got[s]["attempts"]]
    if len(rows) != len(want):
        raise ValueError("report_rows")
    for row, (source, attempt) in zip(rows, want):
        label = f"{source}:{attempt['position']}"
        identity = {
            "source": source,
            "position": attempt["position"],
            "steps_sha256": guard19ag.steps_digest(attempt["steps"]),
            "steps_count": len(attempt["steps"]),
            "note": attempt["note"],
        }
        names = guard19ag.GATES if source in guard19ag.RECORDED else ("guarded",)
        if (
            type(row) is not dict
            or set(row) != {*IDENTITY, *names}
            or any(row[k] != v for k, v in identity.items())
        ):
            raise ValueError("row_mismatch:" + label)
        for name in names:
            if not _outcome_ok(row[name], attempt["steps"], fixture):
                raise ValueError("row_outcome:" + label)
    if wire(saved.get("attempt_files")) != wire(_files_block(got)):
        raise ValueError("file_binding")
    if wire(summary) != wire(guard19ag.summarise(rows, got, fixture)):
        raise ValueError("summary_mismatch")
    if wire(saved.get("hypotheses")) != wire(guard19ag.hypotheses(summary)):
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
    names = {member(s) for s in guard19ag.SOURCES}
    if set(files) != {"report.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    given = {s: files[member(s)] for s in guard19ag.SOURCES}
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
    real = gate if gate is not None else guard19ag.Gate()
    try:
        fixture = real.fixture()
        return build_report(guard19ag.measure(given, real, fixture), given, fixture)
    finally:
        if gate is None:
            real.close()


def read_files(files=None):
    paths = {**FILES, **(files or {})}
    return {s: (ROOT / paths[s]).read_bytes() for s in guard19ag.SOURCES}


def run(out, *, files=None, protocol=None, gate=None):
    if gate is None and not host_can_replay():
        raise ValueError("replay_requires_linux_x86_64")
    given = read_files(files)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol(given)))
    protocol_digest = check_protocol(proto_path, given)
    report = _build(given, gate)
    report.update(protocol_sha256=protocol_digest)
    files_out = {"report.json": wire(report)}
    for source in guard19ag.SOURCES:
        files_out[member(source)] = given[source]
    for name, project in SIDECARS.items():
        files_out[name] = wire(project(report))
    (out / "report.json").write_bytes(files_out["report.json"])
    manifest_root = write_pack(out / "evidence.zip", files_out)
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
