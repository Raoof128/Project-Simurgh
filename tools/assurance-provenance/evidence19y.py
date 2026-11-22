"""Phase 19y evidence: source-bound pack for the repair and the second red-team round
(P19-REDTEAM02), with verify.

The pack holds the two round-two submissions as received and one row per attempt that was
run, round one first. Round one's submissions and 19t's record of them are read from 19t's
own pack, which the protocol binds by digest. On any host ``verify`` reads every submission
again, checks every row's identity against it (round, attacker, position, channel, digest and
length of the text, note), and recomputes the summary and the hypotheses from the rows. With
``--replay`` on Linux x86_64 in the hash-locked environment it also runs every attempt again
against the gate as it was, the repaired gate and the repaired reader mutants, and compares
the whole report. No model runs here.
"""

import argparse
import json
from pathlib import Path

import evidence
import evidence19d
import projection
import redteam19y
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19y"
PROTOCOL = DOCS / "protocol.json"
SUBMISSIONS = DOCS / "submissions"
BRIEF = "docs/research/provenance-phase-19y/BRIEF.md"
ROUND_ONE_PACK = "docs/research/provenance-phase-19t/evidence.zip"
ROUND_ONE_ROOT = "docs/research/provenance-phase-19t/ROOT.sha256"
SCHEMA = "simurgh-phase19y-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19y-protocol-v1"
ARM = "repair_and_second_round"
PHASE_19Y_FILES = (
    "repair19y.py",
    "redteam19y.py",
    "evidence19y.py",
    "redteam19t.py",
    "projection.py",
    "lane.py",
    "rig.py",
    "gate19.py",
    "mutants.py",
    "provenance.py",
    "payloads.py",
    "awm.py",
    "tests/test_repair19y.py",
    "tests/test_redteam19y.py",
    "tests/test_evidence19y.py",
)
NON_CLAIMS = (
    "two attacking agents of one vendor in round two, one sitting each, through one interface; nothing here is evidence about attackers in general or about a person",
    "the attackers are of the same family as the model that wrote the repair under the owner's direction, and may share its blind spots",
    "the repair is in new classes beside the gate that lanes 19a to 19x measured; a caller of gate19.ProvenancePipeline still has both faults",
    "the attacker controls a channel's text and nothing else: not the host's state, the clock, the operator's key, the receiver or the code",
    "what an attacker tried offline is not recorded; the rows are what it chose to submit",
    "the rig is 19b's fixture under a fixed clock, with file channels held as bytes; it is not a deployed system",
    "no model is a target and no model's behaviour is measured; the attackers are tools the author ran",
)
SIDECARS = {
    "summary.json": lambda r: r["summary"],
    "hypotheses.json": lambda r: r["hypotheses"],
}
ROW_KEYS = {
    "round",
    "attacker",
    "position",
    "channel",
    "text_sha256",
    "text_chars",
    "note",
    "before",
    "repaired",
    "mutants_changed",
    "potent",
}


def host_can_replay():
    return evidence.host_can_replay()


def member(attacker):
    return "submission-" + attacker + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19Y_FILES}
    return names | {BRIEF, ROUND_ONE_PACK, ROUND_ONE_ROOT}


def round_one():
    """19t's two submissions and the rows of its report, read from its committed pack."""
    root = (ROOT / ROUND_ONE_ROOT).read_text().strip()
    files = read_pack(ROOT / ROUND_ONE_PACK, root)
    subs = {a: files[member(a)] for a in redteam19y.ROUND_ONE}
    record = loads(files["report.json"]).get("rows")
    if type(record) is not list:
        raise ValueError("round_one_record")
    return root, subs, record


def _declared(files, root):
    return {
        "arm": ARM,
        "seats": {str(r): list(s) for r, s in redteam19y.SEATS.items()},
        "channels": list(redteam19y.CHANNELS),
        "limits": {
            "attempts": redteam19y.MAX_ATTEMPTS,
            "text": redteam19y.MAX_TEXT,
            "note": redteam19y.MAX_NOTE,
        },
        "mutants": redteam19y.MUTANTS,
        "round_one_pack_root": root,
        "submissions": {
            str(r): {a: sha(files[r][a]) for a in seats}
            for r, seats in redteam19y.SEATS.items()
        },
        "model_inference": False,
    }


def build_protocol(files, root):
    return {
        "schema": PROTOCOL_SCHEMA,
        **_declared(files, root),
        "non_claims": list(NON_CLAIMS),
        "sources": {
            n: sha((ROOT / n).read_bytes()) for n in sorted(expected_sources())
        },
    }


def check_protocol(path, files, root):
    raw = Path(path).read_bytes()
    p = loads(raw)
    if (
        type(p) is not dict
        or p.get("schema") != PROTOCOL_SCHEMA
        or any(wire(p.get(k)) != wire(v) for k, v in _declared(files, root).items())
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


def _submissions(got):
    return {
        str(r): {
            a: {k: got[r][a][k] for k in ("sha256", "received", "rejected")}
            for a in seats
        }
        for r, seats in redteam19y.SEATS.items()
    }


def build_report(rows, files, record):
    got = redteam19y.received(files)
    summary = redteam19y.summarise(rows, got)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "submissions": _submissions(got),
        "rows": rows,
        "summary": summary,
        "hypotheses": redteam19y.hypotheses(summary, rows, record),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def _outcome_ok(value):
    return (
        type(value) is dict
        and set(value) == set(redteam19y.OUTCOME_KEYS)
        and type(value["differs"]) is bool
        and type(value["kinds"]) is list
        and all(k in (*redteam19y.KEYS, "raised") for k in value["kinds"])
        and (value["raised"] is None or type(value["raised"]) is str)
        and (value["raised"] is not None) is (value["kinds"] == ["raised"])
        and value["differs"] is bool(value["kinds"])
        and type(value["verdicts"]) is dict
        and type(value["effects"]) is int
    )


def structure(saved, files, record):
    """Everything about a saved report that needs no gate."""
    got = redteam19y.received(files)
    rows = saved.get("rows")
    if type(rows) is not list:
        raise ValueError("report_rows")
    want = [
        (r, a, attempt)
        for r, seats in redteam19y.SEATS.items()
        for a in seats
        for attempt in got[r][a]["attempts"]
    ]
    if len(rows) != len(want):
        raise ValueError("report_rows")
    for row, (round_, attacker, attempt) in zip(rows, want):
        label = f"{round_}:{attacker}:{attempt['position']}"
        identity = {
            "round": round_,
            "attacker": attacker,
            "position": attempt["position"],
            "channel": attempt["channel"],
            "text_sha256": redteam19y.text_digest(attempt["text"]),
            "text_chars": len(attempt["text"]),
            "note": attempt["note"],
        }
        if (
            type(row) is not dict
            or set(row) != ROW_KEYS
            or any(row[k] != v for k, v in identity.items())
        ):
            raise ValueError("row_mismatch:" + label)
        if (
            not _outcome_ok(row["before"])
            or not _outcome_ok(row["repaired"])
            or type(row["mutants_changed"]) is not list
            or not all(type(m) is str for m in row["mutants_changed"])
            or row["potent"]
            is not (bool(row["mutants_changed"]) and not row["repaired"]["differs"])
        ):
            raise ValueError("row_outcome:" + label)
    if wire(saved.get("submissions")) != wire(_submissions(got)):
        raise ValueError("submission_binding")
    summary = redteam19y.summarise(rows, got)
    if wire(saved.get("summary")) != wire(summary):
        raise ValueError("summary_mismatch")
    if wire(saved.get("hypotheses")) != wire(
        redteam19y.hypotheses(summary, rows, record)
    ):
        raise ValueError("hypotheses_mismatch")


def receipt_for(report, manifest_root, replayed):
    rounds = report["summary"]["rounds"]
    keys = ("received", "rejected", "run", "before_differs", "repaired_differs")
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
        "submissions": {
            r: {a: v["sha256"] for a, v in seats.items()}
            for r, seats in report["submissions"].items()
        },
        "rounds": {
            r: {
                "attackers": {
                    a: {k: v[k] for k in (*keys, "potent")}
                    for a, v in rounds[r]["attackers"].items()
                },
                "totals": rounds[r]["totals"],
                "before_kinds": rounds[r]["before_kinds"],
                "repaired_kinds": rounds[r]["repaired_kinds"],
            }
            for r in rounds
        },
        "hypotheses": {k: v["holds"] for k, v in report["hypotheses"].items()},
        "model_inference": False,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None, replay=False, gate=None):
    files = read_pack(Path(pack), expected_root)
    names = {member(a) for a in redteam19y.ROUND_TWO}
    if set(files) != {"report.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    root, first, record = round_one()
    subs = {1: first, 2: {a: files[member(a)] for a in redteam19y.ROUND_TWO}}
    protocol_digest = check_protocol(protocol or PROTOCOL, subs, root)
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    structure(saved, subs, record)
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    report = loads(wire(saved))
    report.pop("protocol_sha256", None)
    if replay:
        if gate is None and not host_can_replay():
            raise ValueError("replay_requires_linux_x86_64")
        actual = build_report(_measure(subs, gate), subs, record)
        if wire(report) != wire(actual):
            raise ValueError("report_mismatch")
        report = actual
    # the receipt describes what THIS host checked or recomputed
    return receipt_for(report, expected_root, replay)


def _measure(subs, gate):
    if gate is not None:
        return redteam19y.measure(subs, gate)
    real = redteam19y.Gate()
    try:
        return redteam19y.measure(subs, real)
    finally:
        real.close()


def read_submissions(directory):
    return {
        a: (Path(directory) / (a + ".json")).read_bytes() for a in redteam19y.ROUND_TWO
    }


def run(out, *, submissions=None, protocol=None, gate=None):
    if gate is None and not host_can_replay():
        raise ValueError("replay_requires_linux_x86_64")
    root, first, record = round_one()
    subs = {1: first, 2: read_submissions(submissions or SUBMISSIONS)}
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol(subs, root)))
    protocol_digest = check_protocol(proto_path, subs, root)
    report = build_report(_measure(subs, gate), subs, record)
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for a in redteam19y.ROUND_TWO:
        files[member(a)] = subs[2][a]
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
