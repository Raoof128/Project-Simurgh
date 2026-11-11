"""Phase 19l evidence: source-bound pack for the frozen-gate replay of the 19k proposals,
with verify.

On any host ``verify`` checks the pack against the committed 19k capture pack: every row's
proposal is re-read from the transcripts, every undispatched row is recomputed, and the summary
is recomputed from the rows. With ``--replay`` on Linux x86_64 in the hash-locked venv it also
dispatches every recorded call through the frozen Phase 17 pipeline again and compares the
whole report. No model runs here.
"""

import argparse
import json
from pathlib import Path

import evidence19d
import projection
import replay19
import replay19l
from projection import loads, read_pack, sha, wire, write_pack

ROOT = projection.ROOT
LANE_DIR = ROOT / "tools/assurance-provenance"
DOCS = ROOT / "docs/research/provenance-phase-19l"
PROTOCOL = DOCS / "protocol.json"
SCHEMA = "simurgh-phase19l-report-v1"
PROTOCOL_SCHEMA = "simurgh-phase19l-protocol-v1"
PHASE_19L_FILES = (
    "capture19.py",
    "capture19local.py",
    "inject19.py",
    "inject19k.py",
    "replay19.py",
    "replay19l.py",
    "evidence.py",
    "evidence19k.py",
    "evidence19l.py",
    "projection.py",
    "tests/test_replay19l.py",
    "tests/test_evidence19l.py",
)
NON_CLAIMS = (
    "the proposals are the ones recorded in 19k from small local models; no model ran here",
    "the pipeline is the frozen Phase 17 fixture rig under a fixed clock, not a deployed system",
    "a blocked send shows the composed controls refusing that action in that fixture state, nothing about an attacker who knows the gate",
    "the credential-only arm is the frozen gateway alone; it shows what would have landed without the composed controls",
    "the informed-attacker arm and the hosted capture under IOU-19-SPEND are not run and stay owed",
)
SIDECARS = {
    "summary.json": lambda r: r["summary"],
    "totals.json": lambda r: r["totals"],
}


def expected_sources():
    names = {str((LANE_DIR / n).relative_to(ROOT)) for n in PHASE_19L_FILES}
    names.update(replay19.FROZEN)
    names.add("docs/research/transfer-phase-17/tasks.json")
    return names


def build_protocol(sources):
    return {
        "schema": PROTOCOL_SCHEMA,
        "arm": "frozen_gate_replay",
        "controls": list(replay19.CONTROLS),
        "inputs": {"19k": sources["root"]},
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
        "sources": {
            n: sha((ROOT / n).read_bytes()) for n in sorted(expected_sources())
        },
    }


def check_protocol(path, sources):
    raw = Path(path).read_bytes()
    p = loads(raw)
    if (
        type(p) is not dict
        or p.get("schema") != PROTOCOL_SCHEMA
        or p.get("controls") != list(replay19.CONTROLS)
        or p.get("inputs") != {"19k": sources["root"]}
        or p.get("model_inference") is not False
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


def build_report(rows, sources):
    return {
        "schema": SCHEMA,
        "arm": "frozen_gate_replay",
        "inputs": {"19k": sources["root"]},
        "controls": list(replay19.CONTROLS),
        "rows": rows,
        "summary": replay19l.summarise(rows),
        "totals": replay19l.totals(rows),
        "model_inference": False,
        "non_claims": list(NON_CLAIMS),
    }


def structure(saved, sources):
    """Everything about a saved report that needs no gate: each row's proposal is re-read from
    the 19k transcripts, each undispatched row is recomputed, and the summary and totals are
    recomputed from the rows."""
    rows = saved.get("rows")
    if type(rows) is not list:
        raise ValueError("report_rows")
    position = 0
    for model_id, transcript in sources["transcripts"].items():
        for s, case, proposal in replay19l.generations(model_id, transcript):
            if position >= len(rows):
                raise ValueError("report_rows")
            row = rows[position]
            position += 1
            label = f"{model_id}:{s['index']}"
            want = {
                "model": model_id,
                "index": s["index"],
                "block": s["block"],
                "task_id": s["task_id"],
                "state": case["state"],
                "style": s["style"],
                "trial": s["trial"],
                "proposal": proposal["status"],
                "exact": proposal["status"] == "call"
                and proposal["arguments"] == case["expected"],
            }
            if type(row) is not dict or any(row.get(k) != v for k, v in want.items()):
                raise ValueError("row_mismatch:" + label)
            branches = row.get("branches")
            if type(branches) is not dict or set(branches) != set(replay19.CONTROLS):
                raise ValueError("row_branches")
            called = proposal["status"] == "call"
            for control in replay19.CONTROLS:
                b = branches[control]
                if (
                    type(b) is not dict
                    or b.get("dispatched") is not called
                    or type(b.get("new_effects")) is not int
                    or (
                        not called
                        and (b["status"], b["new_effects"]) != (proposal["status"], 0)
                    )
                    or b.get("split")
                    != projection.split_one(
                        case["state"],
                        proposal["status"],
                        b.get("status"),
                        b["new_effects"],
                    )
                ):
                    raise ValueError("branch_mismatch:" + label)
    if position != len(rows):
        raise ValueError("report_rows")
    if wire(saved.get("summary")) != wire(replay19l.summarise(rows)):
        raise ValueError("summary_mismatch")
    if wire(saved.get("totals")) != wire(replay19l.totals(rows)):
        raise ValueError("totals_mismatch")


def receipt_for(report, manifest_root, replayed):
    t = report["totals"]
    return {
        "verified": True,
        "arm": "frozen_gate_replay",
        "kind": "frozen_replay_recomputed" if replayed else "structure_checked",
        "replay": {"result": "verified"}
        if replayed
        else {
            "result": "not_run",
            "reason": "not_requested"
            if replay19.host_can_replay()
            else "host_not_linux_x86_64",
        },
        "inputs": report["inputs"],
        "generations": t["generations"],
        "restricted_sends_proposed": t["restricted_sends_proposed"],
        "active_exact_sends_proposed": t["active_exact_sends_proposed"],
        "composed": t["composed"],
        "credential_only": t["credential_only"],
        "model_inference": False,
        "manifest_sha256": manifest_root,
        "independent_custody": False,
        "tree_state": evidence19d.tree_state(),
    }


def verify(
    pack, expected_root, *, protocol=None, replay=False, sources=None, engine=None
):
    sources = replay19l.inputs() if sources is None else sources
    protocol_digest = check_protocol(protocol or PROTOCOL, sources)
    files = read_pack(Path(pack), expected_root)
    if set(files) != {"report.json", *SIDECARS}:
        raise ValueError("pack_inventory")
    saved = loads(files["report.json"])
    if type(saved) is not dict or saved.get("schema") != SCHEMA:
        raise ValueError("report_schema")
    if saved.get("protocol_sha256") != protocol_digest:
        raise ValueError("protocol_binding")
    if saved.get("inputs") != {"19k": sources["root"]}:
        raise ValueError("input_binding")
    structure(saved, sources)
    for name, project in SIDECARS.items():
        if wire(loads(files[name])) != wire(project(saved)):
            raise ValueError("sidecar_member_mismatch")
    report = loads(wire(saved))
    report.pop("protocol_sha256", None)
    if replay:
        if engine is None and not replay19.host_can_replay():
            raise ValueError("replay_requires_linux_x86_64")
        actual = build_report(replay19l.replay(sources, engine=engine), sources)
        if wire(report) != wire(actual):
            raise ValueError("report_mismatch")
        report = actual
    # the receipt describes what THIS host checked or recomputed
    return receipt_for(report, expected_root, replay)


def run(out, *, protocol=None, sources=None, engine=None, log=None):
    sources = replay19l.inputs() if sources is None else sources
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    proto_path = Path(protocol) if protocol else out / "protocol.json"
    if not proto_path.exists():
        proto_path.write_bytes(wire(build_protocol(sources)))
    protocol_digest = check_protocol(proto_path, sources)
    report = build_report(replay19l.replay(sources, engine=engine, log=log), sources)
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
        replay=True,
        sources=sources,
        engine=engine,
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
        receipt = run(args.out.resolve(), log=lambda m: print(m, flush=True))
    else:
        receipt = verify(
            args.pack, args.expected_root, protocol=args.protocol, replay=args.replay
        )
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
