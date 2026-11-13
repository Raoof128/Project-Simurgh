"""Phase 19t evidence: source-bound pack for the informed red team (P19-REDTEAM01), with verify.

The pack holds both submissions as received and one row per attempt that was run. On any host
``verify`` reads each submission again, checks every row's identity against it (attacker,
position, channel, digest and length of the text, note), and recomputes the summary and the
hypotheses from the rows. With ``--replay`` on Linux x86_64 in the hash-locked environment it
also runs every attempt against the gate and the reader mutants again and compares the whole
report. No model runs here.
"""

import argparse
import json
from pathlib import Path

import evidence
import evidence19d
import projection
import redteam19t
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19t"
PROTOCOL = DOCS / "protocol.json"
SUBMISSIONS = DOCS / "submissions"
BRIEF = "docs/research/provenance-phase-19t/BRIEF.md"
SCHEMA = "simurgh-phase19t-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19t-protocol-v1"
ARM = "informed_red_team"
PHASE_19T_FILES = (
    "redteam19t.py",
    "evidence19t.py",
    "projection.py",
    "lane.py",
    "rig.py",
    "gate19.py",
    "mutants.py",
    "provenance.py",
    "payloads.py",
    "awm.py",
    "tests/test_redteam19t.py",
    "tests/test_evidence19t.py",
)
NON_CLAIMS = (
    "two attacking agents, one sitting each, through one interface; nothing here is evidence about attackers in general",
    "the gate decides from host state and reads no channel as authority, so no difference is the expected result; the mutants show what the same texts do to a gate that reads text",
    "the attacker controls a channel's text and nothing else: not the host's state, the clock, the operator's key, the receiver or the code",
    "what an attacker tried offline is not recorded; the rows are what it chose to submit",
    "the rig is 19b's fixture under a fixed clock, not a deployed system",
    "no model is a target and no model's behaviour is measured; the attackers are tools the author ran",
)
SIDECARS = {
    "summary.json": lambda r: r["summary"],
    "hypotheses.json": lambda r: r["hypotheses"],
}
ROW_KEYS = {
    "attacker",
    "position",
    "channel",
    "text_sha256",
    "text_chars",
    "note",
    "clean",
    "mutants_changed",
    "potent",
}
CLEAN_KEYS = {"differs", "kinds", "verdicts", "effects"}


def host_can_replay():
    return evidence.host_can_replay()


def member(attacker):
    return "submission-" + attacker + ".json"


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19T_FILES}
    names.add(BRIEF)
    return names


def _declared(files):
    return {
        "arm": ARM,
        "attackers": list(redteam19t.ATTACKERS),
        "channels": list(redteam19t.CHANNELS),
        "limits": {
            "attempts": redteam19t.MAX_ATTEMPTS,
            "text": redteam19t.MAX_TEXT,
            "note": redteam19t.MAX_NOTE,
        },
        "mutants": redteam19t.MUTANTS,
        "submissions": {a: sha(files[a]) for a in redteam19t.ATTACKERS},
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


def received(files):
    return {a: redteam19t.read_submission(a, files[a]) for a in redteam19t.ATTACKERS}


def build_report(rows, files):
    got = received(files)
    summary = redteam19t.summarise(rows, got)
    return {
        "schema": SCHEMA,
        "arm": ARM,
        "submissions": {
            a: {k: got[a][k] for k in ("sha256", "received", "rejected")}
            for a in redteam19t.ATTACKERS
        },
        "rows": rows,
        "summary": summary,
        "hypotheses": redteam19t.hypotheses(summary),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def structure(saved, files):
    """Everything about a saved report that needs no gate."""
    got = received(files)
    rows = saved.get("rows")
    if type(rows) is not list:
        raise ValueError("report_rows")
    want = [
        (a, attempt) for a in redteam19t.ATTACKERS for attempt in got[a]["attempts"]
    ]
    if len(rows) != len(want):
        raise ValueError("report_rows")
    for row, (attacker, attempt) in zip(rows, want):
        label = f"{attacker}:{attempt['position']}"
        identity = {
            "attacker": attacker,
            "position": attempt["position"],
            "channel": attempt["channel"],
            "text_sha256": sha(attempt["text"].encode()),
            "text_chars": len(attempt["text"]),
            "note": attempt["note"],
        }
        if (
            type(row) is not dict
            or set(row) != ROW_KEYS
            or any(row[k] != v for k, v in identity.items())
        ):
            raise ValueError("row_mismatch:" + label)
        clean = row["clean"]
        if (
            type(clean) is not dict
            or set(clean) != CLEAN_KEYS
            or type(clean["differs"]) is not bool
            or type(clean["kinds"]) is not list
            or any(k not in redteam19t.KEYS for k in clean["kinds"])
            or clean["differs"] is not bool(clean["kinds"])
            or type(clean["verdicts"]) is not dict
            or type(clean["effects"]) is not int
            or type(row["mutants_changed"]) is not list
            or not all(type(m) is str for m in row["mutants_changed"])
            or row["potent"] is not bool(row["mutants_changed"])
        ):
            raise ValueError("row_outcome:" + label)
    submissions = {
        a: {k: got[a][k] for k in ("sha256", "received", "rejected")}
        for a in redteam19t.ATTACKERS
    }
    if wire(saved.get("submissions")) != wire(submissions):
        raise ValueError("submission_binding")
    summary = redteam19t.summarise(rows, got)
    if wire(saved.get("summary")) != wire(summary):
        raise ValueError("summary_mismatch")
    if wire(saved.get("hypotheses")) != wire(redteam19t.hypotheses(summary)):
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
        "submissions": {a: v["sha256"] for a, v in report["submissions"].items()},
        "attackers": {
            a: {
                k: v[k]
                for k in ("received", "rejected", "run", "clean_differs", "potent")
            }
            for a, v in s["attackers"].items()
        },
        "totals": s["totals"],
        "clean_kinds": s["clean_kinds"],
        "hypotheses": {k: v["holds"] for k, v in report["hypotheses"].items()},
        "model_inference": False,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(pack, expected_root, *, protocol=None, replay=False, gate=None):
    files = read_pack(Path(pack), expected_root)
    names = {member(a) for a in redteam19t.ATTACKERS}
    if set(files) != {"report.json", *SIDECARS, *names}:
        raise ValueError("pack_inventory")
    subs = {a: files[member(a)] for a in redteam19t.ATTACKERS}
    protocol_digest = check_protocol(protocol or PROTOCOL, subs)
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    structure(saved, subs)
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    report = loads(wire(saved))
    report.pop("protocol_sha256", None)
    if replay:
        if gate is None and not host_can_replay():
            raise ValueError("replay_requires_linux_x86_64")
        actual = build_report(_measure(subs, gate), subs)
        if wire(report) != wire(actual):
            raise ValueError("report_mismatch")
        report = actual
    # the receipt describes what THIS host checked or recomputed
    return receipt_for(report, expected_root, replay)


def _measure(subs, gate):
    if gate is not None:
        return redteam19t.measure(subs, gate)
    real = redteam19t.Gate()
    try:
        return redteam19t.measure(subs, real)
    finally:
        real.close()


def read_submissions(directory):
    return {
        a: (Path(directory) / (a + ".json")).read_bytes() for a in redteam19t.ATTACKERS
    }


def run(out, *, submissions=None, protocol=None, gate=None):
    if gate is None and not host_can_replay():
        raise ValueError("replay_requires_linux_x86_64")
    subs = read_submissions(submissions or SUBMISSIONS)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol(subs)))
    protocol_digest = check_protocol(proto_path, subs)
    report = build_report(_measure(subs, gate), subs)
    report.update(protocol_sha256=protocol_digest)
    files = {"report.json": wire(report)}
    for a in redteam19t.ATTACKERS:
        files[member(a)] = subs[a]
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
